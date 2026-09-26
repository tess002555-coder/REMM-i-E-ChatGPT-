import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add back the Tauri resize logic
resize_logic = """
  // Resize Tauri window dynamically based on panel and modal state
  useEffect(() => {
    if ('__TAURI_INTERNALS__' in window) {
      try {
        import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
            const appWindow = getCurrentWindow();
            if (activeModal !== null) {
              appWindow.setSize(new LogicalSize(900, 800));
            } else if (windowState.isPanelOpen) {
              appWindow.setSize(new LogicalSize(550, 800));
            } else {
              appWindow.setSize(new LogicalSize(180, 180));
            }
        });
      } catch (e) {
        console.error("Failed to resize Tauri window:", e);
      }
    }
  }, [windowState.isPanelOpen, activeModal]);

  // Dynamic Positioning
"""
if "Resize Tauri window dynamically" not in content:
    content = content.replace("  // Dynamic Positioning", resize_logic)

# 2. Fix the layout to not use absolute positioning based on windowState.x and windowState.y
# Since the OS handles the window position via data-tauri-drag-region, the Mascot should just sit at the top-left of the webview.
replacement = """      {/* Mascot and Panel Group */}
      <div className="flex pointer-events-auto items-start p-2">
        <div className="relative flex">
          <MascotWidget
"""

content = re.sub(r'\s*\{\/\* Mascot and Panel Group \*\/\}\n\s*<div\s*className="absolute z-50 flex pointer-events-auto"\s*style=\{\{ left: windowState\.x, top: windowState\.y \}\}\n\s*>\n\s*<div className="relative flex">\n\s*<MascotWidget', replacement, content, flags=re.MULTILINE)


with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
