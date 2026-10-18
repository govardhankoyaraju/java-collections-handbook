import type { Assessment } from './types.ts';
import { assessmentsM02 } from './assessments/m02.ts';
import { assessmentsM03 } from './assessments/m03.ts';
import { assessmentsM05 } from './assessments/m05.ts';
import { assessmentsM07 } from './assessments/m07.ts';

export const assessments: Assessment[] = [...assessmentsM02, ...assessmentsM03, ...assessmentsM05, ...assessmentsM07];

export const assessmentById = new Map(assessments.map((a) => [a.id, a]));
