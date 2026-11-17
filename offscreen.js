chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message.target !== "offscreen" || message.type !== "copy")
    return;
  if (typeof message.text !== "string") {
    sendResponse({ ok: false, error: "Invalid clipboard text." });
    return;
  }
  const field = document.getElementById("clipboard");
  try {
    // Offscreen documents cannot be focused; use Chrome's DOM copy path.
    field.value = message.text;
    field.select();
    if (!document.execCommand("copy")) throw new Error("Chrome rejected the clipboard write.");
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  } finally {
    field.value = "";
  }
});
