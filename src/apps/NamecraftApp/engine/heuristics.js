import { ensureId } from '../utils/identity.js';

export const WEIGHTS = {
  GoalAlignment: 30,
  Discriminability: 20,
  Imitation: 15,
  Transparency: 15,
  Pronounceability: 10,
  Robustness: 10,
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'into',
  'your',
  'their',
  'about',
  'while',
  'should',
  'must',
  'under',
  'into',
  'across',
]);

const COMMON_LAB_NAMES = ['lingualab', 'sonoritylab', 'phonolab', 'linglab', 'lingualink'];
const COMMERCIAL_EQUIPMENT = ['zoom', 'tascam', 'sony', 'olympus', 'marantz'];
const BASE_VOWELS = /[aeiouy]/i;
const DICTIONARY_MORPHEMES = [
  'ling',
  'gloss',
  'phon',
  'field',
  'lab',
  'son',
  'tone',
  'voice',
  'aero',
  'vowel',
  'atlas',
  'archive',
  'story',
  'cohort',
  'signal',
  'reson',
  'acoustic',
  'glossa',
  'collective',
];

const tokenize = (input = '') => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
};

const uniqueTokens = (tokens) => Array.from(new Set(tokens));

const intersection = (a, b) => {
  const setB = new Set(b);
  return a.filter((token) => setB.has(token));
};

const levenshtein = (a = '', b = '') => {
  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(matrix[j - 1][i], matrix[j][i - 1], matrix[j - 1][i - 1]) + 1;
      }
    }
  }
  return matrix[b.length][a.length];
};

const vowelRatio = (value) => {
  const cleaned = value.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  const vowels = cleaned.split('').filter((char) => BASE_VOWELS.test(char));
  return vowels.length / cleaned.length;
};

const hasHeavyCluster = (value) => /[^aeiouy]{4,}/i.test(value);

const charDiversity = (value) => {
  const cleaned = value.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  return new Set(cleaned).size / cleaned.length;
};

const scenarioKeywords = (room) => {
  const combined = room.scenarios.flatMap((scenario) => [
    ...tokenize(scenario.title),
    ...tokenize(scenario.goal),
    ...tokenize(scenario.stressTest),
    ...tokenize(scenario.riskNotes),
  ]);
  return uniqueTokens(combined);
};

const candidateTokens = (candidate) => {
  return uniqueTokens([
    ...tokenize(candidate.label),
    ...tokenize(candidate.meaning),
    ...tokenize(candidate.phonetics),
    ...(candidate.tags || []),
  ]);
};

const buildHeuristics = (room, candidate, dataset) => [
  {
    id: 'GoalAlignment',
    label: 'Goal Alignment',
    weight: WEIGHTS.GoalAlignment,
    evaluate: () => {
      // Threshold: require >=40% overlap with declared goals to avoid spurious matches.
      const tokens = candidateTokens(candidate);
      const shared = intersection(tokens, dataset.goalTokens);
      const coverage = dataset.goalTokens.length
        ? shared.length / dataset.goalTokens.length
        : tokens.length
        ? 0.4
        : 0;
      const score = Math.min(100, 40 + coverage * 60);
      const summary = shared.length
        ? `Shares ${shared.length} critical cue${shared.length > 1 ? 's' : ''}: ${shared.join(', ')}`
        : 'No overlaps with declared goals yet; expand meaning statement.';
      const diagnostic = coverage < 0.4
        ? 'Meaning statement is under-aligned with scenario goals (<40% keyword overlap).'
        : null;
      return { score, summary, diagnostic };
    },
  },
  {
    id: 'Discriminability',
    label: 'Discriminability',
    weight: WEIGHTS.Discriminability,
    evaluate: () => {
      // Threshold: minimum Levenshtein distance of 3 against cohort names avoids confusion during field ops.
      const others = room.names.filter((entry) => entry.id !== candidate.id);
      const cleanLabel = candidate.label.toLowerCase();
      const distances = others.map((entry) => levenshtein(cleanLabel, entry.label.toLowerCase()));
      const minDistance = distances.length ? Math.min(...distances) : 6;
      const clusterPenalty = hasHeavyCluster(candidate.label) ? 15 : 0;
      const base = minDistance >= 5 ? 92 : minDistance >= 3 ? 78 : 56;
      const diversityBonus = charDiversity(candidate.label) * 18;
      const score = Math.max(0, Math.min(100, base + diversityBonus - clusterPenalty));
      const summary = `Nearest cohort distance ${minDistance}; cluster penalty ${clusterPenalty ? 'applied' : 'clear'}.`;
      const diagnostic =
        minDistance < 3
          ? 'Too close to an existing candidate (<3 edit distance).'
          : clusterPenalty
          ? 'Contains a 4+ consonant cluster which risks oral articulation slip-ups.'
          : null;
      return { score, summary, diagnostic };
    },
  },
  {
    id: 'Imitation',
    label: 'Imitation Risk',
    weight: WEIGHTS.Imitation,
    evaluate: () => {
      // Threshold: maintain >=4 edit distance from common labs/brands to preserve originality.
      const cleanLabel = candidate.label.toLowerCase();
      const catalogue = [...COMMON_LAB_NAMES, ...COMMERCIAL_EQUIPMENT];
      const distances = catalogue.map((entry) => levenshtein(cleanLabel, entry));
      const minDistance = Math.min(...distances);
      const score = minDistance >= 6 ? 95 : minDistance >= 3 ? 78 : 52;
      const summary = `Closest known label distance: ${minDistance}.`;
      const diagnostic =
        minDistance < 3
          ? 'Name imitates an existing lab or device (<4 edit distance).'
          : null;
      return { score, summary, diagnostic };
    },
  },
  {
    id: 'Transparency',
    label: 'Transparency',
    weight: WEIGHTS.Transparency,
    evaluate: () => {
      // Threshold: include >=2 descriptive morphemes for quick faculty recall.
      const tokens = candidateTokens(candidate);
      const hits = intersection(tokens, DICTIONARY_MORPHEMES);
      const ratio = hits.length / Math.max(1, tokens.length);
      const score = Math.min(100, 45 + hits.length * 18 + ratio * 20);
      const summary = hits.length
        ? `Descriptive morphemes: ${hits.join(', ')}`
        : 'Add explicit morphemes tied to phonetic work to aid transparency.';
      const diagnostic = hits.length >= 2 ? null : 'Needs ≥2 descriptive morphemes for faculty clarity.';
      return { score, summary, diagnostic };
    },
  },
  {
    id: 'Pronounceability',
    label: 'Pronounceability',
    weight: WEIGHTS.Pronounceability,
    evaluate: () => {
      // Threshold: vowel ratio between 0.35 and 0.65 keeps articulation stable across dialects.
      const ratio = vowelRatio(candidate.label);
      let score = 88;
      let diagnostic = null;
      if (ratio < 0.32 || ratio > 0.68) {
        score -= 24;
        diagnostic = 'Vowel/consonant ratio drifts outside the 0.35–0.65 comfort band.';
      }
      if (hasHeavyCluster(candidate.label)) {
        score -= 18;
        diagnostic =
          diagnostic || 'Contains a 4+ consonant cluster which complicates L2 pronunciation.';
      }
      const summary = `Vowel ratio ${ratio.toFixed(2)}; clusters ${hasHeavyCluster(candidate.label) ? 'present' : 'controlled'}.`;
      return { score: Math.max(0, Math.min(100, score)), summary, diagnostic };
    },
  },
  {
    id: 'Robustness',
    label: 'Robustness',
    weight: WEIGHTS.Robustness,
    evaluate: () => {
      // Threshold: maintain ≥50% character diversity and <=12 character length for labels to survive field kit constraints.
      const diversity = charDiversity(candidate.label);
      const length = candidate.label.replace(/[^a-z]/gi, '').length;
      const baseline = 60 + diversity * 28;
      const lengthPenalty = length > 12 ? 18 : length < 4 ? 12 : 0;
      const stressMatches = candidateTokens(candidate).filter((token) =>
        COMMERCIAL_EQUIPMENT.includes(token)
      );
      const stressPenalty = stressMatches.length ? 12 : 0;
      const score = Math.max(0, Math.min(100, baseline - lengthPenalty - stressPenalty));
      const summary = `Diversity ${(diversity * 100).toFixed(0)}%; length ${length} chars.`;
      const diagnostic =
        diversity < 0.5
          ? 'Increase phoneme variety to avoid confusion in low-light labeling.'
          : lengthPenalty
          ? 'Keep label between 4 and 12 characters for kit legibility.'
          : stressPenalty
          ? 'Risks conflict with disallowed device naming (Zoom/Tascam/Sony).'
          : null;
      return { score, summary, diagnostic };
    },
  },
];

const buildRubric = (total, heuristicsResults) => {
  if (total >= 85) {
    return {
      level: 'green',
      summary: 'Ready for pilot usage pending faculty sign-off.',
      refinements: heuristicsResults
        .filter((item) => item.diagnostic)
        .map((item) => item.diagnostic.replace(/\.$/, '')),
    };
  }
  if (total >= 70) {
    return {
      level: 'amber',
      summary: 'Viable with targeted refinements before field release.',
      refinements: heuristicsResults
        .filter((item) => item.diagnostic)
        .map((item) => item.diagnostic.replace(/\.$/, '')),
    };
  }
  if (total >= 50) {
    return {
      level: 'red',
      summary: 'Iteration required; address flagged diagnostics prior to dissemination.',
      refinements: heuristicsResults
        .filter((item) => item.diagnostic)
        .map((item) => item.diagnostic.replace(/\.$/, '')),
    };
  }
  return {
    level: 'critical',
    summary: 'Not recommended; fails multiple deterministic thresholds.',
    refinements: heuristicsResults
      .filter((item) => item.diagnostic)
      .map((item) => item.diagnostic.replace(/\.$/, '')),
  };
};

const evaluateCandidate = (room, candidate, dataset) => {
  ensureId(candidate, 'name');
  const heuristics = buildHeuristics(room, candidate, dataset);
  const breakdown = heuristics.map((heuristic) => {
    const { score, summary, diagnostic } = heuristic.evaluate();
    const weightedScore = (score * heuristic.weight) / 100;
    return {
      id: heuristic.id,
      label: heuristic.label,
      weight: heuristic.weight,
      score,
      weightedScore,
      summary,
      diagnostic,
    };
  });
  const total = breakdown.reduce((sum, entry) => sum + entry.weightedScore, 0);
  const diagnostics = breakdown
    .filter((entry) => entry.diagnostic)
    .map((entry) => `${entry.label}: ${entry.diagnostic}`);
  const rubric = buildRubric(total, breakdown);
  return {
    nameId: candidate.id,
    label: candidate.label,
    total,
    breakdown,
    diagnostics,
    rubric,
  };
};

export const evaluateRoom = (room) => {
  const dataset = {
    goalTokens: scenarioKeywords(room),
  };
  return room.names.map((candidate) => evaluateCandidate(room, candidate, dataset));
};
