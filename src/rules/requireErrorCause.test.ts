import { makeRuleTester } from '../testSupport/ruleTester.js';
import rule from './requireErrorCause.js';

const ruleTester = makeRuleTester();

ruleTester.run('require-error-cause', rule, {
  valid: [
    // Rethrow with { cause } threaded through the caught var — the sanctioned form.
    {
      code: 'try { doThing(); } catch (e) { throw new Error("lookup failed", { cause: e }); }\n',
    },
    // Custom error subclass in ~/core/errors.ts, cause supplied — must pass.
    {
      code: 'try { load(); } catch (err) { throw new ApiError("boom", { cause: err }); }\n',
    },
    // The options object need not be the 2nd arg: any ObjectExpression arg with
    // a `cause` property satisfies the rule (custom signatures vary).
    {
      code: 'try { load(); } catch (err) { throw new ValidationError("bad", 422, { cause: err }); }\n',
    },
    // A brand-new Error OUTSIDE any catch has no original context to preserve.
    {
      code: 'function fail() { throw new Error("nope"); }\n',
    },
    // Rethrowing the caught variable itself keeps the original — not a NewExpression.
    {
      code: 'try { doThing(); } catch (e) { throw e; }\n',
    },
    // Throwing a non-Error constructor from a catch is out of scope.
    {
      code: 'try { doThing(); } catch (e) { throw new CustomFailure("x"); }\n',
    },
    // A `new Error` with no cause but at the TOP LEVEL (no enclosing catch) —
    // the rule only polices throws inside a catch clause.
    {
      code: 'throw new Error("startup failed");\n',
    },
    // Member-expression callee (`ns.ApiError`) is NOT an Identifier, so the rule
    // does not reach into it. Documents the identifier-only limitation: this is a
    // known blind spot shared with the source rule (no type-awareness).
    {
      code: 'try { load(); } catch (err) { throw new errors.ApiError("boom"); }\n',
    },
    // cause supplied in a deeply-nested inner catch — the sanctioned form still
    // satisfies the rule at any catch depth.
    {
      code: 'try { a(); } catch (e) { try { b(); } catch (inner) { throw new Error("x", { cause: inner }); } }\n',
    },
  ],
  invalid: [
    // Built-in Error rethrown from a catch with no cause — the core bug.
    {
      code: 'try { doThing(); } catch (e) { throw new Error("lookup failed"); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // Another built-in error type, still no cause.
    {
      code: 'try { doThing(); } catch (e) { throw new TypeError("bad type"); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // Custom typed error (~/core/errors.ts) — previously whitelisted, now flagged.
    {
      code: 'try { load(); } catch (err) { throw new ApiError("boom"); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // An options object is present but carries no `cause` property.
    {
      code: 'try { load(); } catch (err) { throw new Error("boom", { code: 500 }); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // Nested catch: the inner throw is still inside a catch and must thread cause.
    {
      code: 'try { a(); } catch (e) { try { b(); } catch (inner) { throw new Error("inner"); } }\n',
      errors: [{ messageId: 'missing' }],
    },
    // Param-less catch (`catch { ... }`) still counts as being inside a catch —
    // the source rule pushes a null name but keeps enforcing.
    {
      code: 'try { doThing(); } catch { throw new Error("no param"); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // A `cause` key written as a STRING literal (`"cause"`) is not recognised —
    // the check only matches Identifier keys, so this is still flagged. Locks in
    // parity with the source rule (both treat only bare-identifier `cause`).
    {
      code: 'try { load(); } catch (err) { throw new Error("boom", { "cause": err }); }\n',
      errors: [{ messageId: 'missing' }],
    },
    // Custom typed error with an options object that omits `cause`.
    {
      code: 'try { load(); } catch (err) { throw new ValidationError("bad", 422, { field: "x" }); }\n',
      errors: [{ messageId: 'missing' }],
    },
  ],
});
