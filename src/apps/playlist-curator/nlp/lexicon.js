import { DATASET } from '../data/seed';

const unique = (values) => Array.from(new Set(values)).sort();

export const GENRES = unique(DATASET.genres.map((genre) => genre.genreId));
export const MOODS = unique(DATASET.songMood.map((entry) => entry.mood));
export const ACTIVITIES = unique(DATASET.songActivity.map((entry) => entry.activityTag));
export const USERS = DATASET.users.map((user) => ({
  id: user.userId,
  name: user.name,
  group: user.group,
}));
export const ARTISTS = DATASET.artists.map((artist) => ({
  id: artist.artistId,
  name: artist.name,
  country: artist.country,
}));

export const GROUPS = unique(DATASET.users.map((user) => user.group));

export const DECADE_RANGES = [
  { label: '1990s', start: 1990, end: 2000 },
  { label: '2000s', start: 2000, end: 2010 },
  { label: '2010s', start: 2010, end: 2020 },
  { label: '2020s', start: 2020, end: 2030 },
];

export const RANGE_KEYWORDS = [
  { keyword: 'over', comparison: '>' },
  { keyword: 'under', comparison: '<' },
  { keyword: 'at least', comparison: '>=' },
  { keyword: 'at most', comparison: '<=' },
];

export const SAMPLE_GROUP_MEMBERS = {
  StudyGroup: USERS.filter((user) => user.group === 'StudyGroup'),
};

export const EXAMPLE_QUERIES = [
  'Find upbeat rock songs from the 2000s for working out.',
  'Show songs both Hardik and Sarah like.',
  'Give energetic pop tracks from 2015-2019 by artists from Canada.',
  'List chill acoustic songs not liked by Alex.',
  'Find songs that every member of StudyGroup likes.',
  'Find songs either jazz or blues, but not both.',
  "Show songs with bpm over 140 and mood 'hype'.",
  'Find duets where both artists appear in the database.',
  'Project only title and artist for indie songs.',
  'Cartesian sanity test: pair any 00s hip-hop song with a running activity tag.',
];
