import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, } from "node:fs";
import { dirname, join } from "node:path";
/** Idempotent write: only writes if content actually differs (byte-compare before write). */
export function writeIfChanged(path, content) {
    if (existsSync(path) && readFileSync(path, "utf-8") === content) {
        return { written: false };
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { written: true };
}
/** Recursively copies a directory, byte-comparing each file so unchanged files are never rewritten. */
export function copyDirIdempotent(srcDir, destDir) {
    const copied = [];
    const unchanged = [];
    if (!existsSync(srcDir))
        return { copied, unchanged };
    for (const entry of readdirSync(srcDir)) {
        const srcPath = join(srcDir, entry);
        const destPath = join(destDir, entry);
        if (statSync(srcPath).isDirectory()) {
            const nested = copyDirIdempotent(srcPath, destPath);
            copied.push(...nested.copied);
            unchanged.push(...nested.unchanged);
        }
        else {
            const content = readFileSync(srcPath);
            const alreadyMatches = existsSync(destPath) && readFileSync(destPath).equals(content);
            if (alreadyMatches) {
                unchanged.push(destPath);
            }
            else {
                mkdirSync(dirname(destPath), { recursive: true });
                writeFileSync(destPath, content);
                copied.push(destPath);
            }
        }
    }
    return { copied, unchanged };
}
//# sourceMappingURL=fsUtils.js.map