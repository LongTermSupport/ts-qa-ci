import type { Rule, Scope } from "eslint";
import type { Node, Expression, SpreadElement, Property } from "estree";
import type { JSXAttribute } from "estree-jsx";

/**
 * Tier B (opt-in CDD): closes the "ad-hoc className" hole — the pattern the
 * whole closed-styling doctrine exists to eliminate. See
 * docs/closed-styling-doctrine.md.
 *
 * WHY: Tailwind/CSS classes are a component's INTERNAL concern. A component owns
 * its raw HTML and styles its FINITE, named states internally — which is exactly
 * what makes every state enumerable in a story/test. The moment arbitrary class
 * strings are authored on a COMPOSING surface (feature/screen/page), the visual
 * state space becomes infinite and untestable. That is the loss this rule
 * refuses.
 *
 * The enforceable line is DIRECTORY OWNERSHIP, not "raw HTML vs component":
 *   - `sanctionedDirs` (primitive boundaries: ui/, layout/, composite/, …) MAY
 *     author class-string literals — those literals are the primitive's
 *     internals, styling its own finite states.
 *   - Every other in-scope file MAY NOT author class-string literals: a literal
 *     there is styling imposed at a call site, so the fix is always "extend an
 *     existing primitive or extract a new one, then consume its typed props".
 *
 * v1 of this rule had a fatal hole: it treated ANY `cn()/clsx()/twMerge()` call
 * as sanctioned WITHOUT inspecting its arguments, so `cn("h-12 text-base …",
 * cond && "…")` — an arbitrary class pile merely wrapped in a helper — passed.
 * This version walks INSIDE resolver calls (and ternaries, logicals, arrays,
 * clsx object keys, and same-file const initializers) and reports every authored
 * class-string literal. Only references into a finite catalogue — a `cva()`
 * product, a `VARIANT[x]` map lookup, a `props.*`/identifier that is not a raw
 * string — are sanctioned, because those are named states, not authored classes.
 */
interface RuleOptions {
  /** Helper names whose string-literal arguments are class names (default cva/cn/clsx/twMerge). */
  variantResolverNames?: string[];
  /** Dirs whose files may author class-string literals (primitive boundaries). */
  sanctionedDirs?: string[];
  /** Path fragments the rule polices (default ['src/']). */
  scopeGlobs?: string[];
  /** Resolve same-file `const x = "utilities"` referenced as className (default true). */
  chaseLocalConsts?: boolean;
}

const DOCTRINE_URL =
  "https://github.com/LongTermSupport/ts-qa-ci/blob/main/docs/closed-styling-doctrine.md";

/**
 * Segment-anchored path match (shared shape with noClassnameProp): prefix a
 * leading slash so `src/ui/` matches `/proj/src/ui/…` but not `…/adsrc/ui/…`.
 */
function pathIncludesAny(filename: string, globs: string[]): boolean {
  const anchored = `/${filename.replace(/^\/+/, "")}`;
  return globs.some((glob) =>
    anchored.includes(`/${glob.replace(/^\/+/, "").replace(/\*+$/, "")}`),
  );
}

function hasContent(value: string): boolean {
  return value.trim().length > 0;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow ad-hoc className string literals (including inside cn()/clsx() calls) outside primitive-boundary directories (Tier B, opt-in CDD)",
      url: `${DOCTRINE_URL}#no-ad-hoc-classnames`,
    },
    schema: [
      {
        type: "object",
        properties: {
          variantResolverNames: { type: "array", items: { type: "string" } },
          sanctionedDirs: { type: "array", items: { type: "string" } },
          scopeGlobs: { type: "array", items: { type: "string" } },
          chaseLocalConsts: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawLiteral:
        "Ad-hoc Tailwind class string authored outside a primitive directory. Arbitrary classes make a component's visual state space infinite and untestable — styling must be a finite, named state OWNED by a primitive so every state can be enumerated in stories/tests. Extend an existing primitive (add the missing variant/size/tone/state) or extract a new one under a sanctioned dir, then consume it via typed props. Doctrine: " +
        `${DOCTRINE_URL}#no-ad-hoc-classnames`,
      literalInResolver:
        "Class-string literal inside {{resolver}}(...) on a composing surface — wrapping an ad-hoc class pile in a resolver call does NOT sanction it; the state space is still infinite and untestable. Only variant-catalogue references (a cva() product, a VARIANT[x] map lookup) are sanctioned here. Move this styling into a primitive's variant and consume typed props. Doctrine: " +
        `${DOCTRINE_URL}#no-ad-hoc-classnames`,
      literalObjectKey:
        "clsx/cn object keys ARE class names — authoring them outside a primitive directory is ad-hoc styling with an unbounded, untestable state space. Express this as a named variant on the owning primitive. Doctrine: " +
        `${DOCTRINE_URL}#no-ad-hoc-classnames`,
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    const resolvers = options.variantResolverNames ?? [
      "cva",
      "cn",
      "clsx",
      "twMerge",
    ];
    const sanctionedDirs = options.sanctionedDirs ?? [
      "src/ui/",
      "src/components/ui/",
    ];
    const scopeGlobs = options.scopeGlobs ?? ["src/"];
    const chaseLocalConsts = options.chaseLocalConsts !== false;

    // Out of scope, or a primitive boundary that legitimately owns its
    // literals: do not police this file at all.
    if (!pathIncludesAny(context.filename, scopeGlobs)) return {};
    if (pathIncludesAny(context.filename, sanctionedDirs)) return {};

    function resolverName(callee: Expression | Node): string | null {
      if (callee.type === "Identifier" && resolvers.includes(callee.name))
        return callee.name;
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        resolvers.includes(callee.property.name)
      )
        return callee.property.name;
      return null;
    }

    function report(node: Node, messageId: string, resolver?: string): void {
      context.report({
        node: node as unknown as Rule.Node,
        messageId,
        data: resolver ? { resolver } : {},
      });
    }

    /** Resolve a same-file `const x = <init>` referenced by an identifier. */
    function constInitializer(idNode: Node & { name: string }): Node | null {
      let scope: Scope.Scope | null = context.sourceCode.getScope(
        idNode as unknown as Node,
      );
      while (scope) {
        const variable = scope.variables.find((v) => v.name === idNode.name);
        if (variable) {
          const def = variable.defs[0];
          if (
            def &&
            def.type === "Variable" &&
            def.node.type === "VariableDeclarator" &&
            def.node.init
          ) {
            return def.node.init as unknown as Node;
          }
          return null;
        }
        scope = scope.upper;
      }
      return null;
    }

    /**
     * Walk a className-reachable expression. `insideResolver` selects the
     * message (a bare literal vs one wrapped in cn()); `viaConst` prevents
     * infinite recursion through identifier chasing.
     */
    function walk(node: Node, insideResolver: string | null, viaConst: boolean): void {
      switch (node.type) {
        case "Literal":
          if (typeof node.value === "string" && hasContent(node.value))
            report(
              node,
              insideResolver ? "literalInResolver" : "rawLiteral",
              insideResolver ?? undefined,
            );
          return;
        case "TemplateLiteral":
          if (node.quasis.some((q) => hasContent(q.value.raw)))
            report(
              node,
              insideResolver ? "literalInResolver" : "rawLiteral",
              insideResolver ?? undefined,
            );
          for (const expr of node.expressions)
            walk(expr as unknown as Node, insideResolver, viaConst);
          return;
        case "CallExpression": {
          const name = resolverName(node.callee as Expression);
          if (name !== null)
            for (const arg of node.arguments)
              walk(arg as unknown as Node, name, viaConst);
          // Non-resolver calls (e.g. buttonVariants({variant})) are catalogue
          // references, not authored literals — allowed.
          return;
        }
        case "LogicalExpression":
          walk(node.left as unknown as Node, insideResolver, viaConst);
          walk(node.right as unknown as Node, insideResolver, viaConst);
          return;
        case "ConditionalExpression":
          walk(node.consequent as unknown as Node, insideResolver, viaConst);
          walk(node.alternate as unknown as Node, insideResolver, viaConst);
          return;
        case "ArrayExpression":
          for (const el of node.elements) {
            if (el === null) continue;
            if (el.type === "SpreadElement")
              walk((el as SpreadElement).argument as unknown as Node, insideResolver, viaConst);
            else walk(el as unknown as Node, insideResolver, viaConst);
          }
          return;
        case "ObjectExpression":
          // clsx/cn object form: string-literal keys ARE class names.
          for (const prop of node.properties) {
            if (prop.type !== "Property") continue;
            const key = (prop as Property).key;
            if (
              !(prop as Property).computed &&
              key.type === "Literal" &&
              typeof key.value === "string" &&
              hasContent(key.value)
            )
              report(key as unknown as Node, "literalObjectKey");
          }
          return;
        case "Identifier":
          // Chase a same-file `const x = "utilities"` used as className — the
          // module-scoped-const evasion. Bounded to one hop (viaConst guard).
          if (chaseLocalConsts && !viaConst) {
            const init = constInitializer(node as Node & { name: string });
            if (init) walk(init, insideResolver, true);
          }
          return;
        default:
          // MemberExpression (VARIANT[x]), props.*, etc. — catalogue
          // references, not authored literals. Allowed.
          return;
      }
    }

    return {
      JSXAttribute(node: JSXAttribute) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        )
          return;
        if (!node.value) return;

        if (node.value.type === "Literal") {
          walk(node.value as unknown as Node, null, false);
          return;
        }
        if (node.value.type === "JSXExpressionContainer") {
          const expr = node.value.expression;
          if (expr.type === "JSXEmptyExpression") return;
          walk(expr as unknown as Node, null, false);
        }
      },
    };
  },
};

export default rule;
