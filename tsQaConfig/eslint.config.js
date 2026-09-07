// ts-qa-ci dogfooding overrides. See tsQaConfig/tier-a-exemptions.json for the
// matching justified Tier A exemptions (resolveEslintConfig.ts throws without them).
export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // The as/enum ban. ts-qa-ci's own source is rule-authoring + orchestrator
      // code that bridges estree / ESLint Rule.Node / Node fs+child_process API
      // type boundaries where `as` casts are genuinely unavoidable.
      "no-restricted-syntax": "off",
    },
  },
  {
    // The placeholder-detector rule source must literally contain the token it
    // detects, so it cannot pass its own rule.
    files: ["src/rules/noPlaceholder.ts"],
    rules: {
      "ts-qa/no-placeholder": "off",
    },
  },
  {
    // A ToolModule must derive subprocess scope from the RunContext or leave
    // it to the tool's own config, never a literal guess at the consumer's
    // layout. Internal to ts-qa-ci's tool-authoring surface, so enforced here
    // rather than shipped in a consumer tier. See
    // docs/cdd-rules.md#no-hardcoded-tool-source-path.
    files: ["src/tools/**/*.ts"],
    rules: {
      "ts-qa/no-hardcoded-tool-source-path": "error",
    },
  },
];
