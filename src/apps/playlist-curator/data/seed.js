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
  Songs: songs,
  Artists: artists,
  SongArtists: songArtists,
  SongMood: songMood,
  SongActivity: songActivity,
  Likes: likes,
  Users: users,
  SongWideView: [],
  Releases: releases,
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

  return songs.map((song) => ({
    songId: song.songId,
    title: song.title,
    artists: songArtistNames.get(song.songId) ?? [],
    genre: song.genre,
    year: song.year,
    energy: song.energy,
    bpm: song.bpm,
    source: song.source,
    releaseTitle: song.releaseTitle,
    coverArtUrl: song.coverArtUrl,
    moods: moodsBySong.get(song.songId) ?? [],
    activities: activitiesBySong.get(song.songId) ?? [],
    likedBy: likesBySong.get(song.songId) ?? [],
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
  songs,
  artists,
  releases,
  songArtists,
  songMood,
  songActivity,
  likes,
  users,
};
