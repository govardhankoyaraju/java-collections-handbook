/**
 * Content schema (spec §17). Navigation, module pages, search and the Practice/Reference
 * listings are all generated from these objects — there is no hand-maintained navigation.
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'architect';

export interface Level {
  id: number;
  title: string;
  summary: string;
}

export interface JavaVersionInfo {
  /** Lowest Java release the lesson's runnable examples compile on (checked by scripts/check-java-compat.sh). */
  min: 17 | 21 | 25;
  /** The handbook's primary reference release. */
  reference: 25;
  note?: string;
}

/** A runnable example in java-examples/src/main/java/dev/handbook/<id>.java, e.g. "m07/HashMapIndexing". */
export type ExampleRef = string;

export interface PublishedLesson {
  status: 'published';
  id: string;
  slug: string;
  title: string;
  moduleId: string;
  difficulty: Difficulty;
  description: string;
  objectives: string[];
  /** Lesson ids. */
  prerequisites: string[];
  javaVersion: JavaVersionInfo;
  readingMinutes: number;
  keywords: string[];
  /** Lesson ids. */
  related: string[];
  examples: ExampleRef[];
  /** Benchmarks in java-examples/src/jmh (compiled in CI, never run, no published numbers). */
  benchmarks?: string[];
  /** Key into content/assessments.ts. */
  assessmentId: string;
  /** Markdown body, relative to website/content/. */
  contentPath: string;
}

export interface PlannedLesson {
  status: 'planned';
  title: string;
}

export type Lesson = PublishedLesson | PlannedLesson;

export interface Module {
  id: string;
  number: number;
  slug: string;
  title: string;
  level: number;
  summary: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  /** Optional code shown with the question (Java excerpt). */
  code?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Assessment {
  id: string;
  lessonId: string;
  /** Fraction of correct answers needed to pass, e.g. 0.8. */
  passRatio: number;
  questions: QuizQuestion[];
}

export const SECTION_TITLES = [
  'Learning Objectives',
  'The Problem',
  'Beginner-Friendly Explanation',
  'Detailed Technical Explanation',
  'Internal Implementation',
  'Memory Representation',
  'Runnable Java Example',
  'Execution Walkthrough',
  'Complexity Analysis',
  'Incorrect Implementation',
  'Correct Implementation',
  'Enterprise Use Case',
  'Alternatives and Trade-offs',
  'Edge Cases',
  'Interview Questions',
  'Practice Exercise',
  'Key Takeaways',
  'Official References',
] as const;
