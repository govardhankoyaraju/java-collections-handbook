#!/usr/bin/env node
/**
 * Validates curriculum metadata, lesson bodies, assessments and internal links.
 *
 *   node scripts/validate-content.mjs          (from the repository root, Node >= 22.18 for TS type stripping)
 *
 * Exits with status 1 if any ERROR is found. WARNINGs are printed but do not fail the run.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const website = join(root, 'website');
const javaMain = join(root, 'java-examples/src/main/java/dev/handbook');
const jmhDir = join(root, 'java-examples/src/jmh/java/dev/handbook/jmh');

const { modules, levels } = await import(join(website, 'content/curriculum.ts'));
const { assessments } = await import(join(website, 'content/assessments.ts'));
const { SECTION_TITLES } = await import(join(website, 'content/types.ts'));
const { staticPages } = await import(join(website, 'src/app/staticPages.ts'));
const { hierarchy } = await import(join(website, 'src/visualizations/hierarchy/data.ts'));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const VIZ_IDS = new Set(['arraylist', 'hashmap', 'hierarchy']);
const FORBIDDEN = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder)\b/i;

// ---------------------------------------------------------------- modules
if (modules.length !== 26) err(`Expected 26 modules, found ${modules.length}`);
const levelIds = new Set(levels.map((l) => l.id));
const moduleSlugs = new Set();
modules.forEach((m, i) => {
  if (m.number !== i + 1) err(`Module ${m.id}: number ${m.number} out of sequence (expected ${i + 1})`);
  if (m.id !== `m${String(m.number).padStart(2, '0')}`) err(`Module ${m.id}: id does not match number ${m.number}`);
  if (moduleSlugs.has(m.slug)) err(`Duplicate module slug ${m.slug}`);
  moduleSlugs.add(m.slug);
  if (!levelIds.has(m.level)) err(`Module ${m.id}: unknown level ${m.level}`);
  if (!m.title || !m.summary) err(`Module ${m.id}: missing title or summary`);
  if (m.lessons.length === 0) err(`Module ${m.id}: no lessons (published or planned)`);
});

// ---------------------------------------------------------------- lessons
const published = modules.flatMap((m) => m.lessons.filter((l) => l.status === 'published').map((l) => ({ ...l, module: m })));
const order = new Map(published.map((l, i) => [l.id, i]));
const lessonIds = new Set();
const routes = new Set(['/', '/learn', ...staticPages.map((p) => p.path)]);
modules.forEach((m) => routes.add(`/learn/${m.slug}`));

for (const l of published) {
  const where = `Lesson ${l.id}`;
  if (lessonIds.has(l.id)) err(`${where}: duplicate id`);
  lessonIds.add(l.id);
  if (l.moduleId !== l.module.id) err(`${where}: moduleId ${l.moduleId} but listed under ${l.module.id}`);
  if (!l.id.startsWith(`${l.module.id}-`)) err(`${where}: id should start with "${l.module.id}-"`);
  const siblings = l.module.lessons.filter((x) => x.status === 'published' && x.slug === l.slug);
  if (siblings.length > 1) err(`${where}: duplicate slug ${l.slug} in module ${l.module.id}`);
  for (const f of ['title', 'description', 'difficulty', 'contentPath', 'assessmentId', 'slug']) if (!l[f]) err(`${where}: missing ${f}`);
  if (!/^[a-z0-9-]+$/.test(l.slug)) err(`${where}: slug "${l.slug}" must be kebab-case`);
  if ((l.objectives ?? []).length < 3) err(`${where}: needs at least 3 learning objectives`);
  if ((l.keywords ?? []).length < 3) err(`${where}: needs at least 3 keywords`);
  if (!(l.readingMinutes > 0)) err(`${where}: readingMinutes must be positive`);
  if (![17, 21, 25].includes(l.javaVersion?.min) || l.javaVersion?.reference !== 25) err(`${where}: invalid javaVersion`);
  if ((l.examples ?? []).length === 0) err(`${where}: no runnable examples`);
  routes.add(`/learn/${l.module.slug}/${l.slug}`);
}

for (const l of published) {
  const where = `Lesson ${l.id}`;
  for (const p of l.prerequisites) {
    if (!lessonIds.has(p)) err(`${where}: prerequisite ${p} is not a published lesson`);
    else if (order.get(p) >= order.get(l.id)) err(`${where}: prerequisite ${p} comes later in the curriculum`);
  }
  for (const r of l.related) {
    if (!lessonIds.has(r)) err(`${where}: related lesson ${r} is not a published lesson`);
    if (r === l.id) err(`${where}: related to itself`);
  }
  for (const ex of l.examples) {
    if (!existsSync(join(javaMain, `${ex}.java`))) err(`${where}: example ${ex} not found in java-examples`);
  }
  for (const b of l.benchmarks ?? []) {
    if (!existsSync(join(jmhDir, `${b}.java`))) err(`${where}: benchmark ${b} not found in src/jmh`);
  }
}

// ---------------------------------------------------------------- lesson bodies
const linkRe = /\]\((\/[^)\s#?]*)(?:[?#][^)]*)?\)/g;
for (const l of published) {
  const where = `Lesson ${l.id} (${l.contentPath})`;
  const file = join(website, 'content', l.contentPath);
  if (!existsSync(file)) {
    err(`${where}: body file missing`);
    continue;
  }
  const md = readFileSync(file, 'utf8');
  const lines = md.split('\n');
  let inFence = false;
  const headings = [];
  const fences = [];
  let currentFence = null;
  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (!inFence) currentFence = { lang: line.slice(3).trim().split(/\s+/)[0], body: [], line: i + 1 };
      else fences.push(currentFence);
      inFence = !inFence;
      return;
    }
    if (inFence) currentFence.body.push(line);
    else if (line.startsWith('## ')) headings.push({ text: line.slice(3).trim(), line: i + 1 });
    else if (line.startsWith('# ')) err(`${where}:${i + 1}: H1 not allowed (the page renders the title)`);
  });
  if (inFence) err(`${where}: unterminated code fence`);

  const expected = SECTION_TITLES.map((t, i) => `${i + 1}. ${t}`);
  const actual = headings.map((h) => h.text);
  if (actual.length !== expected.length || actual.some((h, i) => h !== expected[i])) {
    err(`${where}: sections must be exactly the 18 standard headings in order.\n    expected: ${expected.join(' | ')}\n    actual:   ${actual.join(' | ')}`);
  }
  // each section must contain content
  headings.forEach((h, i) => {
    const end = i + 1 < headings.length ? headings[i + 1].line - 1 : lines.length;
    const raw = lines.slice(h.line, end).join('\n');
    const embedsExample = /```example\n\s*\S/.test(raw);
    if (raw.replace(/\s+/g, '').length < 40 && !embedsExample) err(`${where}: section "${h.text}" is (almost) empty`);
  });

  if (!fences.some((f) => f.lang === 'objectives')) err(`${where}: section 1 must contain an \`\`\`objectives block`);
  const referencedExamples = fences.filter((f) => f.lang === 'example').flatMap((f) => f.body.map((s) => s.trim()).filter(Boolean));
  for (const ex of referencedExamples) if (!l.examples.includes(ex)) err(`${where}: body embeds example ${ex} not listed in metadata`);
  for (const ex of l.examples) if (!referencedExamples.includes(ex)) err(`${where}: metadata example ${ex} is not embedded in the body`);
  for (const f of fences.filter((x) => x.lang === 'viz')) {
    const id = f.body.join('').trim();
    if (!VIZ_IDS.has(id)) err(`${where}:${f.line}: unknown visualization "${id}"`);
  }
  if (FORBIDDEN.test(md)) err(`${where}: contains placeholder text (${md.match(FORBIDDEN)[0]})`);

  for (const m of md.matchAll(linkRe)) {
    const path = m[1].replace(/\/$/, '') || '/';
    if (!routes.has(path)) err(`${where}: broken internal link ${m[1]}`);
  }

  // reading time sanity check: prose at ~200 words/min, code (including embedded examples) at ~100 words/min
  const estimate = estimateReadingMinutes(md, l.examples);
  if (Math.abs(estimate - l.readingMinutes) / l.readingMinutes > 0.3) {
    err(`${where}: readingMinutes ${l.readingMinutes} differs by more than 30% from the estimate ${estimate}`);
  }
}

export function estimateReadingMinutes(md, examples) {
  let prose = 0;
  let code = 0;
  let fence = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('```')) fence = !fence;
    else if (fence) code += line.split(/\s+/).filter(Boolean).length;
    else prose += line.split(/\s+/).filter(Boolean).length;
  }
  for (const ex of examples) {
    const f = join(javaMain, `${ex}.java`);
    if (existsSync(f)) code += readFileSync(f, 'utf8').split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(prose / 200 + code / 100));
}

// ---------------------------------------------------------------- orphan bodies
const contentDir = join(website, 'content');
const usedBodies = new Set(published.map((l) => l.contentPath));
for (const dir of readdirSync(contentDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const f of readdirSync(join(contentDir, dir.name)).filter((x) => x.endsWith('.md'))) {
    if (!usedBodies.has(`${dir.name}/${f}`)) err(`Orphan lesson body content/${dir.name}/${f} (not referenced by any published lesson)`);
  }
}

// ---------------------------------------------------------------- assessments
const assessmentIds = new Set();
for (const a of assessments) {
  if (assessmentIds.has(a.id)) err(`Duplicate assessment ${a.id}`);
  assessmentIds.add(a.id);
  const lesson = published.find((l) => l.id === a.lessonId);
  if (!lesson) err(`Assessment ${a.id}: lesson ${a.lessonId} not published`);
  else if (lesson.assessmentId !== a.id) err(`Assessment ${a.id}: lesson ${a.lessonId} points to ${lesson.assessmentId}`);
  if (!(a.passRatio > 0 && a.passRatio <= 1)) err(`Assessment ${a.id}: passRatio must be in (0, 1]`);
  if (a.questions.length < 3) err(`Assessment ${a.id}: needs at least 3 questions`);
  const qids = new Set();
  for (const q of a.questions) {
    if (qids.has(q.id)) err(`Assessment ${a.id}: duplicate question id ${q.id}`);
    qids.add(q.id);
    if (q.options.length < 2) err(`Assessment ${a.id}/${q.id}: needs at least 2 options`);
    if (!(q.answerIndex >= 0 && q.answerIndex < q.options.length)) err(`Assessment ${a.id}/${q.id}: answerIndex out of range`);
    if (new Set(q.options).size !== q.options.length) err(`Assessment ${a.id}/${q.id}: duplicate options`);
    if (!q.explanation) err(`Assessment ${a.id}/${q.id}: missing explanation`);
  }
}
for (const l of published) if (!assessmentIds.has(l.assessmentId)) err(`Lesson ${l.id}: assessment ${l.assessmentId} does not exist`);

// ---------------------------------------------------------------- hierarchy explorer data
const nodeIds = new Set(hierarchy.map((n) => n.id));
for (const n of hierarchy) {
  if (n.primaryParent && !nodeIds.has(n.primaryParent)) err(`Hierarchy ${n.id}: unknown primaryParent ${n.primaryParent}`);
  if (n.primaryParent && !n.supertypes.includes(n.primaryParent)) err(`Hierarchy ${n.id}: primaryParent must be one of its supertypes`);
  if (n.lesson && !lessonIds.has(n.lesson)) err(`Hierarchy ${n.id}: links to unpublished lesson ${n.lesson}`);
}

// ---------------------------------------------------------------- report
const plannedCount = modules.reduce((n, m) => n + m.lessons.filter((l) => l.status === 'planned').length, 0);
for (const w of warnings) console.warn(`WARNING ${w}`);
for (const e of errors) console.error(`ERROR   ${e}`);
console.log(
  `\nContent validation: ${modules.length} modules, ${published.length} published lessons, ${plannedCount} planned lessons, ` +
    `${assessments.length} assessments, ${routes.size} internal routes checked — ${errors.length} error(s), ${warnings.length} warning(s).`,
);
process.exit(errors.length ? 1 : 0);
