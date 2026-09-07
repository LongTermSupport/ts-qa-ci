import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noHardcodedToolSourcePath.js";

const ruleTester = makeRuleTester();

/**
 * Defence Before Fix: a `ToolModule.run()` (src/tools/*.ts) MUST NOT bake a
 * literal project-layout assumption ("src") into the argument list it spawns
 * a subprocess with. That assumption breaks on any consumer whose source
 * tree is not literally rooted at a top-level `src/` (e.g. `apps/web/src/`)
 * — confirmed defect: dependencyCruiser.ts hardcoded "src" as depcruise's
 * positional scan root, so `depcruise --config <cfg> src` failed with
 * "Can't open 'src' for reading" on any consumer laid out differently.
 *
 * Only files under src/tools/ are policed: this is a meta-rule over
 * ts-qa-ci's own tool-authoring surface, not a rule a consumer's code could
 * ever trip (consumers do not call execTool()).
 */
ruleTester.run("no-hardcoded-tool-source-path", rule, {
  valid: [
    // Not inside src/tools/ — not policed, even though the shape matches.
    {
      code: 'execTool(bin, ["--config", configPath, "src"], ctx.cwd);',
      filename: "/proj/src/other/thing.ts",
    },
    // The fixed form: no literal project-layout assumption, cwd owns scope.
    {
      code: 'execTool(bin, ["--config", configPath, ctx.cwd], ctx.cwd, dirname(bin));',
      filename: "/proj/src/tools/dependencyCruiser.ts",
    },
    // A bare subcommand/flag-value literal that is not "src" is fine — this
    // rule only bans the specific project-layout literal, not all literals
    // (a broader ban would false-positive on legitimate tokens like the
    // "eslint"/"stryker"/"run" subcommand names other tools pass).
    {
      code: 'execTool("npx", ["eslint", "--config", configPath, target], ctx.cwd);',
      filename: "/proj/src/tools/eslintReport.ts",
    },
    {
      code: 'execTool("npx", ["stryker", "run"], ctx.cwd);',
      filename: "/proj/src/tools/stryker.ts",
    },
    // "src" appearing somewhere that is not an execTool() argument is fine.
    {
      code: 'const label = "src";',
      filename: "/proj/src/tools/dependencyCruiser.ts",
    },
  ],
  invalid: [
    // The originating defect, reproduced verbatim.
    {
      code: 'execTool(bin, ["--config", configPath, "src"], ctx.cwd, dirname(bin));',
      filename: "/proj/src/tools/dependencyCruiser.ts",
      errors: [{ messageId: "hardcodedSrc" }],
    },
    // Any other tool module baking in the same literal is caught too.
    {
      code: 'execTool("npx", ["knip", "src"], ctx.cwd);',
      filename: "/proj/src/tools/knip.ts",
      errors: [{ messageId: "hardcodedSrc" }],
    },
  ],
});
