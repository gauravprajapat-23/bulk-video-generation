import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOwnedMediaFilename } from "../src/services/mediaReference";

test("accepts only simple uploaded-media filenames", () => {
  assert.equal(parseOwnedMediaFilename("abc-123.webm"), "abc-123.webm");
  assert.equal(parseOwnedMediaFilename("https://example.com/uploads/safe_1.mp4"), "safe_1.mp4");
});

test("rejects arbitrary URLs, embedded credentials, and non-upload paths", () => {
  for (const url of [
    "https://evil.example/private.mp4", "file:///etc/passwd",
    "http://127.0.0.1/admin", "http://user:pass@example.com/uploads/a.mp4",
    "https://example.com/uploads/a.mp4?token=secret",
    "https://example.com/uploads/a.mp4#secret",
    "https://example.com/uploads/../admin.mp4",
    "/etc/passwd", "../a.mp4", "a.mp4/../../private",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => parseOwnedMediaFilename(url), undefined, url);
  }
});

test("rejects unsupported extensions and encoded path traversal", () => {
  for (const value of [
    "video.svg", "video.exe", "https://example.com/uploads/a.svg",
    "https://example.com/uploads/%2e%2e%2fsecret.mp4",
    "https://example.com/uploads/a%2Emp4",
  ]) assert.throws(() => parseOwnedMediaFilename(value), undefined, value);
});
