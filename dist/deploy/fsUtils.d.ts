/** Idempotent write: only writes if content actually differs (byte-compare before write). */
export declare function writeIfChanged(path: string, content: string): {
    written: boolean;
};
/** Recursively copies a directory, byte-comparing each file so unchanged files are never rewritten. */
export declare function copyDirIdempotent(srcDir: string, destDir: string): {
    copied: string[];
    unchanged: string[];
};
//# sourceMappingURL=fsUtils.d.ts.map