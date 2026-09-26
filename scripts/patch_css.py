import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure the specific rules are there exactly as requested
rules = """
.widget-wrapper { pointer-events: none !important; }
.widget-wrapper img, .widget-wrapper button, .widget-wrapper a, .clickable { pointer-events: auto !important; }
"""
if ".widget-wrapper {" not in content:
    content += "\n" + rules

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
