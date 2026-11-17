// Serialized by chrome.scripting; keep this function self-contained.
export function showToast(success, id) {
  document.getElementById(id)?.remove();
  const host = document.createElement("div");
  host.id = id;
  host.setAttribute("popover", "manual");
  host.style.cssText =
    "all:initial!important;position:fixed!important;inset:auto!important;bottom:28px!important;left:50%!important;transform:translateX(-50%)!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;z-index:2147483647!important;pointer-events:none!important;max-width:calc(100vw - 32px)!important;";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    div { box-sizing:border-box;display:flex;align-items:center;gap:10px;
      padding:12px 18px;border:1px solid #ffffff25;border-radius:12px;
      background:#242424;color:#fff;box-shadow:0 8px 30px #0004;
      font:500 14px/1.4 system-ui,sans-serif;animation:appear .15s ease-out }
    span:first-child { color:${success ? "#86efac" : "#fca5a5"};font-size:18px }
    @keyframes appear { from { opacity:0;transform:translateY(6px) } }
    @media (prefers-reduced-motion:reduce) { div { animation:none } }
  `;
  const message = document.createElement("div");
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = success ? "✓" : "!";
  const label = document.createElement("span");
  label.textContent = success ? "Clean URL copied" : "Could not copy URL";
  message.append(icon, label);
  root.append(style, message);
  document.documentElement.append(host);
  try {
    host.showPopover();
  } catch {
    /* Fixed positioning is the fallback. */
  }
  setTimeout(() => host.remove(), 2200);
}
