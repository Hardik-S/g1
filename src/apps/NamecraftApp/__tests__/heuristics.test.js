import { evaluateRoom } from '../engine/heuristics';

const buildRoom = () => ({
  id: 'room-test',
  title: 'Test Cohort',
  notes: 'Testing heuristics for determinism.',
  createdAt: '2025-01-12T10:15:00.000Z',
  updatedAt: '2025-01-12T10:15:00.000Z',
  names: [
    {
      id: 'name-sonora',
      label: 'Sonora',
      meaning: 'Signals warm resonance and field audio practice',
      phonetics: 'so-NO-rah',
      tags: ['warm', 'resonant', 'phonetics'],
    },
    {
      id: 'name-zoomica',
      label: 'Zoomica',
      meaning: 'Too close to device naming',
      phonetics: 'ZOO-mee-kah',
      tags: ['device'],
    },
  ],
  scenarios: [
    {
      id: 'scenario-conference',
      title: 'Conference Poster Reveal',
      goal:
        'Name should highlight collaborative phonetic analysis and feel welcoming to community partners.',
      stressTest: 'Avoid similarity with existing labs such as LinguaLab or Sonority Lab to reduce confusion.',
      riskNotes: 'Participants include Dene and Salish speakers; aim for respectful consonant patterns.',
    },
    {
      id: 'scenario-kit',
      title: 'Field Kit Labelling',
      goal: 'Short sticker-friendly word that encodes sound documentation toolkit vibes.',
      stressTest: 'Must stay legible on handheld recorders under low light.',
      riskNotes: 'Should not resemble commercial recorder model names (Zoom, Tascam, Sony).',
    },
  ],
  evaluations: [],
});

describe('Namecraft heuristics', () => {
  it('produces stable weighted scores for aligned names', () => {
    const [primary, risky] = evaluateRoom(buildRoom());
    expect(primary.label).toBe('Sonora');
    expect(primary.total).toBeGreaterThan(64);
    expect(primary.breakdown.find((item) => item.id === 'GoalAlignment').score).toBeGreaterThanOrEqual(40);
    expect(primary.diagnostics.length).toBeLessThanOrEqual(2);

    expect(risky.label).toBe('Zoomica');
    expect(risky.total).toBeLessThan(70.5);
    expect(risky.diagnostics.length).toBeGreaterThanOrEqual(primary.diagnostics.length);
    expect(primary.total).toBeGreaterThan(risky.total);
    const primaryTransparency = primary.breakdown.find((item) => item.id === 'Transparency').score;
    const riskyTransparency = risky.breakdown.find((item) => item.id === 'Transparency').score;
    expect(primaryTransparency).toBeGreaterThan(riskyTransparency);
  });
});
