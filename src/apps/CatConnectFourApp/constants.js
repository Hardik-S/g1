export const MODES = {
  STANDARD: 'standard',
  TWO_PLAYER: 'two-player',
  AI: 'ai',
  KITTEN: 'kitten',
};

export const MODE_OPTIONS = [
  {
    id: MODES.TWO_PLAYER,
    title: '2 Player (Local)',
    description: 'Take turns with a friend at the cat café.',
    icon: '🐾',
  },
  {
    id: MODES.AI,
    title: '1 Player vs Cat AI',
    description: 'Challenge one of the café cats.',
    icon: '🤖',
  },
  {
    id: MODES.KITTEN,
    title: 'Kitten Mode',
    description: 'Quick 5×4 board — connect 3 to win.',
    icon: '🐱',
  },
];

export const DIFFICULTIES = {
  RYTHM: 'rythm',
  KIMCHI: 'kimchi',
  SIELLA: 'siella',
};

export const DIFFICULTY_OPTIONS = [
  {
    id: DIFFICULTIES.RYTHM,
    title: 'Rythm',
    description: 'Playful white paw with the occasional misstep.',
    blunderRate: 0.2,
    paw: 'white',
  },
  {
    id: DIFFICULTIES.KIMCHI,
    title: 'Kimchi',
    description: 'Bright orange paw that rarely slips.',
    blunderRate: 0.1,
    paw: 'orange',
  },
  {
    id: DIFFICULTIES.SIELLA,
    title: 'Siella',
    description: 'Calm gray paw that never blunders.',
    blunderRate: 0,
    paw: 'gray',
  },
];

export const PAW_CHOICES = [
  { id: 'blossom', label: 'Cherry Blossom', preview: '🌸' },
  { id: 'midnight', label: 'Midnight Whiskers', preview: '🌙' },
  { id: 'ocean', label: 'Ocean Paws', preview: '🌊' },
  { id: 'sunny', label: 'Sunny Steps', preview: '🌞' },
  { id: 'mint', label: 'Mint Cream', preview: '🍃' },
  { id: 'royal', label: 'Royal Velvet', preview: '👑' },
];

export const BOARD_CONFIG = {
  [MODES.TWO_PLAYER]: { columns: 7, rows: 6, connect: 4 },
  [MODES.AI]: { columns: 7, rows: 6, connect: 4 },
  [MODES.KITTEN]: { columns: 5, rows: 4, connect: 3 },
};

export const STORAGE_KEYS = {
  MODE: 'cat-connect-four:last-mode',
  DIFFICULTY: 'cat-connect-four:last-difficulty',
  PAW: 'cat-connect-four:last-paw',
  MUTE: 'cat-connect-four:muted',
};

export const SESSION_STORAGE_KEYS = {
  SCOREBOARDS: 'cat-connect-four:session-scoreboards',
};

export const TURN_ICONS = {
  player: '😺',
  player1: '😺',
  player2: '😼',
  ai: '🐈‍⬛',
};
