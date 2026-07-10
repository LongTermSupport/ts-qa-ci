import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
function cacheDir(projectRoot, toolName) {
    return join(projectRoot, 'var', 'qa', toolName);
}
export function computeCacheKey(inputs) {
    const hash = createHash('sha256');
    for (const input of inputs)
        hash.update(input);
    return hash.digest('hex').slice(0, 16);
}
export function readCache(projectRoot, toolName, key) {
    const dir = cacheDir(projectRoot, toolName);
    const path = join(dir, `${key}.json`);
    if (!existsSync(path))
        return undefined;
    const entry = JSON.parse(readFileSync(path, 'utf-8'));
    return entry.result;
}
export function writeCache(projectRoot, toolName, key, result) {
    const dir = cacheDir(projectRoot, toolName);
    mkdirSync(dir, { recursive: true });
    const entry = { toolName, hash: key, timestamp: new Date().toISOString(), result };
    writeFileSync(join(dir, `${key}.json`), JSON.stringify(entry, null, 2));
}
//# sourceMappingURL=cache.js.map