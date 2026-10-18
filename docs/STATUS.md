# Build status

Last updated: 2026-10-18 (Milestone 1).

## Summary

| Area | Spec target | Done | Notes |
|---|---|---|---|
| Modules shown in Learn | 26 | 26 | Unwritten lessons appear as "Coming soon" with their plan |
| Published lessons (18 sections + knowledge check each) | 100+ | 15 | Modules 2, 3, 5 (partial), 7 (partial) |
| Planned lessons listed | — | 94 | |
| Assessments | per lesson | 15 | |
| Visualizations | many | 3 | ArrayList simulator, HashMap simulator, hierarchy explorer |
| API explorer | yes | partial | Complexity table + hierarchy explorer only |
| Comparison center | yes | no | |
| Decision assistant | yes | no | |
| Recipes | 50+ | 0 | |
| Case studies | 8 | 0 | |
| Interview prep | yes | no | |
| Search, progress, bookmarks, theme, export/import | yes | yes | |
| Java examples (Gradle, JUnit 5) | yes | yes | 87 tests; modules m02, m03, m05, m07 |
| JMH | yes | scaffold | 2 benchmarks; no results published by design |
| CI + Pages workflows | yes | yes | Written; not yet run on GitHub |

## Published lessons

- **Module 2 — Algorithmic Complexity (4/4):** Big O; average vs worst vs amortized; allocation, cache locality and pointer chasing; complexity of common collection operations.
- **Module 3 — Collections Framework Architecture (4/4):** hierarchy; contracts; Sequenced collections (Java 21+); why Map is not a Collection.
- **Module 5 — Lists (2):** ArrayList internals; ArrayList vs LinkedList.
- **Module 7 — Maps (5):** HashMap internals I–IV; LinkedHashMap and an LRU cache.

All other modules (1, 4, 6, 8–26) have no published lessons yet.

## Verification (sandbox, Linux aarch64)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` (0 warnings allowed) | Pass |
| `npm test` (Vitest) | Pass, all suites (see commit) |
| `npm run validate:content` | Pass: 26 modules, 15 lessons, 0 errors |
| `npm run build` | Pass |
| `scripts/check-java-compat.mjs` | Pass: each lesson compiles at its stated `--release` |
| `scripts/run-examples-on-jdk.sh` (JDK 21 vs 25) | Pass: 20 deterministic examples byte-identical |
| `./gradlew build` | Pass, 87 tests |
| Playwright e2e | **Not run.** No usable browser on Linux arm64 sandbox; runs in CI (`e2e` job) |

## Known limitations

- Playwright smoke tests (`website/e2e/`) are written but unverified until CI runs.
- Workflows have not executed on GitHub yet.
- JMH numbers are deliberately not shown on the site; run `./gradlew jmh` yourself.
- Simulators are educational models, tested against values from a real JDK 25, not the JDK itself.

## Next phases

1. Module 1 (fundamentals), Module 4 (generics), Modules 6, 8, 9 (sets, queues, specialized).
2. Remaining lessons in Modules 5 and 7 (CopyOnWriteArrayList, TreeMap, EnumMap, WeakHashMap, IdentityHashMap…).
3. Modules 10–26, recipes, comparison center, decision assistant, case studies, interview prep.
