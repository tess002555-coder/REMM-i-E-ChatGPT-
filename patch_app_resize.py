import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the resize effect
content = re.sub(r'  // Resize Tauri window dynamically based on panel and modal state.*?\}, \[windowState\.isPanelOpen, activeModal\]\);\n', '', content, flags=re.DOTALL)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
