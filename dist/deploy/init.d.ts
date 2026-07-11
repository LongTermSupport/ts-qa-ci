export interface InitOptions {
    cwd: string;
    /**
     * ts-qa-ci's own package root. When provided, init also scaffolds the shipped
     * GitHub Actions archetype (configDefaults/github-workflows/ci.yml) into the
     * consumer's .github/workflows/ts-qa.yml. bin/ts-qa.js always passes it; a bare
     * programmatic call may omit it, in which case only tsQaConfig/ is scaffolded.
     */
    packageRoot?: string;
}
/** ts-qa init (phase2-design.md §2.1): scaffold tsQaConfig/ + the CI archetype in the consumer project. */
export declare function init(options: InitOptions): Promise<void>;
//# sourceMappingURL=init.d.ts.map