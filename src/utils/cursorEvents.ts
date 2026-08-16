let interactionCount = 0;

export const addInteraction = async () => {
  interactionCount++;
  await updateCursorEvents();
};

export const removeInteraction = async () => {
  interactionCount--;
  if (interactionCount < 0) interactionCount = 0;
  await updateCursorEvents();
};

const updateCursorEvents = async () => {
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  if (!isTauri) return;

  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    // If interactionCount is 0, we IGNORE cursor events (passthrough to desktop)
    // If interactionCount > 0, we DO NOT ignore cursor events (app captures clicks)
    await getCurrentWebviewWindow().setIgnoreCursorEvents(interactionCount === 0);
  } catch (err) {
    console.warn('Failed to update cursor events:', err);
  }
};
