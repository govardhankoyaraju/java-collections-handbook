# Java Collections & Utilities Handbook

A learning site for the Java Collections Framework and core Java utilities, from beginner to architect, plus a runnable Gradle project with every lesson's examples and tests.

**Status: Milestone 1 of a multi-phase build.** 15 of the planned ~109 lessons are published. See [docs/STATUS.md](docs/STATUS.md) for the exact coverage matrix.

Live site (after Pages is enabled): https://govardhankoyaraju.github.io/java-collections-handbook/

## Repository layout

| Path | What it is |
|---|---|
| `website/` | React 19 + TypeScript + Vite + Tailwind 4 static site (HashRouter, base path `/java-collections-handbook/`) |
| `website/content/` | Metadata-driven curriculum (`curriculum.ts`), lesson Markdown, assessments |
| `java-examples/` | Gradle 9.1 project, Java 25 toolchain, JUnit 5 tests, JMH benchmark scaffold |
| `scripts/` | Content validator, Java `--release` compatibility check, cross-JDK output check |
| `.github/workflows/` | `ci.yml` (checks) and `deploy.yml` (GitHub Pages) |

## Run locally

Requirements: Node 22+, JDK 25 (JDK 17/21 for compatibility checks).

```bash
cd website
npm ci
npm run dev            # http://localhost:5173/java-collections-handbook/
npm run check          # typecheck, lint, vitest, content validation, build
npm run e2e            # Playwright smoke tests (installs needed: npx playwright install chromium)

cd ../java-examples
./gradlew build        # compiles and runs the JUnit suite
./gradlew jmh          # runs the JMH benchmarks on YOUR machine (no numbers are published in the site)
```

## Deploying

1. Push to `main`.
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow builds `website/` and publishes it.

## Content principles

- Java 25 is primary; each lesson states its minimum Java version (17 or 21), checked by `scripts/check-java-compat.mjs`.
- API contracts (Javadoc guarantees) are separated from JDK implementation details.
- No fabricated benchmarks or JVM output. Simulators are labelled educational models; example output shown in lessons comes from the test-verified Java sources.
