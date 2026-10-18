import re
with open('src-tauri/tauri.conf.json', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"width": 1920,\n        "height": 1080,', '"width": 160,\n        "height": 160,')
content = content.replace('"fullscreen": true,', '')

with open('src-tauri/tauri.conf.json', 'w', encoding='utf-8') as f:
    f.write(content)
