import { RELATIONS, WIDE_VIEW_COLUMNS } from './schema';
import { MUSICBRAINZ_DATASET } from './musicbrainzDataset';

const {
  metadata,
  songs: rawSongs,
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
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const defaultSourceId = metadata?.source ?? 'mock';

const songs = rawSongs.map((song) => ({
  songId: song.songId,
  title: song.title,
  primaryArtistId: song.primaryArtistId,
  genre: song.genre ?? 'unknown',
  releaseYear: song.year ?? null,
  energy: song.energy ?? null,
  bpm: song.bpm ?? null,
  isDuet: song.isDuet ?? false,
  source: song.source ?? defaultSourceId,
  releaseId: song.releaseId ?? null,
  coverArtUrl: song.coverArtUrl ?? null,
}));

const releases = Array.from(
  rawSongs.reduce((acc, song) => {
    if (!song.releaseId) {
      return acc;
    }
    if (!acc.has(song.releaseId)) {
      acc.set(song.releaseId, {
        releaseId: song.releaseId,
        title: song.releaseTitle ?? song.title,
        releaseYear: song.year ?? null,
        coverArtUrl: song.coverArtUrl ?? null,
      });
    } else {
      const entry = acc.get(song.releaseId);
      if (!entry.coverArtUrl && song.coverArtUrl) {
        entry.coverArtUrl = song.coverArtUrl;
      }
      if (!entry.releaseYear && song.year) {
        entry.releaseYear = song.year;
      }
    }
    return acc;
  }, new Map()).values(),
);

const releaseLookup = new Map(releases.map((release) => [release.releaseId, release]));

const genreIds = new Set(['unknown']);
if (Array.isArray(metadata?.genres)) {
  metadata.genres.forEach((genre) => {
    if (genre) {
      genreIds.add(genre);
    }
  });
}
songs.forEach((song) => {
  if (song.genre) {
    genreIds.add(song.genre);
  }
});

const genres = Array.from(genreIds)
  .sort()
  .map((genreId) => ({
    genreId,
    name: toTitleCase(genreId),
  }));

const songGenres = songs.map((song) => ({
  songId: song.songId,
  genreId: song.genre ?? 'unknown',
}));

const SOURCE_CATALOG = {
  musicbrainz: {
    name: 'MusicBrainz',
    description: 'MusicBrainz catalog export used for the production dataset.',
  },
  mock: {
    name: 'Mock Seed',
    description: 'Legacy in-memory dataset used for offline demos and tests.',
  },
};

const sourceIds = new Set(['mock']);
if (metadata?.source) {
  sourceIds.add(metadata.source);
}
rawSongs.forEach((song) => {
  if (song.source) {
    sourceIds.add(song.source);
  }
});

const sources = Array.from(sourceIds).map((sourceId) => {
  const catalogEntry = SOURCE_CATALOG[sourceId] ?? {};
  return {
    sourceId,
    name: catalogEntry.name ?? toTitleCase(sourceId),
    description: catalogEntry.description ?? 'External catalog integration.',
    isPrimary: sourceId === defaultSourceId,
  };
});

const relationData = {
  Songs: songs,
  Artists: artists,
  SongArtists: songArtists,
  SongMood: songMood,
  SongActivity: songActivity,
  Likes: likes,
  Users: users,
  SongWideView: [],
  Releases: releases,
  Genres: genres,
  SongGenres: songGenres,
  Sources: sources,
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

  return songs.map((song) => {
    const release = song.releaseId ? releaseLookup.get(song.releaseId) : null;
    return {
      songId: song.songId,
      title: song.title,
      artists: songArtistNames.get(song.songId) ?? [],
      genre: song.genre,
      releaseYear: song.releaseYear,
      energy: song.energy,
      bpm: song.bpm,
      source: song.source,
      releaseTitle: release?.title ?? null,
      coverArtUrl: song.coverArtUrl ?? release?.coverArtUrl ?? null,
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

const sourceList = sources.map((source) => source.sourceId);
let activeSourceId = sourceList.includes(defaultSourceId)
  ? defaultSourceId
  : sourceList[0] ?? 'mock';

if (!sourceList.includes(activeSourceId)) {
  sourceList.push(activeSourceId);
}

const providerCache = new Map();

const withSongFilter = (rows, songIds, key = 'songId') => rows.filter((row) => songIds.has(row[key]));

const buildProviderView = (sourceId) => {
  if (providerCache.has(sourceId)) {
    return providerCache.get(sourceId);
  }

  const providerSongs = relationData.Songs.filter((song) => song.source === sourceId);
  const songIds = new Set(providerSongs.map((song) => song.songId));

  const providerSongArtists = withSongFilter(relationData.SongArtists, songIds);
  const artistIds = new Set(providerSongArtists.map((entry) => entry.artistId));
  providerSongs.forEach((song) => {
    if (song.primaryArtistId) {
      artistIds.add(song.primaryArtistId);
    }
  });
  const providerArtists = relationData.Artists.filter((artist) => artistIds.has(artist.artistId));

  const releaseIds = new Set();
  providerSongs.forEach((song) => {
    if (song.releaseId) {
      releaseIds.add(song.releaseId);
    }
  });
  const providerReleases = relationData.Releases.filter((release) => releaseIds.has(release.releaseId));

  const view = {
    Songs: providerSongs,
    SongWideView: relationData.SongWideView.filter((row) => row.source === sourceId),
    SongArtists: providerSongArtists,
    SongMood: withSongFilter(relationData.SongMood, songIds),
    SongActivity: withSongFilter(relationData.SongActivity, songIds),
    SongGenres: withSongFilter(relationData.SongGenres, songIds),
    Likes: withSongFilter(relationData.Likes, songIds),
    Artists: providerArtists,
    Releases: providerReleases,
    Genres: relationData.Genres,
    Users: relationData.Users,
  };

  providerCache.set(sourceId, view);
  return view;
};

const ensureSourceId = (sourceId) => {
  if (!sourceList.includes(sourceId)) {
    throw new Error(`Unknown source ${sourceId}`);
  }
  return sourceId;
};

const getSourcesForActiveProvider = () =>
  sources.map((source) => ({
    ...source,
    isPrimary: source.sourceId === activeSourceId,
  }));

const getRowsForRelation = (name) => {
  ensureSourceId(activeSourceId);
  if (name === 'Sources') {
    return getSourcesForActiveProvider();
  }

  const providerView = buildProviderView(activeSourceId);
  return providerView[name] ?? relationData[name] ?? [];
};

export function getRelation(name) {
  const relation = RELATIONS[name];
  if (!relation) {
    throw new Error(`Unknown relation ${name}`);
  }
  const rows = getRowsForRelation(name);
  return {
    name,
    columns: relation.columns,
    rows,
  };
}

export function getAllRelations() {
  return Object.fromEntries(Object.keys(RELATIONS).map((key) => [key, getRelation(key)]));
}

export function setActiveSource(sourceId) {
  const normalized = ensureSourceId(sourceId);
  activeSourceId = normalized;
}

export function getActiveSource() {
  return getSourcesForActiveProvider().find((source) => source.isPrimary) ?? null;
}

export function listSources() {
  return getSourcesForActiveProvider();
}

export const DATASET = {
  metadata,
  songs,
  artists,
  releases,
  genres,
  songGenres,
  sources,
  songArtists,
  songMood,
  songActivity,
  likes,
  users,
};
