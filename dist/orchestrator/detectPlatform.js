import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
function readConsumerPackageJson(pkgPath) {
    if (!existsSync(pkgPath))
        return undefined;
    try {
        return JSON.parse(readFileSync(pkgPath, 'utf-8'));
    }
    catch (error) {
        // Malformed consumer package.json is a real, expected-at-this-boundary failure mode -
        // fall back to generic platform detection but surface it, don't hide it.
        console.warn(`ts-qa: could not parse ${pkgPath} as JSON (${error.message}); assuming generic platform`);
        return undefined;
    }
}
/**
 * Platform detection (phase2-design.md §2.4). Next.js detection is
 * architecturally reserved (next.config.* presence) but not implemented in
 * v1, per Plan 011's Non-Goals.
 */
export function detectPlatform(projectRoot) {
    const viteConfigCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
    const hasViteConfig = viteConfigCandidates.some((f) => existsSync(join(projectRoot, f)));
    const pkg = readConsumerPackageJson(join(projectRoot, 'package.json'));
    const hasViteDependency = Boolean(pkg?.dependencies?.vite ?? pkg?.devDependencies?.vite);
    if (hasViteConfig && hasViteDependency)
        return 'vite';
    return 'generic';
}
//# sourceMappingURL=detectPlatform.js.map