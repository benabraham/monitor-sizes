# CLAUDE.md

Guidance for Claude (and other AI coding agents) working in this repository.

## What this is

**Pixely a monitory**: an offline, installable, MIT-licensed PWA that answers _"how will
this display look and feel compared to the displays I know, from which distance, and at
which OS scale does it feel right?"_. It ports a Google Sheet (frozen in
`data/sheet-snapshot/`) to a static app on GitHub Pages under `/monitor-sizes/`.

## Read before working

| Document                                         | What it holds                                              |
| ------------------------------------------------ | ---------------------------------------------------------- |
| [`TODO.md`](./TODO.md)                           | **The task list. Keep it current (see below).**            |
| [`docs/PRD.md`](./docs/PRD.md)                   | Product requirements (F1–F23), calculation spec, decisions |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Module contract: layout, data model, exact signatures      |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | Setup, scripts, adding a built-in display                  |
| [`docs/I18N.md`](./docs/I18N.md)                 | Translations (en, cs), namespaces, formatting rules        |
| [`docs/STATE.md`](./docs/STATE.md)               | View state, URL format, persistence                        |
| [`docs/DESIGN.md`](./docs/DESIGN.md)             | Design tokens, UI primitives, accessibility                |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)     | CI, GitHub Pages deploy, one-time repo setup               |

## TODO.md — keep it up to date

`TODO.md` is the single source of truth for what is done and what is left.

- Use GitHub task-list syntax: `- [ ]` open, `- [x]` done. Nest sub-tasks by indenting two
  spaces under their parent.
- **Before starting** a piece of work, find it in `TODO.md` (add it if missing, under the
  right section, with sub-tasks if it has more than one step).
- **When finishing**, tick it off in the same commit as the work. Tick a parent only when
  all its children are ticked.
- Add follow-ups, bugs and ideas you discover as new unchecked items instead of leaving
  them in chat or code comments. Reference PRD requirement IDs (F1…F23) where relevant.
- Never delete finished items; they are the project history.

## Commands

```bash
pnpm install          # dependencies (Node 24, pnpm 10)
pnpm dev              # dev server
pnpm test             # unit + component tests (Vitest)
pnpm coverage         # tests with coverage thresholds
pnpm e2e              # Playwright e2e (builds + previews)
pnpm build            # production build into dist/
pnpm size             # JS bundle budget (< 50 kB gzipped)
pnpm format           # Prettier
pnpm check            # format check + coverage + build + size (run before pushing)
```

## Conventions (summary; details in ARCHITECTURE.md)

- Functional and declarative, **no classes**, arrow functions, template literals, **no
  semicolons**, single quotes.
- RORO (receive an object, return an object) for 2+ params; guard clauses first.
- Descriptive names with auxiliary verbs (`isComfortable`, `hasError`).
- Thorough JSDoc on every export; no TypeScript.
- Lowercase-dash file and directory names; tests colocated (`foo.js` → `foo.test.js`).
- TDD where practical. The sheet snapshot is the acceptance fixture for calculations.
- Canonical units: inches, scale factors (1.25). Convert only in `lib/format.js`.
- Baseline 2024 only: no CSS anchor positioning, no `interestfor`, no `field-sizing`.
- All user-visible text goes through `t()` with keys in both `en` and `cs`.
- Never include AI model identifiers in commits, PRs or code.
