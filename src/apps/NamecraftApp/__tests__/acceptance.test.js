import { createEmptyRoom, addCandidateName, addScenario, stampEvaluations } from '../state/roomFactory';
import { evaluateRoom } from '../engine/heuristics';
import { createPlatoMarkdown } from '../utils/exporters';

describe('Namecraft acceptance flow', () => {
  it('creates a room, evaluates, and exports PLATO headings', () => {
    const room = createEmptyRoom('Acceptance Demo');
    const withName = addCandidateName(room, {
      label: 'Resonata',
      meaning: 'Captures resonant storytelling focus',
      phonetics: 'REZ-oh-NAH-tah',
      tags: ['resonant', 'story'],
    });
    const withScenario = addScenario(withName, {
      title: 'Graduate workshop kickoff',
      goal: 'Highlight collaborative phonetics practice and accessibility.',
      stressTest: 'Avoid overlap with LinguaLab or existing campus labs.',
      riskNotes: 'Name should be legible on shared slide decks.',
    });
    const evaluations = evaluateRoom(withScenario);
    const finalRoom = stampEvaluations(withScenario, evaluations);
    const markdown = createPlatoMarkdown(finalRoom, evaluations);

    expect(markdown).toContain('# PLATO: Acceptance Demo');
    expect(markdown).toContain('## P — Purpose');
    expect(markdown).toContain('## L — Linguistic Trials');
    expect(markdown).toContain('## A — Analysis Grid');
    expect(markdown).toContain('## T — Test Diagnostics');
    expect(markdown).toContain('## O — Outcomes & Next Steps');
  });
});
