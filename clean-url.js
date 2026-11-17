// Deliberately avoid ambiguous names such as ref, source, id, si, and feature.
const TRACKING_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "twclid",
  "ttclid",
  "yclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
]);

function decodeKey(part) {
  try {
    return decodeURIComponent(part.split("=", 1)[0].replace(/\+/g, " ")).toLowerCase();
  } catch {
    return null;
  }
}

function isProtectedKey(key) {
  return (
    key !== null &&
    (/^(x-amz-|x-goog-)/.test(key) ||
      /^(signature|sig|hmac|hash|token|access_token|auth|authorization|jwt|policy|key-pair-id|expires|se)$/.test(
        key,
      ))
  );
}

export function cleanUrl(input) {
  // Parse for validation only. Serializing URLSearchParams would change encoding,
  // spaces, empty values, and potentially the meaning of untouched parameters.
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return input;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return input;

  const hashIndex = input.indexOf("#");
  const end = hashIndex === -1 ? input.length : hashIndex;
  const queryIndex = input.indexOf("?");
  if (queryIndex === -1 || queryIndex >= end) return input;

  const parts = input.slice(queryIndex + 1, end).split("&");
  const keys = parts.map(decodeKey);
  // Authentication and signed download links can depend on the entire query.
  if (keys.some(isProtectedKey)) return input;
  const kept = parts.filter((_, index) => !TRACKING_KEYS.has(keys[index]));
  if (kept.length === parts.length) return input;
  const query = kept.join("&");
  return input.slice(0, queryIndex) + (query ? `?${query}` : "") + input.slice(end);
}
