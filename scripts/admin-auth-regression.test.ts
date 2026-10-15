import assert from "node:assert/strict";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  isAdminAuthenticated,
} from "../src/lib/admin-auth";

const previous = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

function setOrDelete(name: keyof typeof previous, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

try {
  process.env.ADMIN_PASSWORD = "unit-test-only-password";
  process.env.ADMIN_SESSION_SECRET = "unit-test-only-session-secret-that-is-not-a-production-secret";
  process.env.NODE_ENV = "production";

  const cookie = createAdminSessionCookie(process.env.ADMIN_PASSWORD);
  assert.equal(cookie.name, ADMIN_SESSION_COOKIE, "cookie name must be stable");
  assert.equal(cookie.httpOnly, true, "session cookie must be HttpOnly");
  assert.equal(cookie.secure, true, "production session cookie must be Secure");
  assert.equal(cookie.sameSite, "lax", "session cookie must use SameSite=Lax");
  assert.equal(cookie.path, "/", "session cookie must cover admin routes");
  assert.equal(cookie.maxAge, 8 * 60 * 60, "session must expire after eight hours");
  assert.match(cookie.value, /^\d{10}\.[a-f0-9]{64}$/, "cookie must contain expiry and HMAC signature");

  const validRequest = new Request("https://vetor.example/admin", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(cookie.value)}` },
  });
  assert.equal(isAdminAuthenticated(validRequest), true, "valid signed session must authenticate");

  const [expiresAt, signature] = cookie.value.split(".");
  const alteredSignature = signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");
  const tamperedRequest = new Request("https://vetor.example/admin", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=${expiresAt}.${alteredSignature}` },
  });
  assert.equal(isAdminAuthenticated(tamperedRequest), false, "tampered signature must be rejected");

  const expiredRequest = new Request("https://vetor.example/admin", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=1000000000.${"a".repeat(64)}` },
  });
  assert.equal(isAdminAuthenticated(expiredRequest), false, "expired session must be rejected");

  const malformedRequest = new Request("https://vetor.example/admin", {
    headers: { cookie: `${ADMIN_SESSION_COOKIE}=not-a-session` },
  });
  assert.equal(isAdminAuthenticated(malformedRequest), false, "malformed session must be rejected");

  delete process.env.ADMIN_PASSWORD;
  assert.equal(isAdminAuthenticated(validRequest), false, "missing admin password must fail closed");
  process.env.ADMIN_PASSWORD = "unit-test-only-password";
  delete process.env.ADMIN_SESSION_SECRET;
  assert.equal(isAdminAuthenticated(validRequest), false, "missing session secret must fail closed");

  console.log("[admin-auth-regression] OK: cookie flags, valid session, tamper, expiry and fail-closed configuration.");
} finally {
  setOrDelete("ADMIN_PASSWORD", previous.ADMIN_PASSWORD);
  setOrDelete("ADMIN_SESSION_SECRET", previous.ADMIN_SESSION_SECRET);
  setOrDelete("NODE_ENV", previous.NODE_ENV);
}
