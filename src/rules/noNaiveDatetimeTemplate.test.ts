import { makeRuleTester } from "../testSupport/ruleTester.js";
import rule from "./noNaiveDatetimeTemplate.js";

const ruleTester = makeRuleTester();

// Ported from CounselBook's no-naive-datetime-template.test.js (Plan 00107
// BUG-A) — same fixtures, same expected outcomes.
ruleTester.run("no-naive-datetime-template", rule, {
  valid: [
    // Plain string literal (not a template literal) — the deliberate test
    // fixture constant. Never flagged: this rule targets TemplateLiteral
    // nodes only.
    'const startsAt = "2020-01-01T10:00:00+00:00";',
    // The sanctioned helper call — no template literal involved.
    "const startsAt = toPracticeLocalIso(dateStr, timeStr, timezone);",
    // The CORRECT template shape: the offset is a DYNAMIC expression
    // immediately after `:00`, not a static/hardcoded suffix — exactly what
    // an offset-computing helper builds internally.
    "const startsAt = `${dateStr}T${timeStr}:00${offset}`;",
    // Unrelated template literals — URLs and paths — carry a `T` and digits
    // that don't form the `T…:00` datetime boundary.
    "const url = `https://api.example.com/practices/${slug}/bookings`;",
    "const path = `/api/v1/tokens/${id}`;",
    "const endpoint = `${baseUrl}:${port}/health`;",
    // A `T` boundary with no `:00` seconds marker at all — a bare date+time
    // with no seconds component.
    "const naive = `${dateStr}T${timeStr}`;",
    // `:00` present but with no `T` boundary preceding it — unrelated to a
    // datetime construction.
    "const duration = `${minutes}:00`;",
  ],
  invalid: [
    {
      // BUG-A naive form: no offset at all — rejected by a strict RFC 3339
      // API (422), or parsed in the reader's local timezone at runtime.
      code: "const startsAt = `${dateStr}T${timeStr}:00`;",
      errors: [{ messageId: "naiveDatetimeTemplate" }],
    },
    {
      // BUG-A hardcoded-offset form: a STATIC `+00:00` — wrong whenever the
      // subject isn't observing UTC (BST/DST).
      code: "const startsAt = `${dateStr}T${timeStr}:00+00:00`;",
      errors: [{ messageId: "naiveDatetimeTemplate" }],
    },
    {
      // Same bug class with the `Z` (UTC) shorthand offset, hardcoded.
      code: "const startsAt = `${dateStr}T${timeStr}:00Z`;",
      errors: [{ messageId: "naiveDatetimeTemplate" }],
    },
    {
      // Test-helper variant: hardcoded UTC offset built directly in a
      // fixture, not just application code.
      code: "const slot = `${date}T${slotTime}:00+00:00`;",
      errors: [{ messageId: "naiveDatetimeTemplate" }],
    },
  ],
});
