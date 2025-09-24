export const THEMES = {
  neon: {
    id: 'neon',
    name: 'Neon Grid',
    description:
      'Synthwave-inspired grid with neon trails and plasma orbs that leave shimmering echoes across the arena.',
    palette: {
      background: '#070320',
      backgroundGradient: ['#050011', '#140045', '#1b004b'],
      gridPrimary: 'rgba(0, 255, 255, 0.12)',
      gridAccent: 'rgba(98, 0, 255, 0.4)',
      borderGlow: 'rgba(0, 255, 255, 0.55)',
      snakeHead: '#5ef8ff',
      snakeBody: ['#1bdef7', '#884bff', '#ff65f9'],
      snakePulse: 'rgba(94, 248, 255, 0.32)',
      foodPrimary: '#ff65f9',
      foodSpecial: '#fef78d',
      foodZen: '#66ffd1',
      foodGlow: 'rgba(255, 101, 249, 0.45)',
      hazard: 'rgba(255, 66, 165, 0.8)',
      hazardGlow: 'rgba(255, 66, 165, 0.4)',
      particle: ['#5ef8ff', '#ff65f9', '#fef78d'],
      scoreText: '#f5f9ff',
      mutedText: 'rgba(245, 249, 255, 0.65)'
    },
    audio: {
      baseFrequency: 210,
      foodFrequency: 420,
      specialFrequency: 620,
      hazardFrequency: 160
    },
    background: {
      pulseSpeed: 4500,
      parallax: 0.18
    }
  },
  organic: {
    id: 'organic',
    name: 'Organic Garden',
    description:
      'Lush garden canopy where the snake weaves like a vine amid blooming fruit and drifting pollen motes.',
    palette: {
      background: '#08210d',
      backgroundGradient: ['#071a0a', '#124522', '#0f371b'],
      gridPrimary: 'rgba(255, 255, 255, 0.08)',
      gridAccent: 'rgba(126, 176, 96, 0.32)',
      borderGlow: 'rgba(173, 227, 134, 0.45)',
      snakeHead: '#f2f7c0',
      snakeBody: ['#95d26a', '#54a44c', '#2a7d3e'],
      snakePulse: 'rgba(152, 227, 121, 0.28)',
      foodPrimary: '#ffb347',
      foodSpecial: '#f45d8c',
      foodZen: '#9be7ff',
      foodGlow: 'rgba(255, 214, 121, 0.42)',
      hazard: 'rgba(139, 84, 37, 0.75)',
      hazardGlow: 'rgba(201, 134, 64, 0.45)',
      particle: ['#f2f7c0', '#ffb347', '#9be7ff'],
      scoreText: '#f3ffe2',
      mutedText: 'rgba(243, 255, 226, 0.7)'
    },
    audio: {
      baseFrequency: 170,
      foodFrequency: 340,
      specialFrequency: 500,
      hazardFrequency: 120
    },
    background: {
      pulseSpeed: 5200,
      parallax: 0.12
    }
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Elegance',
    description:
      'A clean, gallery-like arena with soft gradients, understated ripples, and precise motion cues.',
    palette: {
      background: '#111418',
      backgroundGradient: ['#0c1014', '#1c2430', '#1b1e24'],
      gridPrimary: 'rgba(255, 255, 255, 0.05)',
      gridAccent: 'rgba(255, 255, 255, 0.18)',
      borderGlow: 'rgba(255, 255, 255, 0.32)',
      snakeHead: '#f4f6fb',
      snakeBody: ['#b8c4d6', '#8aa0bf', '#5f7796'],
      snakePulse: 'rgba(255, 255, 255, 0.18)',
      foodPrimary: '#f4f6fb',
      foodSpecial: '#b6f1ff',
      foodZen: '#ffcba4',
      foodGlow: 'rgba(244, 246, 251, 0.35)',
      hazard: 'rgba(96, 110, 128, 0.85)',
      hazardGlow: 'rgba(96, 110, 128, 0.4)',
      particle: ['#f4f6fb', '#b6f1ff', '#ffcba4'],
      scoreText: '#f4f6fb',
      mutedText: 'rgba(244, 246, 251, 0.6)'
    },
    audio: {
      baseFrequency: 240,
      foodFrequency: 480,
      specialFrequency: 680,
      hazardFrequency: 200
    },
    background: {
      pulseSpeed: 3800,
      parallax: 0.08
    }
  }
};

export const THEME_LIST = Object.values(THEMES);

export const getTheme = (id) => THEMES[id] ?? THEMES.neon;
