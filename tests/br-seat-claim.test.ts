import { describe, expect, it } from "vitest";
import { pageName, seatClaim } from "../workers/fps/seat-claim";

describe("seat claim (another page of the account)", () => {
  it("takes a seat nobody live holds, and replaces a closed holder", () => {
    expect(seatClaim([], "page-aaaaaaaa", false)).toBe("take");
    expect(seatClaim([], null, false)).toBe("take");
    expect(seatClaim([{ page: "page-bbbbbbbb", open: false }], null, false)).toBe("replace");
  });
  it("a page reconnecting replaces its own socket", () => {
    expect(seatClaim([{ page: "page-aaaaaaaa", open: true }], "page-aaaaaaaa", false)).toBe(
      "replace",
    );
  });
  it("another page, or a client without a name, is refused while the seat is played", () => {
    expect(seatClaim([{ page: "page-aaaaaaaa", open: true }], "page-bbbbbbbb", false)).toBe(
      "refuse",
    );
    expect(seatClaim([{ page: "page-aaaaaaaa", open: true }], null, false)).toBe("refuse");
    expect(seatClaim([{ page: null, open: true }], null, false)).toBe("refuse");
    // An old client without a name cannot take over either.
    expect(seatClaim([{ page: "page-aaaaaaaa", open: true }], null, true)).toBe("refuse");
  });
  it("'Play here' takes it over", () => {
    expect(seatClaim([{ page: "page-aaaaaaaa", open: true }], "page-bbbbbbbb", true)).toBe(
      "replace",
    );
    expect(seatClaim([{ page: undefined, open: true }], "page-bbbbbbbb", true)).toBe("replace");
  });
  it("accepts only plain page names", () => {
    expect(pageName("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
    expect(pageName(null)).toBeNull();
    expect(pageName("short")).toBeNull();
    expect(pageName("x".repeat(65))).toBeNull();
    expect(pageName("bad/page-name")).toBeNull();
  });
});
