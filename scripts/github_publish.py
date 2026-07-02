import os
import re
import json
import urllib.request
import urllib.parse

POSTS_DIR = "_posts"

def markdown_to_html(md_text):
    html = []
    lines = md_text.split('\n')
    in_list = False
    
    for line in lines:
        stripped = line.strip()
        
        # Headers
        if stripped.startswith('### '):
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<h3>{stripped[4:]}</h3>')
        elif stripped.startswith('## '):
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<h2>{stripped[3:]}</h2>')
        elif stripped.startswith('# '):
            if in_list:
                html.append('</ul>')
                in_list = False
            html.append(f'<h1>{stripped[2:]}</h1>')
        # Bullet list items
        elif stripped.startswith('* ') or stripped.startswith('- '):
            if not in_list:
                html.append('<ul>')
                in_list = True
            item_content = stripped[2:]
            # Process inline formatting for lists
            item_content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', item_content)
            item_content = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', item_content)
            html.append(f'<li>{item_content}</li>')
        # Empty lines
        elif not stripped:
            if in_list:
                html.append('</ul>')
                in_list = False
        # Paragraphs
        else:
            if in_list:
                html.append('</ul>')
                in_list = False
            content = stripped
            # Bold **text**
            content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
            # Links [text](url)
            content = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', content)
            html.append(f'<p>{content}</p>')
            
    if in_list:
        html.append('</ul>')
        
    return '\n'.join(html)

def parse_frontmatter(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    parts = content.split("---", 2)
    if len(parts) < 3:
        return None, content
        
    yaml_text = parts[1]
    body_text = parts[2].strip()
    
    metadata = {}
    for line in yaml_text.split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            metadata[k.strip().lower()] = v.strip()
            
    return metadata, body_text

def update_frontmatter_published(file_path, post_id, post_url):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    parts = content.split("---", 2)
    if len(parts) < 3:
        return
        
    yaml_lines = parts[1].strip().split("\n")
    new_yaml = []
    
    has_published = False
    for line in yaml_lines:
        if line.startswith("published:"):
            new_yaml.append("published: true")
            has_published = True
        elif line.startswith("post_id:") or line.startswith("post_url:"):
            continue
        else:
            new_yaml.append(line)
            
    if not has_published:
        new_yaml.append("published: true")
    new_yaml.append(f"post_id: {post_id}")
    new_yaml.append(f"post_url: {post_url}")
    
    updated_content = f"---\n" + "\n".join(new_yaml) + f"\n---\n" + parts[2]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

def get_access_token(client_id, client_secret, refresh_token):
    url = "https://oauth2.googleapis.com/token"
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            return res_data["access_token"]
    except Exception as e:
        print(f"[-] Failed to refresh OAuth token: {e}")
        return None

def main():
    client_id = os.environ.get("BLOGGER_CLIENT_ID")
    client_secret = os.environ.get("BLOGGER_CLIENT_SECRET")
    refresh_token = os.environ.get("BLOGGER_REFRESH_TOKEN")
    blog_id = os.environ.get("BLOGGER_BLOG_ID")
    
    if not all([client_id, client_secret, refresh_token, blog_id]):
        print("[-] Missing required Blogger API environment variables!")
        return
        
    if not os.path.exists(POSTS_DIR):
        print(f"[+] Creating posts directory: {POSTS_DIR}")
        os.makedirs(POSTS_DIR)
        return
        
    access_token = None
    
    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith(".md"):
            continue
            
        file_path = os.path.join(POSTS_DIR, filename)
        metadata, body = parse_frontmatter(file_path)
        
        if not metadata:
            continue
            
        published_status = metadata.get("published", "false").lower() == "true"
        if published_status:
            print(f"[~] Skipping {filename} (already published).")
            continue
            
        print(f"[+] Found unpublished post: {filename}. Preparing for export...")
        
        # Get token on-demand
        if not access_token:
            print("[+] Fetching Blogger API Access Token...")
            access_token = get_access_token(client_id, client_secret, refresh_token)
            if not access_token:
                print("[-] Could not retrieve OAuth Access Token. Exiting.")
                return
                
        title = metadata.get("title", filename.replace(".md", ""))
        labels_str = metadata.get("labels", "")
        labels = [l.strip() for l in labels_str.split(",")] if labels_str else []
        search_desc = metadata.get("description", "")
        
        html_content = markdown_to_html(body)
        
        # Post to Blogger v3 API
        url = f"https://www.googleapis.com/blogger/v3/blogs/{blog_id}/posts/"
        payload = {
            "kind": "blogger#post",
            "blog": {"id": blog_id},
            "title": title,
            "content": html_content,
            "labels": labels,
            "customMetaData": search_desc
        }
        
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        })
        
        try:
            print(f"[+] Publishing article to Blogger: '{title}'...")
            with urllib.request.urlopen(req) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                post_id = res_data.get("id")
                post_url = res_data.get("url")
                
                # Mark as published locally
                update_frontmatter_published(file_path, post_id, post_url)
                print(f"[+] SUCCESS! Published '{title}' to Blogger.")
                print(f"[+] Post URL: {post_url}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"[-] HTTP Error publishing article: {e.code} - {e.reason}")
            print(f"[-] API Error details: {error_body}")
        except Exception as e:
            print(f"[-] Failed to publish article: {e}")

if __name__ == "__main__":
    main()
