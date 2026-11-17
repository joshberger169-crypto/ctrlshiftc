import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("command and toolbar copy through one offscreen document, with failure feedback", async () => {
  const messages = [];
  const badges = [];
  const toasts = [];
  let blocked = false;
  let command,
    click,
    creations = 0,
    exists = false,
    fail = false;
  globalThis.chrome = {
    scripting: {
      executeScript: async (details) => {
        if (blocked) throw new Error("Cannot access this page");
        toasts.push(details);
      },
    },
    commands: {
      onCommand: {
        addListener: (fn) => {
          command = fn;
        },
      },
    },
    action: {
      onClicked: {
        addListener: (fn) => {
          click = fn;
        },
      },
      setBadgeText: async (value) => {
        badges.push(value);
      },
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {},
    },
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      getContexts: async () => (exists ? [{}] : []),
      sendMessage: async (message) => {
        messages.push(message);
        return { ok: !fail };
      },
    },
    offscreen: {
      createDocument: async () => {
        creations++;
        exists = true;
      },
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://example.com/?utm_source=a&q=ok" }],
      get: async (id) =>
        id === 5 ? { id } : { id, url: "https://example.com/?utm_source=shortcut&q=recovered" },
    },
  };
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = () => 0;
  const originalError = console.error;
  console.error = () => {};
  try {
    await import("../background.js");
    command("unrelated");
    command("copy-clean-url");
    click({ id: 2, url: "https://other.example/?fbclid=a#part" });
    await tick();
    await tick();
    assert.deepEqual(
      messages.map((m) => m.text),
      ["https://example.com/?q=ok", "https://other.example/#part"],
    );
    assert.equal(creations, 1);
    assert.deepEqual(
      badges.map((b) => b.text),
      ["OK", "OK"],
    );
    assert.deepEqual(
      toasts.map((t) => [t.target.tabId, t.args[0]]),
      [
        [1, true],
        [2, true],
      ],
    );
    command("copy-clean-url", { id: 4 });
    await tick();
    assert.equal(
      messages.at(-1).text,
      "https://example.com/?q=recovered",
      "a shortcut tab without a URL is refreshed before copying",
    );
    assert.equal(badges.at(-1).text, "OK");
    assert.equal(toasts.at(-1).target.tabId, 4);
    blocked = true;
    click({ id: 3, url: "chrome://extensions/" });
    await tick();
    assert.equal(badges.at(-1).text, "OK", "restricted pages retain successful copy feedback");
    assert.equal(toasts.length, 3);
    const copyCount = messages.length;
    command("copy-clean-url", { id: 5 });
    await tick();
    assert.equal(
      messages.length,
      copyCount,
      "a URL hidden by Chrome never overwrites the clipboard",
    );
    assert.equal(badges.at(-1).text, "ERR");
    blocked = false;
    fail = true;
    click({ id: 2, url: "https://example.com/" });
    await tick();
    assert.equal(badges.at(-1).text, "ERR");
    assert.equal(toasts.at(-1).args[0], false, "failed copies never show a success toast");
  } finally {
    globalThis.setTimeout = originalTimeout;
    console.error = originalError;
    delete globalThis.chrome;
  }
});

test("offscreen copies exactly, clears the buffer, and reports clipboard rejection", async () => {
  let listener,
    accept = true;
  const field = {
    value: "",
    select() {
      this.selected = this.value;
    },
  };
  const context = {
    chrome: {
      runtime: {
        id: "test",
        onMessage: {
          addListener: (fn) => {
            listener = fn;
          },
        },
      },
    },
    document: {
      getElementById: () => field,
      execCommand: (command) => {
        assert.equal(command, "copy");
        return accept;
      },
    },
  };
  vm.runInNewContext(await readFile(new URL("../offscreen.js", import.meta.url), "utf8"), context);
  let result;
  listener(
    { target: "offscreen", type: "copy", text: "https://example.com/?q=%20" },
    { id: "test" },
    (value) => {
      result = value;
    },
  );
  assert.equal(result.ok, true);
  assert.equal(field.selected, "https://example.com/?q=%20");
  assert.equal(field.value, "");
  accept = false;
  listener({ target: "offscreen", type: "copy", text: "test" }, { id: "test" }, (value) => {
    result = value;
  });
  assert.equal(result.ok, false);
  assert.equal(field.value, "");
});
