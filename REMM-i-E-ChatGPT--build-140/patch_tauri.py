import re
with open('src-tauri/tauri.conf.json', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'"width": 160,\s*"height": 160,', '"width": 1920,\n        "height": 1080,', content)
with open('src-tauri/tauri.conf.json', 'w', encoding='utf-8') as f:
    f.write(content)
