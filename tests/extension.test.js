import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("command and toolbar copy through one offscreen document, with failure feedback", async () => {
  const messages = [];
  const badges = [];
  let command,
    click,
    creations = 0,
    exists = false,
    fail = false;
  globalThis.chrome = {
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
    tabs: { query: async () => [{ id: 1, url: "https://example.com/?utm_source=a&q=ok" }] },
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
    fail = true;
    click({ id: 2, url: "https://example.com/" });
    await tick();
    assert.equal(badges.at(-1).text, "ERR");
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
