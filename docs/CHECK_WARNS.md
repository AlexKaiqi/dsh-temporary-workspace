# Plugin check warns

`plugin check --root .` reports zero errors. The single remaining warn is
accepted, with a reason. Per the workbench's D-004, a heuristic warn needs review
and an explanation — not a code change that games the scan.

Re-audit this file whenever the rule set version changes.

## CAND-001 — 未声明可脚本化 CLI 入口

**Accepted, does not apply.** This is a candidate rule, `warn` by design and
statistical while it is being evaluated.

The plugin has exactly three operations — `reserve`, `keep`, `discard` — and they
are reachable only over the Typert Remote seam, by the plugin's own Client half
reacting to a sidebar action. There is deliberately no path-taking interface: the
opaque reservation id **is** the containment boundary
(`packages/plugin/spec/remote-protocol.json`, `capabilitySecurity`).

A CLI would have to accept something a caller can type, which reintroduces
exactly the caller-supplied-path surface the design removes. Directory cleanup
for an operator is already `rm` on a path they chose themselves.

## Notes on rules that now pass for the right reason

- **SEC-001** had no permission-boundary coverage. `reservations.spec.ts` now
  asserts that eight caller-supplied path shapes — including an absolute path,
  `/`, `../../etc/passwd`, and a root-relative `../..` — are all refused, that a
  symlink planted in the reservation root is not traversed by the sweep, that
  every reservation's canonical path stays under the configured root, and that
  the root is created `0700`.
- **CFG-002** previously could not see the single-root invariant, because path
  derivation happened inside `reservations.ts` while only `root` was declared.
  `src/config.ts` now owns `resolveReservationRoot` and
  `resolveReservationRetentionMs`, both asserted directly — including that a
  relative root resolves to absolute and that a zero or negative retention is
  raised to the safety floor.
- Keeping those resolvers out of `src/index.ts` is also what lets them be tested
  without loading the `@Remote`-decorated service class.
