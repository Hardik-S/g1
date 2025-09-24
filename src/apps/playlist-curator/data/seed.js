import { RELATIONS, WIDE_VIEW_COLUMNS } from './schema';

const songs = [
  {
    songId: 'S1',
    title: 'Crimson Fuel',
    primaryArtistId: 'A1',
    genre: 'rock',
    year: 2004,
    energy: 82,
    bpm: 150,
    isDuet: false,
  },
  {
    songId: 'S2',
    title: 'Magnetic Rush',
    primaryArtistId: 'A2',
    genre: 'pop',
    year: 2016,
    energy: 88,
    bpm: 128,
    isDuet: false,
  },
  {
    songId: 'S3',
    title: 'Northern Pulse',
    primaryArtistId: 'A2',
    genre: 'pop',
    year: 2018,
    energy: 90,
    bpm: 132,
    isDuet: false,
  },
  {
    songId: 'S4',
    title: 'Acoustic Dawn',
    primaryArtistId: 'A3',
    genre: 'acoustic',
    year: 2012,
    energy: 45,
    bpm: 80,
    isDuet: false,
  },
  {
    songId: 'S5',
    title: 'Hearth Strings',
    primaryArtistId: 'A3',
    genre: 'acoustic',
    year: 2019,
    energy: 40,
    bpm: 72,
    isDuet: false,
  },
  {
    songId: 'S6',
    title: 'Harbor Mist',
    primaryArtistId: 'A4',
    genre: 'chill',
    year: 2007,
    energy: 50,
    bpm: 90,
    isDuet: false,
  },
  {
    songId: 'S7',
    title: 'Hyper Drive',
    primaryArtistId: 'A11',
    genre: 'electronic',
    year: 2020,
    energy: 96,
    bpm: 148,
    isDuet: false,
  },
  {
    songId: 'S8',
    title: 'Rainy Fifth',
    primaryArtistId: 'A6',
    genre: 'jazz',
    year: 2003,
    energy: 60,
    bpm: 110,
    isDuet: false,
  },
  {
    songId: 'S9',
    title: 'Delta Glow',
    primaryArtistId: 'A7',
    genre: 'blues',
    year: 2003,
    energy: 58,
    bpm: 112,
    isDuet: false,
  },
  {
    songId: 'S10',
    title: 'Fusion Nights',
    primaryArtistId: 'A5',
    genre: 'jazz',
    year: 2011,
    energy: 72,
    bpm: 118,
    isDuet: true,
  },
  {
    songId: 'S11',
    title: 'Study Spark',
    primaryArtistId: 'A10',
    genre: 'ambient',
    year: 2015,
    energy: 42,
    bpm: 78,
    isDuet: false,
  },
  {
    songId: 'S12',
    title: 'Desert Bloom',
    primaryArtistId: 'A12',
    genre: 'world',
    year: 2017,
    energy: 55,
    bpm: 100,
    isDuet: false,
  },
  {
    songId: 'S13',
    title: 'Metro Sprint',
    primaryArtistId: 'A12',
    genre: 'hip-hop',
    year: 2006,
    energy: 85,
    bpm: 134,
    isDuet: false,
  },
  {
    songId: 'S14',
    title: 'Open Skies',
    primaryArtistId: 'A8',
    genre: 'indie',
    year: 2014,
    energy: 65,
    bpm: 108,
    isDuet: false,
  },
];

const artists = [
  { artistId: 'A1', name: 'Edge Voltage', country: 'USA' },
  { artistId: 'A2', name: 'Maple Motion', country: 'Canada' },
  { artistId: 'A3', name: 'Calm Harbor', country: 'Canada' },
  { artistId: 'A4', name: 'Blue Coastline', country: 'USA' },
  { artistId: 'A5', name: 'Nocturne Duo', country: 'UK' },
  { artistId: 'A6', name: 'Jazz Mosaic', country: 'USA' },
  { artistId: 'A7', name: 'Blues Ember', country: 'USA' },
  { artistId: 'A8', name: 'Indie Meadow', country: 'USA' },
  { artistId: 'A9', name: 'Skyline Echo', country: 'Canada' },
  { artistId: 'A10', name: 'Focus Study Ensemble', country: 'USA' },
  { artistId: 'A11', name: 'Pulse Theory', country: 'Canada' },
  { artistId: 'A12', name: 'Desert Lines', country: 'USA' },
];

const songArtists = songs.flatMap((song) => {
  const base = [{ songId: song.songId, artistId: song.primaryArtistId }];
  if (song.songId === 'S10') {
    return [
      ...base,
      { songId: 'S10', artistId: 'A6' },
    ];
  }
  return base;
});

const songMood = [
  { songId: 'S1', mood: 'upbeat' },
  { songId: 'S1', mood: 'hype' },
  { songId: 'S2', mood: 'energetic' },
  { songId: 'S3', mood: 'energetic' },
  { songId: 'S4', mood: 'chill' },
  { songId: 'S4', mood: 'acoustic' },
  { songId: 'S5', mood: 'chill' },
  { songId: 'S5', mood: 'acoustic' },
  { songId: 'S6', mood: 'chill' },
  { songId: 'S7', mood: 'hype' },
  { songId: 'S7', mood: 'upbeat' },
  { songId: 'S8', mood: 'smooth' },
  { songId: 'S9', mood: 'soulful' },
  { songId: 'S10', mood: 'jazzy' },
  { songId: 'S11', mood: 'focus' },
  { songId: 'S11', mood: 'chill' },
  { songId: 'S12', mood: 'calm' },
  { songId: 'S13', mood: 'hype' },
  { songId: 'S14', mood: 'indie' },
  { songId: 'S14', mood: 'chill' },
];

const songActivity = [
  { songId: 'S1', activityTag: 'working out' },
  { songId: 'S1', activityTag: 'running' },
  { songId: 'S2', activityTag: 'party' },
  { songId: 'S2', activityTag: 'working out' },
  { songId: 'S3', activityTag: 'working out' },
  { songId: 'S4', activityTag: 'relaxing' },
  { songId: 'S4', activityTag: 'studying' },
  { songId: 'S5', activityTag: 'studying' },
  { songId: 'S6', activityTag: 'studying' },
  { songId: 'S7', activityTag: 'running' },
  { songId: 'S7', activityTag: 'working out' },
  { songId: 'S8', activityTag: 'listening' },
  { songId: 'S8', activityTag: 'studying' },
  { songId: 'S9', activityTag: 'listening' },
  { songId: 'S10', activityTag: 'dancing' },
  { songId: 'S11', activityTag: 'studying' },
  { songId: 'S12', activityTag: 'meditation' },
  { songId: 'S13', activityTag: 'running' },
  { songId: 'S14', activityTag: 'relaxing' },
];

const users = [
  { userId: 'U1', name: 'Hardik', group: 'Listeners' },
  { userId: 'U2', name: 'Sarah', group: 'StudyGroup' },
  { userId: 'U3', name: 'Alex', group: 'Listeners' },
  { userId: 'U4', name: 'Priya', group: 'StudyGroup' },
  { userId: 'U5', name: 'Leo', group: 'StudyGroup' },
  { userId: 'U6', name: 'Maya', group: 'Runners' },
];

const likes = [
  { userId: 'U1', songId: 'S1' },
  { userId: 'U1', songId: 'S2' },
  { userId: 'U1', songId: 'S3' },
  { userId: 'U1', songId: 'S7' },
  { userId: 'U1', songId: 'S10' },
  { userId: 'U2', songId: 'S1' },
  { userId: 'U2', songId: 'S3' },
  { userId: 'U2', songId: 'S4' },
  { userId: 'U2', songId: 'S11' },
  { userId: 'U3', songId: 'S4' },
  { userId: 'U3', songId: 'S6' },
  { userId: 'U3', songId: 'S9' },
  { userId: 'U4', songId: 'S1' },
  { userId: 'U4', songId: 'S4' },
  { userId: 'U4', songId: 'S11' },
  { userId: 'U5', songId: 'S1' },
  { userId: 'U5', songId: 'S4' },
  { userId: 'U5', songId: 'S11' },
  { userId: 'U6', songId: 'S7' },
  { userId: 'U6', songId: 'S13' },
];

const relationData = {
  Songs: songs,
  Artists: artists,
  SongArtists: songArtists,
  SongMood: songMood,
  SongActivity: songActivity,
  Likes: likes,
  Users: users,
  SongWideView: [],
};

function createWideView() {
  const artistLookup = Object.fromEntries(artists.map((artist) => [artist.artistId, artist]));
  const moodsBySong = songs.reduce((acc, song) => {
    acc[song.songId] = songMood
      .filter((entry) => entry.songId === song.songId)
      .map((entry) => entry.mood);
    return acc;
  }, {});

  const activitiesBySong = songs.reduce((acc, song) => {
    acc[song.songId] = songActivity
      .filter((entry) => entry.songId === song.songId)
      .map((entry) => entry.activityTag);
    return acc;
  }, {});

  const likesBySong = songs.reduce((acc, song) => {
    acc[song.songId] = likes
      .filter((entry) => entry.songId === song.songId)
      .map((entry) => users.find((user) => user.userId === entry.userId)?.name ?? entry.userId);
    return acc;
  }, {});

  const songArtistNames = songs.reduce((acc, song) => {
    const ids = songArtists.filter((entry) => entry.songId === song.songId).map((entry) => entry.artistId);
    acc[song.songId] = ids.map((id) => artistLookup[id]?.name ?? id);
    return acc;
  }, {});

  return songs.map((song) => ({
    songId: song.songId,
    title: song.title,
    artists: songArtistNames[song.songId],
    genre: song.genre,
    year: song.year,
    energy: song.energy,
    bpm: song.bpm,
    moods: moodsBySong[song.songId],
    activities: activitiesBySong[song.songId],
    likedBy: likesBySong[song.songId],
  }));
}

const wideViewRows = createWideView();

relationData.SongWideView = wideViewRows;

export const WIDE_VIEW = {
  name: 'SongWideView',
  columns: WIDE_VIEW_COLUMNS,
  rows: wideViewRows,
};

export function getRelation(name) {
  const relation = RELATIONS[name];
  if (!relation) {
    throw new Error(`Unknown relation ${name}`);
  }
  const rows = relationData[name];
  return {
    name,
    columns: relation.columns,
    rows,
  };
}

export function getAllRelations() {
  return Object.fromEntries(Object.keys(RELATIONS).map((key) => [key, getRelation(key)]));
}

export const DATASET = {
  songs,
  artists,
  songArtists,
  songMood,
  songActivity,
  likes,
  users,
};
