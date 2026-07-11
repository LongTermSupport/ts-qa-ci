export interface DeployOptions {
  cwd: string;
  packageRoot: string;
}
/**
 * ts-qa deploy-skills (phase2-design.md §5). Manual deploy only for v1 - no
 * postinstall auto-deploy (npm's --ignore-scripts / pnpm's default
 * lifecycle-script blocking make that an unreliable default-on mechanism).
 */
export declare function deploySkills(options: DeployOptions): Promise<void>;
//# sourceMappingURL=deploySkills.d.ts.map
