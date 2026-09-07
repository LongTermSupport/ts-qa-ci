/**
 * Tier A core rule.
 *
 * WHY: a Node CLI script commonly gates main() behind "was I invoked directly,
 * or merely imported" by comparing import.meta.url with process.argv[1].
 * import.meta.url is the module's real, symlink-resolved path; argv[1] is the
 * path the process was launched with, unresolved. Behind the symlink every
 * package manager installs at node_modules/.bin/<name>, the two never match,
 * main() never runs, and the process exits 0 having done nothing. No crash,
 * no message, silence where a check should have run. Found in this package's
 * own bin/ts-qa.js. Purely syntactic: it inspects the two sides of an
 * equality comparison for the two operands, in any of the common spellings
 * (pathToFileURL(argv).href against import.meta.url, or fileURLToPath(
 * import.meta.url) against argv, resolved through path.resolve or not), and
 * accepts any spelling that passes argv[1] through a realpath call.
 */
function mentionsImportMetaUrl(text) {
  return /import\s*\.\s*meta\s*\.\s*url/.test(text);
}
function referencesUnresolvedArgv1(text) {
  return (
    /process\s*\.\s*argv\s*\[\s*1\s*\]/.test(text) && !/realpath/i.test(text)
  );
}
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow comparing import.meta.url with an unresolved process.argv[1] for entry-point detection",
    },
    schema: [],
    messages: {
      unresolvedEntrypointCheck:
        "import.meta.url compared with an unresolved process.argv[1] for entry-point detection silently mismatches behind a symlink such as node_modules/.bin, so main() never runs and the process exits 0. Resolve argv[1] first: pathToFileURL(realpathSync(process.argv[1])).href",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      BinaryExpression(node) {
        if (node.operator !== "===" && node.operator !== "!==") return;
        const left = sourceCode.getText(node.left);
        const right = sourceCode.getText(node.right);
        const leftIsUrl = mentionsImportMetaUrl(left);
        const rightIsUrl = mentionsImportMetaUrl(right);
        if (leftIsUrl === rightIsUrl) return;
        const other = leftIsUrl ? right : left;
        if (!referencesUnresolvedArgv1(other)) return;
        context.report({ node, messageId: "unresolvedEntrypointCheck" });
      },
    };
  },
};
export default rule;
//# sourceMappingURL=noUnresolvedEntrypointCheck.js.map
