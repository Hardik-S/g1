import { describe, expect, it } from 'vitest';
import { generateAssessment } from '../../src/lib/assessments';
import { normalizeConfig } from '../../src/lib/config';

const config = normalizeConfig({
  cacheSizeBytes: 32,
  blockSizeBytes: 4,
  associativity: 2,
  addressBits: 8,
});

const trace = {
  name: 'seq',
  accesses: Array.from({ length: 32 }, (_, i) => ({ address: i, type: 'R' as const })),
};

describe('assessment generator', () => {
  it('is deterministic for the same config and trace', () => {
    const first = generateAssessment(config, trace, 3);
    const second = generateAssessment(config, trace, 3);
    expect(second).toEqual(first);
  });

  it('produces valid answer indices', () => {
    const questions = generateAssessment(config, trace, 5);
    questions.forEach((question) => {
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(question.choices.length);
    });
  });

  it('eventually yields all question types with seeded randomness', () => {
    const questions = generateAssessment(config, trace, 9);
    const types = new Set(questions.map((q) => q.type));
    expect(types).toEqual(new Set(['hit-predict', 'miss-classify', 'address-breakdown']));

    const breakdown = questions.find((q) => q.type === 'address-breakdown');
    expect(breakdown).toBeDefined();
    expect(breakdown?.choices[breakdown.answerIndex]).toMatch(/Tag/);
    expect(breakdown?.explanation).toContain('Offset');
  });
});
