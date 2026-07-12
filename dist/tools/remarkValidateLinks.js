import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { remark } from "remark";
import remarkValidateLinksPlugin from "remark-validate-links";
import { VFile } from "vfile";
import { resolveConfigPath } from "../orchestrator/resolveConfigPath.js";
function loadIgnorePatterns(ctx) {
    const configPath = resolveConfigPath(ctx.cwd, ctx.platform, "remark-ignore.json", ctx.packageRoot);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    return config.ignorePatterns ?? ["**/node_modules/**"];
}
/**
 * remark-validate-links (phase2-design.md §1): relative-file + anchor
 * resolution parity with LinksChecker.php, explicitly WITHOUT external
 * http(s) link checking (out of v1 scope, §7 risk 2 — resolved, not a gap).
 * `repository: false` is passed explicitly — relying on package.json's
 * `repository` field for autodetection throws on SSH-form URLs.
 */
const tool = {
    name: "remarkValidateLinks",
    phase: 2,
    mutates: false,
    pathSupporting: true,
    async run(ctx) {
        const pattern = ctx.path ? `${ctx.path}/**/*.md` : "**/*.md";
        const exclude = loadIgnorePatterns(ctx);
        const files = [];
        for await (const file of glob(pattern, { cwd: ctx.cwd, exclude })) {
            files.push(file);
        }
        const processor = remark().use(remarkValidateLinksPlugin, {
            repository: false,
        });
        let hadMessages = false;
        const stdoutLines = [];
        for (const file of files) {
            const contents = await readFile(`${ctx.cwd}/${file}`, "utf-8");
            const vfile = new VFile({ path: file, value: contents });
            const result = await processor.process(vfile);
            if (result.messages.length > 0) {
                hadMessages = true;
                for (const message of result.messages)
                    stdoutLines.push(`${file}: ${message.toString()}`);
            }
        }
        return {
            exitClass: hadMessages ? "failure" : "clean",
            stdout: stdoutLines.join("\n"),
            stderr: "",
        };
    },
};
export default tool;
//# sourceMappingURL=remarkValidateLinks.js.map