import re
with open('src-tauri/tauri.conf.json', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('"maximized": false,', '"maximized": false,\n        "fullscreen": true,')
with open('src-tauri/tauri.conf.json', 'w', encoding='utf-8') as f:
    f.write(content)
