export interface PlaceholderMoment {
  id: string;
  label: string;
  period: string;
  detail: string;
}

export interface PlaceholderWord {
  id: string;
  word: string;
  language: string;
  family: string;
  summary: string;
  keyMoments: PlaceholderMoment[];
}

export const placeholderWords: PlaceholderWord[] = [
  {
    id: 'mother',
    word: 'mother',
    language: 'English',
    family: 'Indo-European',
    summary:
      "Modern English 'mother' descends from Proto-Germanic *mōdēr and ultimately from the Proto-Indo-European root *méh₂tēr.",
    keyMoments: [
      {
        id: 'mom-0',
        label: '*méh₂tēr',
        period: 'c. 4500–2500 BCE',
        detail: 'Proto-Indo-European reconstruction meaning “mother.”',
      },
      {
        id: 'mom-1',
        label: '*mōdēr',
        period: 'c. 500 BCE–0 CE',
        detail: 'Proto-Germanic form preserving the root semantics.',
      },
      {
        id: 'mom-2',
        label: 'mōdor',
        period: 'c. 700–1100 CE',
        detail: 'Old English attested forms showing vowel variation.',
      },
      {
        id: 'mom-3',
        label: 'mother',
        period: 'c. 1500 CE–present',
        detail: 'Modern English development with consistent spelling.',
      },
    ],
  },
  {
    id: 'lumen',
    word: 'lumen',
    language: 'Latin',
    family: 'Italic',
    summary:
      "Latin 'lumen' (“light”) illustrates Italic developments from Proto-Indo-European *lewk- with semantic focus on brightness.",
    keyMoments: [
      {
        id: 'lum-0',
        label: '*lewk- root',
        period: 'c. 4000–2500 BCE',
        detail: 'Proto-Indo-European base for “light, brightness.”',
      },
      {
        id: 'lum-1',
        label: '*louks',
        period: 'c. 1800–1200 BCE',
        detail: 'Proto-Italic reflex showing rounded vowel shift.',
      },
      {
        id: 'lum-2',
        label: 'lūmen',
        period: 'c. 200 BCE–200 CE',
        detail: 'Classical Latin noun meaning “light” or “opening.”',
      },
    ],
  },
  {
    id: 'echo',
    word: 'ēkhō',
    language: 'Ancient Greek',
    family: 'Hellenic',
    summary:
      "Ancient Greek 'ēkhō' (“I have, sound”) conveys the path from an onomatopoetic Proto-Indo-European root into Classical usage.",
    keyMoments: [
      {
        id: 'ech-0',
        label: '*wekʰ-',
        period: 'c. 3500–2000 BCE',
        detail: 'Onomatopoetic Proto-Indo-European base connected with sound.',
      },
      {
        id: 'ech-1',
        label: 'ἦχος (ēkhos)',
        period: 'c. 800–300 BCE',
        detail: 'Classical Greek noun meaning “sound, noise.”',
      },
      {
        id: 'ech-2',
        label: 'ἠχέω (ēkheō)',
        period: 'c. 500 BCE–100 CE',
        detail: 'Verb “to resound,” showing semantic expansion.',
      },
    ],
  },
];
