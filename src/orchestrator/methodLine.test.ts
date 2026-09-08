import { describe, expect, it } from "vitest";

import { DEFENCE_BEFORE_FIX_LINE } from "./methodLine.js";

/**
 * Failure output names the method and links its canonical specification so a
 * practitioner (or agent) reading a red run knows which rules the gate is
 * enforcing and where they are written down. The text is pinned exactly: the
 * URL is the published specification and must not drift.
 */
describe("DEFENCE_BEFORE_FIX_LINE", () => {
  it("names the method and links the canonical specification exactly", () => {
    expect(DEFENCE_BEFORE_FIX_LINE).toBe(
      "Defence Before Fix: https://longtermsupport.github.io/defence-before-fix/",
    );
  });
});
