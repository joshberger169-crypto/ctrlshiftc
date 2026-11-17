<img src="assets/icon.svg" width="64" height="64" alt="">

# CtrlShiftC

A small, dependency-free Chrome extension inspired by Zen's copy URL shortcut.
Press **Ctrl+Shift+C** to copy the current tab's URL with known tracking parameters removed. Clicking the extension's toolbar button does the same thing. The tab itself is never changed.

## Install

Requires Chrome 116 or newer. The compact build contains only four files.

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `dist/` after building, or the extracted ZIP folder. The project root also works for development.
3. Open `chrome://extensions/shortcuts` and check the **Copy the current tab's clean URL** shortcut. Assign **Ctrl+Shift+C** if it is blank, or choose another combination if Chrome reserves it.
4. Optionally pin CtrlShiftC in Chrome's Extensions menu for toolbar access and visible copy feedback.

On macOS the suggested shortcut uses the actual **Control** key. You can change it to Command or another combination in Chrome's shortcut settings.

Chrome's Inspect shortcut also uses Ctrl+Shift+C on some platforms. Chrome or OS shortcuts can take priority, so the extension cannot guarantee it will receive this exact combination. If Inspect still opens, assign an available shortcut such as Alt+Shift+C or use the toolbar button. See [Chrome's command shortcut rules](https://developer.chrome.com/docs/extensions/reference/api/commands#key-combination-requirements).

## Behavior

The toolbar badge briefly shows **OK** after a successful copy or **ERR** if copying fails. Pin the extension to see this feedback.

For example:

```text
https://example.com/article?id=42&utm_source=newsletter&fbclid=abc#details
→ https://example.com/article?id=42#details
```

- Removes a specific list of known tracking keys, including common `utm_*` campaign keys, `fbclid`, `gclid`, `msclkid`, and Mailchimp tracking IDs. Unknown `utm_*` keys are preserved.
- Preserves other query parameters, repeated values, ordering, original escaping, paths, and fragments. Ambiguous keys such as `ref`, `source`, `si`, and `id` stay intact.
- Leaves URLs with recognizable signature, authentication, or expiry query keys unchanged, including AWS and Google signed URLs. No heuristic can guarantee every site's custom URL scheme; the cleaner deliberately favors preserving links over removing every tracker.
- Only cleans HTTP(S) URLs. Other tab URLs are copied unchanged when Chrome makes them available.
- Copies the address of the active tab, not a selected link, canonical URL, or redirect destination.

## Privacy and permissions

No analytics, network requests, remote code, URL history, or persistent storage.

- `activeTab`: reads the tab URL following your shortcut or toolbar click; no broad browsing-history or website permissions.
- `clipboardWrite`: writes the copied URL; never reads the clipboard.
- `offscreen`: uses a bundled hidden document to perform the clipboard write without injecting scripts into websites. See [Chrome's offscreen documentation](https://developer.chrome.com/docs/extensions/reference/api/offscreen).

## Development and verification

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
```

Vite+ provides linting and formatting through `vp lint` and `vp check`. Tests use Node's built-in test runner. They exercise cleaning edge cases and the command → offscreen message → clipboard response flow using Chrome/DOM mocks. Development dependencies stay in ignored `node_modules/`; the extension itself has no runtime dependencies. `npm run build` creates a minified four-file extension in `dist/`, excluding tests, docs, tooling, and Node dependencies.

To verify in Chrome after loading:

1. Open `https://example.com/?id=42&utm_source=test&fbclid=abc#details`.
2. Press the assigned shortcut, then paste into a text editor. Expect `https://example.com/?id=42#details` and an **OK** badge.
3. Repeat using the toolbar button.
4. Try `https://example.com/?sig=example&utm_source=test`; expect the complete URL unchanged.
5. Try a real search, pagination, or timestamped video URL; confirm the useful parameters and fragment survive.

Actual keyboard dispatch and OS clipboard behavior require this manual Chrome check; automated tests mock those APIs.
