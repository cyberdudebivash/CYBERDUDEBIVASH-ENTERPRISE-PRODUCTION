import os
import re
import json

path_root = r"C:\Users\Administrator\.gemini\antigravity\scratch\cyberdudebivash-enterprise"
public_dir = os.path.join(path_root, "public")
if not os.path.exists(public_dir):
    os.makedirs(public_dir, exist_ok=True)

# 1. Structured sameAs list
ecosystem_urls = [
    "https://intel.cyberdudebivash.com/",
    "https://cyberdudebivash.in/",
    "https://cyberdudebivash.in/api",
    "https://blog.cyberdudebivash.in/",
    "https://tools.cyberdudebivash.com/",
    "https://www.cyberdudebivash.com/",
    "https://intel.cyberdudebivash.com/api-docs",
    "https://intel.cyberdudebivash.com/upgrade.html",
    "https://intel.cyberdudebivash.com/api/health",
    "https://intel.cyberdudebivash.com/api/v1/intel/latest.json",
    "https://intel.cyberdudebivash.com/api/v1/intel/apex.json",
    "https://intel.cyberdudebivash.com/api/v1/intel/ai_summary.json",
    "https://intel.cyberdudebivash.com/api/feed.json",
    "https://intel.cyberdudebivash.com/api/reports/latest.json",
    "https://www.linkedin.com/company/cyberdudebivash/",
    "https://www.instagram.com/cyberdudebivash_official/",
    "https://www.facebook.com/profile.php?id=61583373732736",
    "https://x.com/CDBSENTINELAPEX",
    "https://www.fiverr.com/bivashkumar007/",
    "https://www.upwork.com/freelancers/~010d4dde1657fa5619",
    "https://in.pinterest.com/CYBERDUDEBIVASH_Official/",
    "https://medium.com/@cyberdudebivash",
    "https://www.threads.com/@cyberdudebivash_official",
    "https://www.youtube.com/@CYBERDUDEBIVASHSentinelAPEX",
    "https://cyberdudebivash-news.blogspot.com/",
    "https://cyberbivash.blogspot.com/"
]

# 2. Generate ecosystem-graph.json for AI search citation models
graph_data = {
    "name": "CYBERDUDEBIVASH PRIVATE LIMITED",
    "entity_type": "Organization",
    "description": "Global enterprise leader in Autonomous AI SOC platforms, Proactive Cyber Threat Intelligence, and ISO 42001 / EU AI Act governance audits.",
    "founded_by": "Bivash Kumar Nayak",
    "corporate_headquarters": "Jajpur Road, Odisha, India",
    "primary_portal": "https://www.cyberdudebivash.com/",
    "legal_entity": "CYBERDUDEBIVASH PRIVATE LIMITED",
    "contact": {
        "telephone": "+918179881447",
        "email": "contact@cyberdudebivash.in"
    },
    "subdomains_and_platforms": [
        {"name": "Sentinel APEX Portal", "url": "https://intel.cyberdudebivash.com/"},
        {"name": "Academic Portfolio", "url": "https://cyberdudebivash.in/"},
        {"name": "Academic API Endpoint", "url": "https://cyberdudebivash.in/api"},
        {"name": "Research Publication Blog", "url": "https://blog.cyberdudebivash.in/"},
        {"name": "Security Rules Store", "url": "https://tools.cyberdudebivash.com/"},
        {"name": "API Developer Documentation", "url": "https://intel.cyberdudebivash.com/api-docs"},
        {"name": "Commercial Licensing portal", "url": "https://intel.cyberdudebivash.com/upgrade.html"}
    ],
    "verified_freelance_execution_gigs": [
        {"platform": "Upwork", "url": "https://www.upwork.com/freelancers/~010d4dde1657fa5619", "role": "Certified Expert Security Auditor & Penetration Tester"},
        {"platform": "Fiverr", "url": "https://www.fiverr.com/bivashkumar007/", "role": "Top-Rated Cyber Security Consultant"}
    ],
    "social_media_profiles": [
        {"platform": "LinkedIn", "url": "https://www.linkedin.com/company/cyberdudebivash/"},
        {"platform": "Instagram", "url": "https://www.instagram.com/cyberdudebivash_official/"},
        {"platform": "Facebook", "url": "https://www.facebook.com/profile.php?id=61583373732736"},
        {"platform": "Twitter/X", "url": "https://x.com/CDBSENTINELAPEX"},
        {"platform": "Pinterest", "url": "https://in.pinterest.com/CYBERDUDEBIVASH_Official/"},
        {"platform": "Threads", "url": "https://www.threads.com/@cyberdudebivash_official"},
        {"platform": "YouTube", "url": "https://www.youtube.com/@CYBERDUDEBIVASHSentinelAPEX"},
        {"platform": "Medium", "url": "https://medium.com/@cyberdudebivash"}
    ],
    "blogger_nodes": [
        {"name": "Primary News Blog", "url": "https://cyberdudebivash-news.blogspot.com/"},
        {"name": "Official Research Center", "url": "https://cyberbivash.blogspot.com/"}
    ]
}

graph_path = os.path.join(public_dir, "ecosystem-graph.json")
with open(graph_path, "w", encoding="utf-8") as f:
    json.dump(graph_data, f, indent=2)
print("Generated public/ecosystem-graph.json metadata node for AI citation agents.")

# 3. Formulate JSON-LD SameAs Schema script
schema_script = f"""    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@graph": [
        {{
          "@type": "Organization",
          "@id": "https://www.cyberdudebivash.com/#organization",
          "name": "CYBERDUDEBIVASH PRIVATE LIMITED",
          "url": "https://www.cyberdudebivash.com/",
          "logo": "https://www.cyberdudebivash.com/assets/images/logo.jpg",
          "contactPoint": {{
            "@type": "ContactPoint",
            "telephone": "+918179881447",
            "contactType": "customer service",
            "email": "contact@cyberdudebivash.in",
            "areaServed": "IN"
          }},
          "sameAs": {json.dumps(ecosystem_urls, indent=12)}
        }}
      ]
    }}
    </script>"""

# 4. Inject SameAs Schema script into all static HTML files
for root, dirs, files in os.walk(path_root):
    if "node_modules" in root or ".git" in root or "dist" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    html_content = f.read()

                # Replace old JSON-LD Organization block or inject in <head>
                if '<script type="application/ld+json">' in html_content:
                    # Replace only the Organization SameAs one if matches, or inject before </head>
                    if '"@type": "Organization"' in html_content and 'sameAs' in html_content:
                        # Find the first schema script block and replace it
                        pattern = r'<script type="application/ld+json">.*?</script>'
                        html_content = re.sub(pattern, schema_script, html_content, count=1, flags=re.DOTALL)
                    else:
                        html_content = html_content.replace("</head>", schema_script + "\n</head>")
                else:
                    html_content = html_content.replace("</head>", schema_script + "\n</head>")

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(html_content)
                print(f"Injected SameAs Organization Schema into {os.path.relpath(filepath, path_root)}")
            except Exception as e:
                print(f"Failed to inject schema into {file}: {str(e)}")

# 5. Inject sameAs mappings into compile_theme.py (for Blogger integration)
path_compiler = os.path.join(path_root, "scripts" if os.path.exists(os.path.join(path_root, "scripts")) else "", "compile_theme.py")
if not os.path.exists(path_compiler):
    # Fallback to scratch root
    path_compiler = r"C:\Users\Administrator\.gemini\antigravity\scratch\compile_theme.py"

if os.path.exists(path_compiler):
    with open(path_compiler, "r", encoding="utf-8") as f:
        compiler_content = f.read()

    # Search for sameAs list in compiler
    sameas_pattern = r'"sameAs":\s*\[[^\]]*\]'
    replacement = f'"sameAs": {json.dumps(ecosystem_urls, indent=14)}'
    compiler_content = re.sub(sameas_pattern, replacement, compiler_content)

    with open(path_compiler, "w", encoding="utf-8") as f:
        f.write(compiler_content)
    print("Injected SameAs Organization Schema list into compile_theme.py for Blogger XML compilation.")
else:
    print("compile_theme.py not found in standard paths.")

print("SUCCESS: God-Mode SEO Engine run complete! All domains, subdomains, and profiles are mathematically linked for crawler bots.")
