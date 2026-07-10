import { existsSync } from 'node:fs';
import { join } from 'node:path';
/** phase2-design.md §5.1 step 4: detect hooks-daemon presence by checking for its marker files. */
export function detectHooksDaemon(projectRoot) {
    return existsSync(join(projectRoot, '.claude', 'hooks-daemon.yaml')) || existsSync(join(projectRoot, '.claude', 'skills', 'hooks-daemon'));
}
//# sourceMappingURL=detectHooksDaemon.js.map