import test from "node:test";
import assert from "node:assert/strict";
import { cleanUrl } from "../clean-url.js";

const cases = [
  ["https://example.com/article?utm_source=mail&fbclid=abc", "https://example.com/article"],
  [
    "https://example.com/?q=red%20shoes&utm_medium=email&page=2#results",
    "https://example.com/?q=red%20shoes&page=2#results",
  ],
  ["https://example.com/?utm_source=a&x=1&utm_source=b&x=2", "https://example.com/?x=1&x=2"],
  [
    "https://example.com/?%75tm_source=a&FBCLID=b&ref=home&source=docs&si=video",
    "https://example.com/?ref=home&source=docs&si=video",
  ],
  ["https://example.com/?utm_custom=needed&utm_source=a", "https://example.com/?utm_custom=needed"],
  [
    "https://example.com/?q=a+b&empty=&flag&path=%2f%2F&utm_id=1",
    "https://example.com/?q=a+b&empty=&flag&path=%2f%2F",
  ],
  ["https://example.com/?bad%ZZ=value&utm_source=a", "https://example.com/?bad%ZZ=value"],
  [
    "https://example.com/#/route?utm_source=needed",
    "https://example.com/#/route?utm_source=needed",
  ],
  ["https://example.com/?utm_source=a#section", "https://example.com/#section"],
  [
    "https://example.com/?X-Amz-Signature=abc&utm_source=a",
    "https://example.com/?X-Amz-Signature=abc&utm_source=a",
  ],
  ["https://example.com/?sig=abc&utm_source=a", "https://example.com/?sig=abc&utm_source=a"],
  [
    "https://example.com/?token=secret&utm_source=a",
    "https://example.com/?token=secret&utm_source=a",
  ],
  ["https://example.com/?q=test&&flag#hash", "https://example.com/?q=test&&flag#hash"],
  ["chrome://extensions/?utm_source=a", "chrome://extensions/?utm_source=a"],
  ["file:///tmp/test?utm_source=a", "file:///tmp/test?utm_source=a"],
  ["not a URL?utm_source=a", "not a URL?utm_source=a"],
];
for (const [input, expected] of cases) {
  test(`clean ${input}`, () => {
    assert.equal(cleanUrl(input), expected);
    assert.equal(cleanUrl(expected), expected, "cleaning is idempotent");
  });
}
