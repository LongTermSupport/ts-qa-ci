import { describe, expect, it, vi } from "vitest";

import { detectCi, detectLlm, detectReadOnly } from "./detectReadOnly.js";

const env = (overrides: Record<string, string>): NodeJS.ProcessEnv =>
  overrides as unknown as NodeJS.ProcessEnv;

/**
 * detectCi must be a pure predicate (GitHub issue #6, BUG A): it used to
 * console.log under CLAUDECODE, prepending non-JSON text to stdout and
 * corrupting `ts-qa --json`. The diagnostic now lives in the json-aware caller.
 */
describe("detectCi", () => {
  it("does not print anything when CLAUDECODE enables CI mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const env = { CLAUDECODE: "1" } as unknown as NodeJS.ProcessEnv;
      expect(detectCi(env, true, true)).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("CI=true wins first", () => {
    const env = { CI: "true" } as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, true, true)).toBe(true);
  });

  it("a non-TTY stream implies CI", () => {
    const env = {} as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, false, true)).toBe(true);
    expect(detectCi(env, true, false)).toBe(true);
  });

  it("an interactive terminal off-CI is not CI", () => {
    const env = {} as unknown as NodeJS.ProcessEnv;
    expect(detectCi(env, true, true)).toBe(false);
  });
});

describe("detectReadOnly", () => {
  it("TSQA_READONLY overrides in both directions", () => {
    expect(
      detectReadOnly({ TSQA_READONLY: "1" } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      detectReadOnly({ TSQA_READONLY: "0" } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it("GITHUB_ACTIONS implies read-only", () => {
    expect(
      detectReadOnly({
        GITHUB_ACTIONS: "true",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("defaults to writable", () => {
    expect(detectReadOnly({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

/**
 * detectLlm is the `"auto"` branch of the llmOutput knob: an explicit env
 * allowlist for agent/LLM environments, never inferred from a pipe/non-TTY.
 */
describe("detectLlm", () => {
  it("TSQA_LLM overrides in both directions (exact 1/0, not truthiness)", () => {
    expect(detectLlm(env({ TSQA_LLM: "1" }))).toBe(true);
    expect(detectLlm(env({ TSQA_LLM: "0" }))).toBe(false);
    // '0' is a truthy string in JS — it must still read as OFF, and must win
    // over a co-present agent marker.
    expect(detectLlm(env({ TSQA_LLM: "0", CLAUDECODE: "1" }))).toBe(false);
  });

  it("detects Claude Code via CLAUDECODE=1", () => {
    expect(detectLlm(env({ CLAUDECODE: "1" }))).toBe(true);
  });

  it("detects each agent marker when set", () => {
    expect(detectLlm(env({ CLAUDE_CODE: "1" }))).toBe(true);
    expect(detectLlm(env({ CLAUDE_CODE_ENTRYPOINT: "cli" }))).toBe(true);
    expect(detectLlm(env({ AGENT: "1" }))).toBe(true);
    expect(detectLlm(env({ AI_AGENT: "true" }))).toBe(true);
  });

  it("treats an empty-string marker as unset", () => {
    expect(detectLlm(env({ CLAUDE_CODE: "", AGENT: "" }))).toBe(false);
  });

  it("does not infer from a bare/empty environment (a piped human run stays rich)", () => {
    expect(detectLlm(env({}))).toBe(false);
    expect(detectLlm(env({ CLAUDECODE: "0" }))).toBe(false);
  });
});
