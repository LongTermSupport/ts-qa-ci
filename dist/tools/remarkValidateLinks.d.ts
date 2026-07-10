import type { ToolModule } from '../orchestrator/types.js';
/**
 * remark-validate-links (phase2-design.md §1): relative-file + anchor
 * resolution parity with LinksChecker.php, explicitly WITHOUT external
 * http(s) link checking (out of v1 scope, §7 risk 2 — resolved, not a gap).
 * `repository: false` is passed explicitly — relying on package.json's
 * `repository` field for autodetection throws on SSH-form URLs.
 */
declare const tool: ToolModule;
export default tool;
//# sourceMappingURL=remarkValidateLinks.d.ts.map