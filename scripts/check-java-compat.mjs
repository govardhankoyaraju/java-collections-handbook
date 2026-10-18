#!/usr/bin/env node
/**
 * Proves each lesson's documented minimum Java version: compiles the lesson's runnable examples
 * (and anything they reference) with `javac --release <javaVersion.min>`.
 *
 *   node scripts/check-java-compat.mjs        (needs a JDK >= 21 on PATH or in JAVA_HOME; JDK 25 recommended)
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'java-examples/src/main/java');
const { modules } = await import(join(root, 'website/content/curriculum.ts'));
const javac = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'javac') : 'javac';

let failures = 0;
for (const lesson of modules.flatMap((m) => m.lessons).filter((l) => l.status === 'published')) {
  const release = String(lesson.javaVersion.min);
  const files = lesson.examples.map((e) => join(src, 'dev/handbook', `${e}.java`));
  const out = mkdtempSync(join(tmpdir(), 'compat-'));
  try {
    execFileSync(javac, ['--release', release, '-Xlint:all', '-Werror', '-Xlint:-options', '-sourcepath', src, '-d', out, ...files], { stdio: 'pipe' });
    console.log(`ok    Java ${release}+  ${lesson.id} (${lesson.examples.join(', ')})`);
  } catch (e) {
    failures++;
    console.error(`FAIL  Java ${release}+  ${lesson.id}\n${e.stderr?.toString() ?? e.message}`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
console.log(failures ? `\n${failures} lesson(s) do not compile on their documented minimum release.` : '\nAll lessons compile on their documented minimum Java release.');
process.exit(failures ? 1 : 0);
