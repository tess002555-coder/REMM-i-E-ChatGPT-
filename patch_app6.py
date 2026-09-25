import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the syntax error around line 195
content = re.sub(r'  // Calculate position for Task Panel based on Mascot position & docked edge\s*\} else if \(edge === \'right\'\) \{.*?\};\n\s*\}\n', '', content, flags=re.DOTALL)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
