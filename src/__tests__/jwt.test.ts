import { describe, it, expect } from "vitest";
import { isTokenExpired } from "../utils/jwt";

describe("isTokenExpired", () => {
  it("returns true for an invalid or malformed token", () => {
    expect(isTokenExpired("invalid.token.here")).toBe(true);
    expect(isTokenExpired("")).toBe(true);
    expect(isTokenExpired(null as any)).toBe(true);
  });

  it("returns true for an expired token", () => {
    const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const payload = btoa(JSON.stringify({ exp: pastTime }));
    const token = `header.${payload}.signature`;
    expect(isTokenExpired(token)).toBe(true);
  });

  it("returns false for a valid, unexpired token", () => {
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const payload = btoa(JSON.stringify({ exp: futureTime }));
    const token = `header.${payload}.signature`;
    expect(isTokenExpired(token)).toBe(false);
  });
  
  it("returns true for a token expiring in less than 5 minutes", () => {
    const soonTime = Math.floor(Date.now() / 1000) + 120; // 2 minutes in future
    const payload = btoa(JSON.stringify({ exp: soonTime }));
    const token = `header.${payload}.signature`;
    expect(isTokenExpired(token)).toBe(true); // Should trigger a refresh
  });
});
