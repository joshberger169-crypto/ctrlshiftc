<img src="assets/icon.svg" width="64" height="64" alt="">

# CtrlShiftC

A small, dependency-free Chrome extension inspired by Zen's copy URL shortcut.
Press **Ctrl+Shift+C** to copy the current tab's URL with known tracking parameters removed. Clicking the extension's toolbar button does the same thing. The tab itself is never changed.

## Install

Requires Chrome 116 or newer. The compact build includes bundled ClearURLs query rules and their license notices.

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `dist/` after building, or the extracted ZIP folder. The project root also works for development.
3. Open `chrome://extensions/shortcuts` and check the **Copy the current tab's clean URL** shortcut. Assign **Ctrl+Shift+C** if it is blank, or choose another combination if Chrome reserves it.
4. Optionally pin CtrlShiftC in Chrome's Extensions menu for toolbar access and visible copy feedback.

On macOS the suggested shortcut uses the actual **Control** key. You can change it to Command or another combination in Chrome's shortcut settings.

Chrome's Inspect shortcut also uses Ctrl+Shift+C on some platforms. Chrome or OS shortcuts can take priority, so the extension cannot guarantee it will receive this exact combination. If Inspect still opens, assign an available shortcut such as Alt+Shift+C or use the toolbar button. See [Chrome's command shortcut rules](https://developer.chrome.com/docs/extensions/reference/api/commands#key-combination-requirements).

## Behavior

A brief **✓ Clean URL copied** toast appears at the bottom of the page after copying. It dismisses automatically without taking focus. Failed copies show an error message. Chrome internal pages and the Web Store block page overlays; the toolbar badge provides **OK** / **ERR** feedback there. If Chrome also hides the page URL, the clipboard is left untouched and the badge tooltip asks you to try a regular website. Pin the extension to see the badge.

For example:

```text
https://example.com/article?id=42&utm_source=newsletter&fbclid=abc#details
→ https://example.com/article?id=42#details
```

- Uses 144 query-removal providers derived from [ClearURLs/Rules](https://github.com/ClearURLs/Rules), including global tracking patterns and site-specific rules for Google, Amazon, YouTube, and others.
- Preserves unmatched query parameters, repeated values, ordering, original escaping, paths, and fragments. Site-specific rules can remove keys such as `source` on Google and `si` on YouTube while preserving them elsewhere. Provider exceptions are honored; for example, the upstream global rules exempt GitHub URLs.
- Leaves URLs with recognizable signature, authentication, or expiry query keys unchanged, including AWS and Google signed URLs. No heuristic can guarantee every site's custom URL scheme; the cleaner deliberately favors preserving links over removing every tracker.
- Only cleans HTTP(S) URLs. Other tab URLs are copied unchanged when Chrome makes them available.
- Copies the address of the active tab, not a selected link, canonical URL, or redirect destination.

## Privacy and permissions

No analytics, network requests, remote code, URL history, or persistent storage.

- `activeTab`: reads the tab URL following your shortcut or toolbar click; no broad browsing-history or website permissions.
- `clipboardWrite`: writes the copied URL; never reads the clipboard.
- `scripting`: shows the confirmation toast on the current page after your shortcut or click, using temporary `activeTab` access.
- `offscreen`: uses a bundled hidden document to perform the clipboard write. See [Chrome's offscreen documentation](https://developer.chrome.com/docs/extensions/reference/api/offscreen).

## Development and verification

```sh
npm ci
npm run lint
npm run check
npm test
npm run build
```

Vite+ provides linting and formatting through `vp lint` and `vp check`. Tests use Node's built-in test runner. They exercise cleaning edge cases and the command → offscreen message → clipboard response flow using Chrome/DOM mocks. Development dependencies stay in ignored `node_modules/`; the extension itself has no runtime dependencies. `npm run build` creates a minified extension in `dist/`, excluding tests, development docs, tooling, and Node dependencies. ClearURLs rules remain a separate readable module alongside their licenses and attribution; they are never fetched at runtime.

To verify in Chrome after loading:

1. Open `https://example.com/?id=42&utm_source=test&fbclid=abc#details`.
2. Press the assigned shortcut, then paste into a text editor. Expect `https://example.com/?id=42#details` and an **OK** badge.
3. Repeat using the toolbar button.
4. Try `https://example.com/?sig=example&utm_source=test`; expect the complete URL unchanged.
5. Try a real search, pagination, or timestamped video URL; confirm the useful parameters and fragment survive.

Actual keyboard dispatch and OS clipboard behavior require this manual Chrome check; automated tests mock those APIs.

## Rules source

The pinned upstream commit, attribution, and modification notice are in [rules/NOTICE.txt](rules/NOTICE.txt). Only query-removal rules, URL patterns, and exceptions are included. Redirect rewriting, raw path edits, request blocking, and referral-marketing rules are omitted to limit scope and size. Signed/authenticated query safeguards take priority over provider rules.

To regenerate the snapshot, run `node scripts/update-rules.js` (requires network access during development only). Change the pinned commit in that script to update, review the diff, then run checks and rebuild. The rules are licensed under LGPL-3.0; the accompanying GPL and LGPL license texts are included in every build.
