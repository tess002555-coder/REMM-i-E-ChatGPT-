// The widget is now a small native transparent Tauri window.
// It no longer needs fullscreen-window cursor passthrough. Keeping these
// helpers as no-ops preserves the existing component API without disabling
// mouse input for the entire native window.

export const addInteraction = async () => {};
export const removeInteraction = async () => {};
export const initCursorEvents = async () => {};
