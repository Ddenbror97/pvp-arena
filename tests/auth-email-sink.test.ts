import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { developmentEmailSink, emailSinkRoot } from "../src/lib/auth-otp/email-sink.server";
describe("development Auth mail capture", () => {
  it("allows a portable dedicated development temp path", () => {
    const path = resolve(emailSinkRoot(), "registration.jsonl");
    expect(developmentEmailSink(path, "development")).toBe(path);
  });
  it("never redirects production, test or unspecified environments to a file", () => {
    for (const env of ["production", "test", undefined])
      expect(developmentEmailSink(resolve(emailSinkRoot(), "mail.jsonl"), env)).toBeUndefined();
  });
  it("rejects missing, relative, directory-only and escaped paths", () => {
    for (const path of [
      undefined,
      "relative.jsonl",
      emailSinkRoot(),
      resolve(tmpdir(), "outside.jsonl"),
      resolve(emailSinkRoot(), "..", "outside.jsonl"),
    ])
      expect(developmentEmailSink(path, "development")).toBeUndefined();
  });
});
