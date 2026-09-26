import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('for Panel based on snappedEdge', '// Dynamic Positioning for Panel based on snappedEdge')
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
