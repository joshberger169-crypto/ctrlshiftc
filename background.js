import { cleanUrl } from "./clean-url.js";
import { showToast } from "./toast.js";

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

async function feedback(
  tabId,
  success,
  errorMessage = "Could not copy URL. Try again using the toolbar button.",
) {
  clearTimeout(feedbackTimers.get(tabId));
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: success ? "OK" : "ERR" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: success ? "#15803d" : "#b91c1c" }),
    chrome.action.setTitle({
      tabId,
      title: success ? "Clean URL copied" : errorMessage,
    }),
  ]);
  // Chrome's internal pages and the Web Store forbid script injection.
  // Keep the badge confirmation there, and never turn a copied URL into an error.
  await chrome.scripting
    .executeScript({
      target: { tabId },
      func: showToast,
      args: [success, `ctrlshiftc-${chrome.runtime.id}`],
    })
    .catch(() => {});
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

async function resolveTab(tab) {
  if (tab?.url) return tab;
  // Command events may carry a partial snapshot. Refresh that same tab rather
  // than copying a different tab if focus changes while the command is queued.
  if (tab?.id !== undefined) return chrome.tabs.get(tab.id);
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  return active;
}

async function copyTab(tab) {
  try {
    if (!tab?.url) {
      if (tab?.id !== undefined) {
        await feedback(
          tab.id,
          false,
          "Chrome did not expose this page URL. Try a regular website.",
        );
      }
      return;
    }
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

function enqueue(tab) {
  // Capture the active tab immediately, then serialize clipboard writes.
  const captured = resolveTab(tab).then(
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
  enqueue(tab);
});
chrome.action.onClicked.addListener((tab) => enqueue(tab));
