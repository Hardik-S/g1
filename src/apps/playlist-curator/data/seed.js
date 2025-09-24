import { RELATIONS, WIDE_VIEW_COLUMNS } from './schema';
import { MUSICBRAINZ_DATASET } from './musicbrainzDataset';

const {
  metadata,
  songs,
  artists,
  songArtists,
  songMood,
  songActivity,
  users,
  likes,
} = MUSICBRAINZ_DATASET;

const toTitleCase = (value) =>
  value
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeSources = () => {
  const ids = new Set();
  if (metadata.source) {
    ids.add(metadata.source);
  }
  songs.forEach((song) => {
    if (song.source) {
      ids.add(song.source);
    }
  });

  const labelFor = (id) => {
    if (!id) return 'Unknown';
    const lowered = id.toLowerCase();
    if (lowered === 'musicbrainz') {
      return 'MusicBrainz';
    }
    if (lowered === 'mock') {
      return 'Mock Dataset';
    }
    return toTitleCase(id);
  };

  const kindFor = (id) => {
    if (!id) return 'unknown';
    const lowered = id.toLowerCase();
    if (lowered === 'musicbrainz') {
      return 'open-data';
    }
    if (lowered === 'mock') {
      return 'fixture';
    }
    return 'external';
  };

  return Array.from(ids)
    .filter(Boolean)
    .map((sourceId) => ({
      sourceId,
      label: labelFor(sourceId),
      kind: kindFor(sourceId),
    }));
};

const sourceCatalog = normalizeSources();

const genreCatalog = Array.from(
  new Set([
    ...(metadata.genres ?? []),
    ...songs.map((song) => song.genre).filter(Boolean),
  ]),
).map((genreId) => ({
  genreId,
  name: toTitleCase(genreId),
}));

const genreNameById = new Map(genreCatalog.map((entry) => [entry.genreId, entry.name]));

const songGenreLinks = songs
  .filter((song) => song.genre)
  .map((song) => ({ songId: song.songId, genreId: song.genre }));

const normalizedSongs = songs.map((song) => ({
  songId: song.songId,
  title: song.title,
  primaryArtistId: song.primaryArtistId,
  releaseYear: song.year ?? null,
  energy: song.energy ?? null,
  bpm: song.bpm ?? null,
  isDuet: song.isDuet ?? false,
  sourceId: song.source ?? metadata.source ?? 'unknown',
  releaseId: song.releaseId ?? null,
  releaseTitle: song.releaseTitle ?? null,
  coverArtUrl: song.coverArtUrl ?? null,
}));

const releases = Array.from(
  songs.reduce((acc, song) => {
    if (!song.releaseId) {
      return acc;
    }
    if (!acc.has(song.releaseId)) {
      acc.set(song.releaseId, {
        releaseId: song.releaseId,
        title: song.releaseTitle ?? song.title,
        year: song.year ?? null,
        coverArtUrl: song.coverArtUrl ?? null,
      });
    }
    return acc;
  }, new Map()).values(),
);

const relationData = {
  Songs: normalizedSongs,
  Artists: artists,
  SongArtists: songArtists,
  SongMood: songMood,
  SongActivity: songActivity,
  Likes: likes,
  Users: users,
  SongWideView: [],
  Releases: releases,
  Genres: genreCatalog,
  SongGenres: songGenreLinks,
  Sources: sourceCatalog,
};

const buildLookup = (entries, key, value) => {
  const map = new Map();
  entries.forEach((entry) => {
    if (!map.has(entry[key])) {
      map.set(entry[key], []);
    }
    map.get(entry[key]).push(entry[value]);
  });
  return map;
};

function createWideView() {
  const artistLookup = new Map(artists.map((artist) => [artist.artistId, artist]));
  const moodsBySong = buildLookup(songMood, 'songId', 'mood');
  const activitiesBySong = buildLookup(songActivity, 'songId', 'activityTag');
  const genresBySong = buildLookup(songGenreLinks, 'songId', 'genreId');
  const songArtistNames = new Map();
  songArtists.forEach((entry) => {
    if (!songArtistNames.has(entry.songId)) {
      songArtistNames.set(entry.songId, []);
    }
    const name = artistLookup.get(entry.artistId)?.name ?? entry.artistId;
    songArtistNames.get(entry.songId).push(name);
  });

  const usersById = new Map(users.map((user) => [user.userId, user.name]));
  const likesBySong = new Map();
  likes.forEach((entry) => {
    if (!likesBySong.has(entry.songId)) {
      likesBySong.set(entry.songId, []);
    }
    const label = usersById.get(entry.userId) ?? entry.userId;
    likesBySong.get(entry.songId).push(label);
  });

  return normalizedSongs.map((song) => {
    const genreNames = (genresBySong.get(song.songId) ?? []).map(
      (genreId) => genreNameById.get(genreId) ?? toTitleCase(genreId),
    );
    const displayGenres = genreNames.length > 0 ? genreNames : ['Unknown'];

    return {
      songId: song.songId,
      title: song.title,
      artists: songArtistNames.get(song.songId) ?? [],
      genres: displayGenres,
      releaseYear: song.releaseYear,
      energy: song.energy,
      bpm: song.bpm,
      sourceId: song.sourceId,
      releaseTitle: song.releaseTitle,
      coverArtUrl: song.coverArtUrl,
      moods: moodsBySong.get(song.songId) ?? [],
      activities: activitiesBySong.get(song.songId) ?? [],
      likedBy: likesBySong.get(song.songId) ?? [],
    };
  });
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
  const rows = relationData[name] ?? [];
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
  metadata,
  songs: normalizedSongs,
  artists,
  releases,
  songArtists,
  songGenres: songGenreLinks,
  songMood,
  songActivity,
  likes,
  users,
  genres: genreCatalog,
  sources: sourceCatalog,
};
