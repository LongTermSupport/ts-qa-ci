import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  type LlmOutputMode,
  type LlmResolutionInput,
  resolveLlm,
  resolveLlmOutputMode,
} from "./resolveLlm.js";

const env = (overrides: Record<string, string>): NodeJS.ProcessEnv =>
  overrides as unknown as NodeJS.ProcessEnv;

/** Typed input builder — defaults to "nothing forces it" so each test overrides one layer. */
const input = (overrides: Partial<LlmResolutionInput>): LlmResolutionInput => ({
  cli: undefined,
  json: false,
  env: env({}),
  mode: "auto",
  ...overrides,
});

/**
 * `--llm` activation is resolved from four layers (CLI > env > config > auto),
 * mirroring detectReadOnly's precedence shape. resolveLlmOutputMode reads the
 * `llmOutput` knob the same way resolveDisabledTools reads `disabledTools`.
 */
describe("resolveLlmOutputMode", () => {
  const dirs: string[] = [];
  const proj = (config?: unknown): string => {
    const dir = mkdtempSync(join(tmpdir(), "tsqa-llmmode-"));
    dirs.push(dir);
    if (config !== undefined) {
      mkdirSync(join(dir, "tsQaConfig"), { recursive: true });
      writeFileSync(
        join(dir, "tsQaConfig", "ts-qa.json"),
        typeof config === "string" ? config : JSON.stringify(config),
      );
    }
    return dir;
  };
  afterEach(() => {
    while (dirs.length > 0)
      rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('defaults to "auto" when there is no config file', () => {
    expect(resolveLlmOutputMode(proj())).toBe("auto");
  });

  it('defaults to "auto" when the config omits llmOutput', () => {
    expect(resolveLlmOutputMode(proj({ disabledTools: ["playwright"] }))).toBe(
      "auto",
    );
  });

  it("reads each valid llmOutput value", () => {
    expect(resolveLlmOutputMode(proj({ llmOutput: "auto" }))).toBe("auto");
    expect(resolveLlmOutputMode(proj({ llmOutput: "always" }))).toBe("always");
    expect(resolveLlmOutputMode(proj({ llmOutput: "never" }))).toBe("never");
  });

  it("throws on an invalid llmOutput value", () => {
    expect(() =>
      resolveLlmOutputMode(proj({ llmOutput: "sometimes" })),
    ).toThrow(/"llmOutput" .* must be one of auto, always, never/);
    expect(() => resolveLlmOutputMode(proj({ llmOutput: true }))).toThrow(
      /must be one of/,
    );
  });
});

describe("resolveLlm precedence", () => {
  it("CLI --llm/--no-llm wins over everything", () => {
    // --llm beats config "never" and TSQA_LLM=0.
    expect(
      resolveLlm(
        input({ cli: true, env: env({ TSQA_LLM: "0" }), mode: "never" }),
      ),
    ).toBe(true);
    // --no-llm beats config "always", TSQA_LLM=1 and an agent env.
    expect(
      resolveLlm(
        input({
          cli: false,
          env: env({ TSQA_LLM: "1", CLAUDECODE: "1" }),
          mode: "always",
        }),
      ),
    ).toBe(false);
  });

  it("an explicit --json suppresses auto-enablement (json owns stdout)", () => {
    expect(
      resolveLlm(
        input({ json: true, env: env({ CLAUDECODE: "1" }), mode: "always" }),
      ),
    ).toBe(false);
  });

  it("TSQA_LLM overrides config when no CLI flag is given", () => {
    expect(
      resolveLlm(input({ env: env({ TSQA_LLM: "1" }), mode: "never" })),
    ).toBe(true);
    expect(
      resolveLlm(input({ env: env({ TSQA_LLM: "0" }), mode: "always" })),
    ).toBe(false);
  });

  it("config always/never wins over auto-detect", () => {
    const always: LlmOutputMode = "always";
    const never: LlmOutputMode = "never";
    expect(resolveLlm(input({ mode: always }))).toBe(true);
    expect(
      resolveLlm(input({ env: env({ CLAUDECODE: "1" }), mode: never })),
    ).toBe(false);
  });

  it("auto falls through to detectLlm", () => {
    expect(
      resolveLlm(input({ env: env({ CLAUDECODE: "1" }), mode: "auto" })),
    ).toBe(true);
    expect(resolveLlm(input({ mode: "auto" }))).toBe(false);
  });
});
