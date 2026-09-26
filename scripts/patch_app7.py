import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the trailing }; };
content = re.sub(r'  \};\n\n    \};\n', '', content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
