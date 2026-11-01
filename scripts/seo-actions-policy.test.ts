import assert from "node:assert/strict";
import { canResolveMissingSeoActions } from "../src/lib/seo-actions";

assert.equal(canResolveMissingSeoActions({
  configured: true, error: null, rows: 8, fallbackUsed: false,
}), true, "recent successful GSC data can resolve missing signals");

assert.equal(canResolveMissingSeoActions({
  configured: true, error: null, rows: 8, fallbackUsed: true,
}), false, "a 90-day fallback must not resolve signals absent from the recent window");

assert.equal(canResolveMissingSeoActions({
  configured: true, error: null, rows: 0, fallbackUsed: false,
}), false, "empty recent data must not resolve missing signals");

assert.equal(canResolveMissingSeoActions({
  configured: true, error: "Google OAuth failed", rows: 10, fallbackUsed: false,
}), false, "authentication/query errors must not resolve signals");

assert.equal(canResolveMissingSeoActions({
  configured: false, error: null, rows: 10, fallbackUsed: false,
}), false, "unconfigured GSC must not resolve signals");

console.log("SEO action resolution policy: all assertions passed");
