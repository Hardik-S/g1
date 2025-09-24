BEGIN;

-- Normalize primary key and add MusicBrainz-friendly columns on songs.
ALTER TABLE songs
  RENAME COLUMN IF EXISTS id TO song_id;

ALTER TABLE songs
  ALTER COLUMN song_id TYPE TEXT;

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS primary_artist_id TEXT,
  ADD COLUMN IF NOT EXISTS release_id TEXT,
  ADD COLUMN IF NOT EXISTS release_year INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS cover_art_url TEXT,
  ADD COLUMN IF NOT EXISTS is_duet BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS energy INTEGER,
  ADD COLUMN IF NOT EXISTS bpm INTEGER;

UPDATE songs
SET source = COALESCE(source, 'mock');

ALTER TABLE songs
  ALTER COLUMN source DROP DEFAULT;

-- Releases catalogue.
CREATE TABLE IF NOT EXISTS releases (
  release_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  release_year INTEGER,
  cover_art_url TEXT
);

-- Canonical genres and join table.
CREATE TABLE IF NOT EXISTS genres (
  genre_id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS song_genres (
  song_id TEXT NOT NULL REFERENCES songs(song_id) ON DELETE CASCADE,
  genre_id TEXT NOT NULL REFERENCES genres(genre_id) ON DELETE RESTRICT,
  PRIMARY KEY (song_id, genre_id)
);

-- Source providers.
CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_primary BOOLEAN DEFAULT FALSE
);

INSERT INTO sources (source_id, name, description, is_primary)
VALUES
  ('musicbrainz', 'MusicBrainz', 'MusicBrainz catalog export used for Playlist Curator.', TRUE),
  ('mock', 'Mock Seed', 'Legacy in-memory dataset used for demos and tests.', FALSE)
ON CONFLICT (source_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Supporting indexes for executor filters and joins.
CREATE INDEX IF NOT EXISTS idx_songs_release_year ON songs (release_year);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs (genre);
CREATE INDEX IF NOT EXISTS idx_songs_source ON songs (source);
CREATE INDEX IF NOT EXISTS idx_song_artists_song ON song_artists (song_id);
CREATE INDEX IF NOT EXISTS idx_song_genres_song ON song_genres (song_id);
CREATE INDEX IF NOT EXISTS idx_likes_song ON likes (song_id);

COMMIT;
