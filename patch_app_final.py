import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the root div class
content = content.replace(
    '<div className="relative w-screen h-screen overflow-hidden text-slate-100 font-sans pointer-events-none">',
    '<div className="widget-wrapper relative w-full h-full overflow-hidden text-slate-100 font-sans" data-tauri-drag-region>'
)

# 2. Re-arrange the TaskPanel rendering to be a popover next to MascotWidget.
# We will create a getPanelPosition function inside App.tsx
panel_pos_logic = """
  // Dynamic Positioning for Panel based on snappedEdge
  const getPanelPosition = () => {
    const edge = windowState.snappedEdge;
    if (edge === 'left') {
      return { left: '100%', marginLeft: '1rem', top: 0 };
    } else if (edge === 'right') {
      return { right: '100%', marginRight: '1rem', top: 0 };
    } else if (edge === 'top') {
      return { top: '100%', marginTop: '1rem', left: 0 };
    } else {
      return { bottom: '100%', marginBottom: '1rem', left: 0 };
    }
  };
"""

# Insert getPanelPosition before return
content = re.sub(r'  return \(', panel_pos_logic + '\n  return (', content)

# Replace the separate Mascot and Panel rendering with a grouped one.
# Find the MascotWidget call and the AnimatePresence for TaskPanel
start_idx = content.find('{/* Mascot Widget / Bilah Sisi */}')
end_idx = content.find('{/* Detail Pop-Up Modal (Floats to the left of Main Panel as depicted in wireframe) */}')

replacement = """{/* Mascot and Panel Group */}
      <div 
        className="absolute z-50 flex pointer-events-auto" 
        style={{ left: windowState.x, top: windowState.y }}
      >
        <div className="relative flex">
          <MascotWidget
            state={characterState}
            snappedEdge={windowState.snappedEdge}
            isPeeking={windowState.isPeeking || (!windowState.isPanelOpen && characterState === 'peek')}
            isPanelOpen={windowState.isPanelOpen}
            displayMode={windowState.displayMode}
            config={characterConfig}
            pendingDeadlines={pendingDeadlines}
            position={{ x: 0, y: 0 }}
            onClick={() => {
              togglePanel();
              if (windowState.isPanelOpen) {
                setActiveModal(null);
              }
            }}
            onToggleDisplayMode={toggleDisplayMode}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragEnd={handleDragEnd}
            onSpeakSpeech={speakText}
          />

          <AnimatePresence>
            {windowState.isPanelOpen && (
              <div 
                className="absolute pointer-events-auto" 
                style={getPanelPosition()}
              >
                <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-1 overflow-hidden min-w-[320px]">
                  <TaskPanel
                    isOpen={windowState.isPanelOpen}
                    snappedEdge={windowState.snappedEdge}
                    tasks={tasks}
                    routines={routines}
                    schedules={schedules}
                    config={characterConfig}
                    onToggleTask={handleToggleTask}
                    onDeleteTask={handleDeleteTask}
                    onToggleRoutine={handleToggleRoutine}
                    onDeleteSchedule={handleDeleteSchedule}
                    onOpenModal={modal => setActiveModal(modal)}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onOpenInstallModal={() => setIsInstallModalOpen(true)}
                    onClose={() => {
                      setActiveModal(null);
                      closePanel();
                    }}
                  />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
"""

content = content[:start_idx] + replacement + "\n      " + content[end_idx:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
