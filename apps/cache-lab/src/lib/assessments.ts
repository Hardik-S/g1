import { CacheConfig, Trace } from './types';
import { SeededRNG } from './prng';
import { simulateCache } from './cacheSimulator';
import { splitAddress, addressBreakdown } from './config';

export type QuestionType = 'hit-predict' | 'miss-classify' | 'address-breakdown';

export interface Question {
  id: number;
  type: QuestionType;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export function generateAssessment(config: CacheConfig, trace: Trace, count = 5): Question[] {
  const rng = new SeededRNG(42);
  const sim = simulateCache(trace.accesses, config, { classifyMisses: true });
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng.nextInt(3);
    if (roll === 0) {
      const accessIndex = rng.nextInt(trace.accesses.length);
      const outcome = sim.perAccess[accessIndex];
      const prompt = `Access #${accessIndex + 1} to address 0x${trace.accesses[accessIndex].address.toString(16)} — Hit or miss?`;
      questions.push({
        id: i,
        type: 'hit-predict',
        prompt,
        choices: ['Hit', 'Miss'],
        answerIndex: outcome.hit ? 0 : 1,
        explanation: outcome.hit
          ? 'Line already resident in the indexed set with matching tag.'
          : `Tag ${outcome.tag} not found in set ${outcome.setIndex}.`,
      });
      continue;
    }

    if (roll === 1) {
      const misses = sim.perAccess
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => !entry.hit && entry.missType);
      if (misses.length === 0) {
        i -= 1;
        continue;
      }
      const miss = misses[rng.nextInt(misses.length)];
      questions.push({
        id: i,
        type: 'miss-classify',
        prompt: `Classify miss at access #${miss.index + 1} (set ${miss.entry.setIndex}).`,
        choices: ['Compulsory', 'Conflict', 'Capacity'],
        answerIndex:
          miss.entry.missType === 'compulsory'
            ? 0
            : miss.entry.missType === 'conflict'
            ? 1
            : 2,
        explanation: `Determined via three-run method: ${miss.entry.missType} miss.`,
      });
      continue;
    }

    const accessIndex = rng.nextInt(trace.accesses.length);
    const access = trace.accesses[accessIndex];
    const breakdown = addressBreakdown(config);
    const { setIndex, tag, offset } = splitAddress(access.address, config);
    questions.push({
      id: i,
      type: 'address-breakdown',
      prompt: `Address 0x${access.address.toString(16)} — identify tag/index/offset bits (address bits ${config.addressBits}).`,
      choices: [
        `Tag ${tag} / Index ${setIndex} / Offset ${offset}`,
        `Tag ${setIndex} / Index ${tag} / Offset ${offset}`,
        `Tag ${tag} / Index ${offset} / Offset ${setIndex}`,
      ],
      answerIndex: 0,
      explanation: `Offset ${breakdown.offsetBits} bits, index ${breakdown.indexBits} bits, remaining tag bits (${breakdown.tagBits}).`,
    });
  }

  return questions;
}
