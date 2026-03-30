// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: (...args: unknown[]) => mockSet(...args),
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  }),
}));

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
  mockDelete.mockClear();
});

test("createSession signs a JWT and sets a cookie", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();

  const [cookieName, token, options] = mockSet.mock.calls[0];

  expect(cookieName).toBe("auth-token");
  expect(typeof token).toBe("string");

  // Verify the JWT is valid and contains correct payload
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
  expect(payload.expiresAt).toBeDefined();

  // Verify cookie options
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets expiry to 7 days from now", async () => {
  const { createSession } = await import("@/lib/auth");

  const before = Date.now();
  await createSession("user-1", "a@b.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
});

test("createSession sets secure flag based on NODE_ENV", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-1", "a@b.com");

  const [, , options] = mockSet.mock.calls[0];
  // In test env, NODE_ENV !== "production"
  expect(options.secure).toBe(false);
});

test("createSession produces a JWT with HS256 algorithm", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-1", "a@b.com");

  const [, token] = mockSet.mock.calls[0];
  // Decode the header (first segment, base64url)
  const header = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString()
  );
  expect(header.alg).toBe("HS256");
});

test("createSession includes iat and exp claims in JWT", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-1", "a@b.com");

  const [, token] = mockSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.iat).toBeDefined();
  expect(payload.exp).toBeDefined();
  // exp should be ~7 days after iat
  expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
});
