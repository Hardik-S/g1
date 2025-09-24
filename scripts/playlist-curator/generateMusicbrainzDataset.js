#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import dns from 'dns';
import { fileURLToPath } from 'url';

dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../../src/apps/playlist-curator/data/musicbrainzDataset.js',
);

const USER_AGENT =
  'g1-playlist-curator-migration/1.0 (openai-agent@example.com)';

const GENRE_CONFIGS = [
  {
    tag: 'rock',
    genre: 'rock',
    moods: ['upbeat', 'energetic'],
    activities: ['working out', 'running'],
    energy: 82,
    bpm: 138,
    limit: 6,
  },
  {
    tag: 'pop',
    genre: 'pop',
    moods: ['energetic', 'hype'],
    activities: ['party', 'working out'],
    energy: 86,
    bpm: 125,
    limit: 6,
  },
  {
    tag: 'acoustic',
    genre: 'acoustic',
    moods: ['chill', 'acoustic'],
    activities: ['relaxing', 'studying'],
    energy: 45,
    bpm: 82,
    limit: 6,
  },
  {
    tag: 'jazz',
    genre: 'jazz',
    moods: ['smooth', 'jazzy'],
    activities: ['listening', 'dining'],
    energy: 60,
    bpm: 112,
    limit: 6,
  },
  {
    tag: 'blues',
    genre: 'blues',
    moods: ['soulful'],
    activities: ['listening'],
    energy: 58,
    bpm: 106,
    limit: 5,
  },
  {
    tag: 'hip-hop',
    genre: 'hip-hop',
    moods: ['hype', 'urban'],
    activities: ['running', 'party'],
    energy: 92,
    bpm: 132,
    limit: 6,
  },
  {
    tag: 'indie',
    genre: 'indie',
    moods: ['indie', 'chill'],
    activities: ['studying', 'relaxing'],
    energy: 64,
    bpm: 108,
    limit: 6,
  },
  {
    tag: 'electronic',
    genre: 'electronic',
    moods: ['hype', 'upbeat'],
    activities: ['working out', 'party'],
    energy: 96,
    bpm: 140,
    limit: 6,
  },
  {
    tag: 'ambient',
    genre: 'ambient',
    moods: ['focus', 'calm'],
    activities: ['studying', 'meditation'],
    energy: 36,
    bpm: 72,
    limit: 5,
  },
];

const USERS = [
  { userId: 'U1', name: 'Hardik', group: 'Listeners', genres: ['rock', 'electronic', 'jazz'] },
  { userId: 'U2', name: 'Sarah', group: 'StudyGroup', genres: ['rock', 'pop', 'acoustic'] },
  { userId: 'U3', name: 'Alex', group: 'Listeners', genres: ['acoustic', 'ambient', 'indie'] },
  { userId: 'U4', name: 'Priya', group: 'StudyGroup', genres: ['rock', 'ambient'] },
  { userId: 'U5', name: 'Leo', group: 'StudyGroup', genres: ['acoustic', 'ambient'] },
  { userId: 'U6', name: 'Maya', group: 'Runners', genres: ['hip-hop', 'electronic'] },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  try {
    const result = execFileSync('curl', ['-sSL', '-A', USER_AGENT, url], {
      encoding: 'utf-8',
    });
    return JSON.parse(result);
  } catch (error) {
    throw new Error(`curl failed for ${url}: ${error.message}`);
  }
}

const recordingQueryUrl = (config) =>
  `https://musicbrainz.org/ws/2/recording?query=tag:${encodeURIComponent(
    config.tag,
  )}%20AND%20status:official&fmt=json&limit=${config.limit}&inc=artist-credits+releases+tags`;

const artistLookupUrl = (id) =>
  `https://musicbrainz.org/ws/2/artist/${id}?fmt=json&inc=area+country`;

function parseYear(value) {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function createCoverArtUrl(releaseId) {
  if (!releaseId) return null;
  return `https://coverartarchive.org/release/${releaseId}/front-250`;
}

async function collectRecordings() {
  const songs = [];
  const songArtists = [];
  const artists = new Map();
  const songMood = [];
  const songActivity = [];

  for (const config of GENRE_CONFIGS) {
    const data = await fetchJson(recordingQueryUrl(config));
    await wait(1100); // respect MusicBrainz rate limiting
    const recordings = data.recordings ?? [];

    recordings.forEach((recording) => {
      if (!recording.id) return;
      if (songs.some((song) => song.songId === recording.id)) return;
      const credits = recording['artist-credit'] ?? [];
      if (credits.length === 0) return;
      const primaryArtist = credits.find((credit) => credit.artist)?.artist;
      if (!primaryArtist?.id) return;
      const release = (recording.releases ?? [])[0];
      const releaseId = release?.id ?? null;
      const releaseDate = release?.date ?? recording['first-release-date'];
      const year = parseYear(releaseDate);
      const isDuet = credits.filter((credit) => credit.artist?.id).length > 1;

      const song = {
        songId: recording.id,
        title: recording.title,
        primaryArtistId: primaryArtist.id,
        genre: config.genre,
        year,
        energy: config.energy,
        bpm: config.bpm,
        isDuet,
        source: 'musicbrainz',
        releaseId,
        releaseTitle: release?.title ?? null,
        coverArtUrl: createCoverArtUrl(releaseId),
      };
      songs.push(song);

      credits.forEach((credit) => {
        const artist = credit.artist;
        if (!artist?.id) return;
        songArtists.push({ songId: recording.id, artistId: artist.id });
        if (!artists.has(artist.id)) {
          artists.set(artist.id, {
            artistId: artist.id,
            name: artist.name,
            country: null,
          });
        }
      });

      config.moods.forEach((mood) => {
        songMood.push({ songId: recording.id, mood });
      });
      config.activities.forEach((activityTag) => {
        songActivity.push({ songId: recording.id, activityTag });
      });
    });
  }

  return { songs, songArtists, artists, songMood, songActivity };
}

async function hydrateArtists(artists) {
  const entries = Array.from(artists.values());
  for (const artist of entries) {
    try {
      const data = await fetchJson(artistLookupUrl(artist.artistId));
      await wait(1100);
      const country = data.country ?? data.area?.name ?? null;
      artist.country = country ?? 'Unknown';
    } catch (error) {
      console.warn(`Failed to fetch artist ${artist.artistId}: ${error.message}`);
      artist.country = 'Unknown';
    }
  }
  return entries;
}

function buildLikes(songs) {
  const songsByGenre = songs.reduce((acc, song) => {
    if (!acc[song.genre]) {
      acc[song.genre] = [];
    }
    acc[song.genre].push(song.songId);
    return acc;
  }, {});

  const likes = [];
  USERS.forEach((user) => {
    const seen = new Set();
    user.genres.forEach((genre) => {
      const pool = songsByGenre[genre] ?? [];
      pool.slice(0, 3).forEach((songId) => {
        if (!seen.has(songId)) {
          likes.push({ userId: user.userId, songId });
          seen.add(songId);
        }
      });
    });
  });

  return likes;
}

function buildDataset({ songs, songArtists, artists, songMood, songActivity }) {
  const users = USERS.map(({ genres, ...rest }) => rest);
  const likes = buildLikes(songs);
  const timestamp = new Date().toISOString();

  return {
    metadata: {
      source: 'musicbrainz',
      generatedAt: timestamp,
      genres: GENRE_CONFIGS.map((config) => config.genre),
    },
    songs,
    artists,
    songArtists,
    songMood,
    songActivity,
    users,
    likes,
  };
}

function formatAsModule(dataset) {
  const banner = `// Auto-generated by scripts/playlist-curator/generateMusicbrainzDataset.js on ${dataset.metadata.generatedAt}`;
  const serialized = JSON.stringify(dataset, null, 2);
  return `${banner}\n\nexport const MUSICBRAINZ_DATASET = ${serialized};\n`;
}

async function main() {
  console.log('Fetching MusicBrainz recordings...');
  const collected = await collectRecordings();
  console.log(`Collected ${collected.songs.length} recordings.`);
  console.log('Fetching artist countries...');
  const artistEntries = await hydrateArtists(collected.artists);
  collected.artists = artistEntries;
  const dataset = buildDataset(collected);
  fs.writeFileSync(OUTPUT_PATH, formatAsModule(dataset));
  console.log(`Dataset written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
