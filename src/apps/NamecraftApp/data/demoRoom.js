import { nowIso } from '../utils/dates.js';
import { createStableId } from '../utils/identity.js';

export const DEMO_ROOM_ID = 'namecraft-demo-room';

export const createDemoRoom = () => {
  const createdAt = nowIso();
  return {
    id: DEMO_ROOM_ID,
    title: 'Field Methods Cohort',
    notes:
      'Graduate phonology cohort designing a project codename that is memorable yet academically neutral.',
    createdAt,
    updatedAt: createdAt,
    names: [
      {
        id: createStableId('name', 'sonora'),
        label: 'Sonora',
        meaning: 'Signals warm resonance and field audio practice',
        phonetics: 'so-NO-rah',
        tags: ['warm', 'resonant', 'phonetics'],
      },
      {
        id: createStableId('name', 'glossa'),
        label: 'GlossaLab',
        meaning: 'Echoes articulatory focus with lab neutrality',
        phonetics: 'GLOSS-uh-lab',
        tags: ['articulation', 'lab'],
      },
    ],
    scenarios: [
      {
        id: createStableId('scenario', 'conference'),
        title: 'Conference Poster Reveal',
        goal:
          'Name should highlight collaborative phonetic analysis and feel welcoming to community partners.',
        stressTest:
          'Avoid similarity with existing labs such as LinguaLab or Sonority Lab to reduce confusion.',
        riskNotes: 'Participants include Dene and Salish speakers; aim for respectful consonant patterns.',
      },
      {
        id: createStableId('scenario', 'field-kit'),
        title: 'Field Kit Labelling',
        goal: 'Short sticker-friendly word that encodes sound documentation toolkit vibes.',
        stressTest: 'Must stay legible on handheld recorders under low light.',
        riskNotes: 'Should not resemble commercial recorder model names (Zoom, Tascam, Sony).',
      },
    ],
    evaluations: [],
  };
};
