#!/usr/bin/env python3
"""
CYBERDUDEBIVASH Footer Integration Script
Updates all HTML pages with the new enhanced footer
"""

import os
import re
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
FOOTER_FILE = BASE_DIR / 'layout' / 'footer-enhanced.html'
CSS_FILE = 'assets/css/footer-enhanced.css'

# Read the new footer HTML
with open(FOOTER_FILE, 'r', encoding='utf-8') as f:
    new_footer_html = f.read()

# List of HTML files to update (excluding header.html and components)
html_files = [
    'index.html',
    'about.html',
    'services.html',
    'apps.html',
    'platforms.html',
    'research.html',
    'pricing.html',
    'contact.html',
    'bug-bounty.html',
    'soc-services.html',
    '',
    ''
]

def update_html_file(filepath):
    """Update a single HTML file with the new footer"""
    print(f"Processing: {filepath.name}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if footer CSS is already included
    if 'footer-enhanced.css' not in content:
        # Add footer CSS before </head>
        css_link = f'    <link rel="stylesheet" href="./{CSS_FILE}">\n'
        content = content.replace('</head>', f'{css_link}</head>')
        print(f"  ✓ Added footer CSS link")
    
    # Find and replace the footer section
    # Pattern 1: Look for <footer class="footer"> or similar
    footer_pattern1 = r'<footer[^>]*>.*?</footer>'
    
    # Pattern 2: Look for footer section by class
    footer_pattern2 = r'<div class="footer[^"]*">.*?</div>\s*</div>\s*</div>'
    
    original_content = content
    
    # Try pattern 1 first
    if re.search(footer_pattern1, content, re.DOTALL):
        content = re.sub(footer_pattern1, new_footer_html, content, flags=re.DOTALL, count=1)
        print(f"  ✓ Replaced footer (pattern 1)")
    # Try pattern 2
    elif re.search(footer_pattern2, content, re.DOTALL):
        content = re.sub(footer_pattern2, new_footer_html, content, flags=re.DOTALL, count=1)
        print(f"  ✓ Replaced footer (pattern 2)")
    # If no footer found, add before closing body tag
    elif '</body>' in content:
        content = content.replace('</body>', f'\n{new_footer_html}\n</body>')
        print(f"  ✓ Added new footer before </body>")
    else:
        print(f"  ⚠ Warning: Could not find footer or </body> tag")
        return False
    
    # Only write if content changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    print("=" * 60)
    print("CYBERDUDEBIVASH Footer Integration")
    print("=" * 60)
    print()
    
    updated_count = 0
    failed_count = 0
    
    for html_file in html_files:
        filepath = BASE_DIR / html_file
        if filepath.exists():
            try:
                if update_html_file(filepath):
                    updated_count += 1
                    print()
            except Exception as e:
                print(f"  ✗ Error: {e}")
                failed_count += 1
                print()
        else:
            print(f"Warning: {html_file} not found")
            print()
    
    print("=" * 60)
    print(f"Summary:")
    print(f"  ✓ Updated: {updated_count} files")
    if failed_count > 0:
        print(f"  ✗ Failed: {failed_count} files")
    print("=" * 60)
    print()
    print("Integration complete!")
    print("Next steps:")
    print("  1. Review the changes in each file")
    print("  2. Test in a browser")
    print("  3. Adjust any page-specific footer content if needed")

if __name__ == '__main__':
    main()
