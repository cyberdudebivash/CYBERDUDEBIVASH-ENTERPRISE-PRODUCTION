import os
import json
import urllib.request
import urllib.parse
import sys

CREDENTIALS_FILE = "credentials.json"

HELP_INSTRUCTIONS = """
[!] Google Blogger API Credentials Missing!
To automate posting, you need to set up Google OAuth 2.0 credentials:

1. Go to Google Cloud Console (https://console.cloud.google.com/).
2. Create a new project and search for "Blogger API v3", then click Enable.
3. Go to "Credentials" > "Create Credentials" > "OAuth client ID".
   - Select application type: "Desktop app" or "Web application".
   - Set Authorized Redirect URIs to: https://developers.google.com/oauthplayground
4. Go to Google OAuth 2.0 Playground (https://developers.google.com/oauthplayground):
   - Click OAuth 2.0 Configuration (gear icon) on the right.
   - Check "Use your own OAuth credentials" and enter Client ID & Client Secret.
   - Under Step 1 on the left, search and select:
     https://www.googleapis.com/auth/blogger
   - Click "Authorize APIs" and consent with your Google account.
5. In Step 2, click "Exchange authorization code for tokens".
6. Copy the "Refresh Token" displayed on the left.
7. Save these details into a local 'credentials.json' file using this format:

{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "blog_id": "YOUR_BLOGGER_BLOG_ID"
}
"""

def generate_template_json():
    if not os.path.exists(CREDENTIALS_FILE):
        template = {
            "client_id": "paste_client_id_here",
            "client_secret": "paste_client_secret_here",
            "refresh_token": "paste_refresh_token_here",
            "blog_id": "paste_blogger_blog_id_here"
        }
        with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
            json.dump(template, f, indent=2)
        print(f"[+] Generated template config file at: {CREDENTIALS_FILE}")

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

def publish_to_blogger(title, html_content, labels, search_desc):
    if not os.path.exists(CREDENTIALS_FILE):
        print(HELP_INSTRUCTIONS)
        generate_template_json()
        return False
        
    with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    refresh_token = config.get("refresh_token")
    blog_id = config.get("blog_id")
    
    if "paste_" in f"{client_id}{client_secret}{refresh_token}{blog_id}":
        print("[-] Please edit credentials.json and insert your actual Google API OAuth secrets!")
        return False
        
    print("[+] Fetching active OAuth access token from Google API Gateway...")
    access_token = get_access_token(client_id, client_secret, refresh_token)
    if not access_token:
        return False
        
    print("[+] Constructing post payload...")
    url = f"https://www.googleapis.com/blogger/v3/blogs/{blog_id}/posts/"
    
    # Body Payload mapping Blogger REST v3 Schema
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
        print("[+] Requesting article publishing...")
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print(f"[+] SUCCESS! Article published successfully.")
            print(f"[+] Post Title: {res_data.get('title')}")
            print(f"[+] Post URL: {res_data.get('url')}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[-] HTTP Error publishing article: {e.code} - {e.reason}")
        print(f"[-] API Error details: {error_body}")
        return False
    except Exception as e:
        print(f"[-] Failed to publish article: {e}")
        return False

if __name__ == "__main__":
    # Example trigger parameters
    sample_title = "Programmatic NIS2 Compliance via Autonomous AI SOC Architecture"
    sample_html = """
    <p>The <strong>NIS2 Directive</strong> forces critical infrastructure operators to establish robust cyber risk management frameworks. Compliance requires strict adherence to tight incident reporting timelines. Organizations must submit a <strong>24-hour early warning</strong> and a <strong>72-hour notification</strong> during active breaches.</p>
    <h3>Architectural Pillars of AI Compliance</h3>
    <ul>
        <li><strong>Real-Time Alert Triage</strong>: Model pipelines ingest raw telemetry logs.</li>
        <li><strong>Proactive AI Threat Hunting</strong>: Continuous incident sweeps across endpoints.</li>
        <li><strong>Automated Incident Response</strong>: Triggering Sigma/YARA mitigation rules instantly.</li>
    </ul>
    """
    sample_labels = ["AI Security", "DevSecOps", "NIS2 Compliance", "SOC Automation"]
    sample_desc = "Secure NIS2 Compliance with an Autonomous AI SOC. Automate reporting, ingest CTI feeds, and deploy next-gen incident response playbooks."
    
    publish_to_blogger(sample_title, sample_html, sample_labels, sample_desc)
