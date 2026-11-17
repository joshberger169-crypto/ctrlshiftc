import rules from "./rules/clearurls.js";

const providers = rules.map(([url, parameters, exceptions]) => ({
  url: new RegExp(url, "i"),
  parameters: new RegExp(`^(?:${parameters.join("|")})$`, "i"),
  exceptions: exceptions.map((pattern) => new RegExp(pattern, "i")),
}));

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
  const matching = providers.filter(
    (provider) =>
      provider.url.test(input) && !provider.exceptions.some((pattern) => pattern.test(input)),
  );
  const kept = parts.filter(
    (_, index) =>
      keys[index] === null || !matching.some((provider) => provider.parameters.test(keys[index])),
  );
  if (kept.length === parts.length) return input;
  const query = kept.join("&");
  return input.slice(0, queryIndex) + (query ? `?${query}` : "") + input.slice(end);
}
