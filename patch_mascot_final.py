import re

with open('src/components/MascotWidget.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fixed positioning in Sidebar Mode
content = content.replace('className="fixed z-50 select-none cursor-grab active:cursor-grabbing group"', 'className="relative select-none cursor-grab active:cursor-grabbing group" data-tauri-drag-region')

# Sidebar animate positioning (it was using left: barX, top: position.y)
# Since the parent handles left and top, we just animate x and y to 0
content = re.sub(r'animate=\{\{\s*left: barX,\s*top: position\.y,\s*x: 0,\s*y: 0,', 'animate={{\n          x: 0,\n          y: 0,', content)

# Replace fixed positioning in Mascot Mode
# We already did some of this earlier, but let's be sure.
# Wait, the earlier patch might have failed. Let's find exactly the Mascot mode return
content = re.sub(r'animate=\{\{\s*left: position\.x,\s*top: position\.y,\s*x: peekOffset\.x,\s*y: peekOffset\.y,', 'animate={{\n        x: peekOffset.x,\n        y: peekOffset.y,', content)

# Remove the framer motion drag logic entirely from MascotWidget if it's there
# Because if Tauri handles window dragging via `data-tauri-drag-region`, we don't want framer-motion dragging the element away from the window's 0,0.
content = re.sub(r'\s*drag\n\s*dragConstraints={{[^}]*}}\n\s*dragElastic={[^}]*}\n\s*dragMomentum={[^}]*}\n\s*onDragEnd={\(_, info\) => {[^}]*}}\n', '\n', content, flags=re.MULTILINE)
# Sometimes it's drag="y"
content = re.sub(r'\s*drag="y"\n\s*dragConstraints={{[^}]*}}\n\s*dragElastic={[^}]*}\n\s*dragMomentum={[^}]*}\n\s*onDragEnd={\(_, info\) => {[^}]*}}\n', '\n', content, flags=re.MULTILINE)

with open('src/components/MascotWidget.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
