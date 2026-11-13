import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertHostedAuditEnvironment,
  AUTHORIZED_AUDIT_REF,
  hostedAuditDatabase,
} from "./db/audit-target";

afterEach(() => vi.unstubAllEnvs());

describe("hosted database audit boundary", () => {
  const url = `postgresql://postgres.${AUTHORIZED_AUDIT_REF}:test@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;
  it("accepts the owner's TEST session pooler only with its exact project user and port", () => {
    expect(hostedAuditDatabase(url)).toBe(url);
  });
  it.each([
    url.replace(AUTHORIZED_AUDIT_REF, "dkyabirifoixnfbmheay"),
    url.replace(AUTHORIZED_AUDIT_REF, "rymzkgqoekjluzmzstap"),
    url.replace(":5432/", ":6543/"),
    url.replace("us-west-2", "us-east-2"),
  ])("refuses another project, a transaction pooler, or another host", (value) => {
    expect(() => hostedAuditDatabase(value)).toThrow(/Refusing/);
  });
  it("uses explicit audit settings instead of overloading the application's production settings", () => {
    vi.stubEnv("SUPABASE_AUDIT_PROJECT_ID", AUTHORIZED_AUDIT_REF);
    vi.stubEnv("SUPABASE_AUDIT_URL", `https://${AUTHORIZED_AUDIT_REF}.supabase.co`);
    expect(() => assertHostedAuditEnvironment()).not.toThrow();
    vi.stubEnv("SUPABASE_AUDIT_URL", "https://dkyabirifoixnfbmheay.supabase.co");
    expect(() => assertHostedAuditEnvironment()).toThrow(/authorized TEST/);
  });
});
