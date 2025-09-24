# Playlist Curator MusicBrainz-Aligned Schema

The Playlist Curator now stores MusicBrainz-backed identifiers and metadata so
that the executor, frontend, and future integrations share a single canonical
contract. This document captures the live relational model, indexes, migration
script, and rollback guidance.

## Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `songs` | Recording-level catalog sourced from MusicBrainz. | `song_id` (MBID string), `primary_artist_id`, `release_id`, `genre`, `release_year`, `source`, `energy`, `bpm`, `cover_art_url`, `is_duet` |
| `artists` | Unique artist credits referenced by selected recordings. | `artist_id` (MBID string), `name`, `country` |
| `song_artists` | Link table between songs and artists (supports duets and features). | `song_id`, `artist_id` |
| `releases` | Album/release metadata used for cover art and year attribution. | `release_id` (MBID string), `title`, `release_year`, `cover_art_url` |
| `genres` | Canonical genre dictionary mapped from MusicBrainz tags. | `genre_id` (slug), `name` |
| `song_genres` | Many-to-many join between songs and canonical genres. | `song_id`, `genre_id` |
| `song_mood` | Stubbed mood annotations (nullable, retained for future enrichment). | `song_id`, `mood` |
| `song_activity` | Stubbed activity tags (nullable array until enrichment lands). | `song_id`, `activity_tag` |
| `users` | Demo users for relational exercises. | `user_id`, `name`, `group` |
| `likes` | Demo user ↔ song like relationships. | `user_id`, `song_id` |
| `sources` | Catalog providers available to the executor. | `source_id`, `name`, `description`, `is_primary` |

### Derived View

`SongWideView` is a materialised helper produced by
`src/apps/playlist-curator/data/seed.js`. It contains denormalised columns used
by the relational algebra executor and UI:

```
(song_id, title, artists, genre, release_year, energy, bpm, source,
 release_title, cover_art_url, moods, activities, liked_by)
```

Each wide row joins `songs`, `song_artists`, `artists`, `song_mood`,
`song_activity`, `likes`, and `releases`. The `source` column is the provider
ID (`musicbrainz`, `mock`, ...); friendly names come from the `sources` table.

## Migration Script

The live schema is backed by
[`sql/playlist-curator/001_musicbrainz_schema.sql`](../sql/playlist-curator/001_musicbrainz_schema.sql).
Run it against the existing database to migrate from the legacy mock schema:

```sh
psql "$DATABASE_URL" -f sql/playlist-curator/001_musicbrainz_schema.sql
```

The script performs the following actions:

1. Renames and widens song identifiers to store MusicBrainz MBIDs (`TEXT`).
2. Adds `release_year`, `source`, `release_id`, and `cover_art_url` columns to
   `songs` with sensible defaults.
3. Creates `releases`, `genres`, `song_genres`, and `sources` tables if they do
   not exist.
4. Seeds the `sources` table with `musicbrainz` and `mock` providers.
5. Adds supporting indexes on foreign-key pairs (`song_artists`, `song_genres`,
   `likes`) and on `songs.release_year`, `songs.genre`, and `songs.source` for
   executor filters.

## Rollback Strategy

To revert to the legacy mock schema:

1. Export the new tables (`releases`, `genres`, `song_genres`, `sources`) for
   safekeeping.
2. Drop the added foreign-key tables and indexes:
   ```sql
   DROP TABLE IF EXISTS song_genres;
   DROP TABLE IF EXISTS genres;
   DROP TABLE IF EXISTS releases;
   DROP TABLE IF EXISTS sources;
   DROP INDEX IF EXISTS idx_songs_release_year;
   DROP INDEX IF EXISTS idx_songs_genre;
   DROP INDEX IF EXISTS idx_songs_source;
   DROP INDEX IF EXISTS idx_song_artists_song;
   DROP INDEX IF EXISTS idx_song_genres_song;
   DROP INDEX IF EXISTS idx_likes_song;
   ```
3. Rename `song_id` back to the legacy integer surrogate (if it still exists)
   and cast the column to `INTEGER` using the archived IDs.
4. Remove the added `release_year`, `release_id`, `source`, and
   `cover_art_url` columns from `songs`.

Because the executor and UI now depend on `release_year` and `source`, only run
this rollback on isolated environments; production should remain on the MBID
schema.

## Seeding Notes

- `scripts/playlist-curator/generateMusicbrainzDataset.js` (referenced in the
  dataset file header) produces `musicbrainzDataset.js` with MusicBrainz exports.
- `src/apps/playlist-curator/data/seed.js` normalises those exports into the
  relations documented above and materialises `SongWideView`.
- `DATASET` (exported from `seed.js`) now exposes `songs`, `releases`, `genres`,
  `songGenres`, and `sources` so the NLP lexicon and executor can inspect the
  new schema directly.

Keep this document and the SQL migration script updated whenever the schema
changes so downstream tooling, ETL jobs, and curriculum materials remain in
sync.
