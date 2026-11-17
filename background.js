import { cleanUrl } from "./clean-url.js";

let creatingOffscreen;
let queue = Promise.resolve();
const feedbackTimers = new Map();

async function ensureOffscreen() {
  if (creatingOffscreen) return creatingOffscreen;
  creatingOffscreen = (async () => {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [chrome.runtime.getURL("offscreen.html")],
    });
    if (!contexts.length) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["CLIPBOARD"],
        justification: "Copy the current tab URL after an explicit shortcut or toolbar click.",
      });
    }
  })();
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = undefined;
  }
}

async function feedback(tabId, success) {
  clearTimeout(feedbackTimers.get(tabId));
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: success ? "OK" : "ERR" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: success ? "#15803d" : "#b91c1c" }),
    chrome.action.setTitle({
      tabId,
      title: success
        ? "Clean URL copied"
        : "Could not copy URL. Try again using the toolbar button.",
    }),
  ]);
  feedbackTimers.set(
    tabId,
    setTimeout(() => {
      feedbackTimers.delete(tabId);
      Promise.all([
        chrome.action.setBadgeText({ tabId, text: "" }),
        chrome.action.setTitle({ tabId, title: "Copy clean URL" }),
      ]).catch(() => {}); // The tab may have been closed.
    }, 2500),
  );
}

async function copyTab(tab) {
  try {
    if (!tab?.url) throw new Error("The current tab URL is unavailable.");
    const text = cleanUrl(tab.url);
    await ensureOffscreen();
    const response = await chrome.runtime.sendMessage({ target: "offscreen", type: "copy", text });
    if (!response?.ok) throw new Error(response?.error || "Clipboard copy failed.");
    await feedback(tab.id, true);
  } catch (error) {
    console.error("CtrlShiftC:", error);
    if (tab?.id !== undefined) await feedback(tab.id, false).catch(() => {});
  }
}

function enqueue(tabPromise) {
  // Capture the active tab immediately, then serialize clipboard writes.
  const captured = Promise.resolve(tabPromise).then(
    (tab) => ({ tab }),
    (error) => ({ error }),
  );
  queue = queue
    .then(async () => {
      const result = await captured;
      if (result.error) throw result.error;
      await copyTab(result.tab);
    })
    .catch((error) => console.error("CtrlShiftC:", error));
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "copy-clean-url") return;
  enqueue(tab || chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => tabs[0]));
});
chrome.action.onClicked.addListener((tab) => enqueue(tab));
