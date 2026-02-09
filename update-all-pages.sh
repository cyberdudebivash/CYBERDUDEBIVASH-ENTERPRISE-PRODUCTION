#!/bin/bash

# Add floating contact buttons and top contact bar to all HTML pages

for file in *.html; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # Add top contact bar before navbar (if not already present)
        if ! grep -q "top-contact-bar" "$file"; then
            sed -i '/<nav class="navbar">/i\    <!-- Top Contact Bar -->\n    <div class="top-contact-bar">\n        📧 <a href="mailto:bivash@cyberdudebivash.com">bivash@cyberdudebivash.com</a> |\n        📞 <a href="tel:+918179881447">+91 81798 81447</a>\n    </div>\n' "$file"
        fi
        
        # Add floating contact buttons before footer (if not already present)
        if ! grep -q "floating-contact" "$file"; then
            sed -i '/<footer class="footer">/i\    <!-- Floating Contact Buttons -->\n    <div class="floating-contact">\n        <a href="contact.html" class="float-btn">\n            <span class="float-icon">📧</span>\n            <span class="float-text">Contact Us</span>\n        </a>\n        <a href="tel:+918179881447" class="float-btn float-phone">\n            <span class="float-icon">📞</span>\n            <span class="float-text">+91 81798 81447</span>\n        </a>\n    </div>\n\n' "$file"
        fi
        
        # Update navigation to include Apps link (if not already present)
        if ! grep -q 'href="apps.html"' "$file"; then
            sed -i 's|<li><a href="platforms.html"|<li><a href="apps.html" class="nav-link">Apps</a></li>\n                <li><a href="platforms.html"|g' "$file"
        fi
        
        # Fix navigation brand to be clickable
        sed -i 's|<div class="nav-brand">|<div class="nav-brand"><a href="index.html" style="display: flex; align-items: center; gap: 1rem; text-decoration: none;">|g' "$file"
        sed -i 's|<span class="brand-text">CYBERDUDEBIVASH|<span class="brand-text">CYBERDUDEBIVASH|g' "$file"
        sed -i 's|</div><!-- nav-brand ends -->|</a></div>|g' "$file"
    fi
done

echo "All pages updated!"
