# MusicBrainz Export Specification for Playlist Curator

## Goal
Produce a deterministic, reproducible extract from MusicBrainz that covers ~10k popular tracks with the metadata required by the playlist curator MVP. The export must map cleanly to the MusicBrainz-aligned schema while keeping room for future enrichment fields (BPM, energy, moods, activity tags).

## Guiding Principles
- **Open-data only**: Use MusicBrainz core data and the Cover Art Archive. Do not call licensed services.
- **Deterministic**: Each run with the same parameters should produce identical IDs and record counts.
- **Extensible**: Preserve MusicBrainz identifiers (MBIDs) so that downstream processes can enrich records with additional providers.
- **Modular**: Break the export into discrete CSV/JSON artifacts (tracks, artists, releases, genres, track-genre join table) to simplify ingestion and testing.

## High-level Flow
1. Select the target catalog slice (default: top releases from the last 20 years with official release status).
2. Download source data (MusicBrainz dump or web service) and normalize into staging tables.
3. Emit curated CSV/Parquet files with stable schemas ready for ETL ingestion.

## Source Options
| Option | Tooling | Pros | Cons | Recommended |
|--------|---------|------|------|-------------|
| **MusicBrainz data dumps** (`mbdump.tar.xz`) | `mbdump` SQL schema + PostgreSQL | Full dataset, bulk operations, deterministic | Large (~20GB compressed), requires PostgreSQL, slower setup | ✅ For initial ingest (one-off bulk load) |
| **MusicBrainz web service (WS2)** | HTTP + rate-limited API | Minimal setup, targeted queries | Strict rate limits (1 req/sec), pagination overhead, less deterministic | ⚠️ Use only for incremental updates |

## Extraction Parameters
- **Database snapshot**: Use the latest weekly MusicBrainz dump aligned with production release.
- **Entities**: `recording`, `release`, `artist`, `release_group`, `tag`, `genre`.
- **Filters**:
  - Release status: `Official`
  - Release group type: `Album`, `Single`, `EP` (exclude live/bootleg unless explicitly needed)
  - Recording length: between 60 and 600 seconds (drop extremely short/long tracks)
  - Language: prefer English, but allow `NULL` for instrumentals
  - Country: prioritize US/UK/CA/EU to keep dataset manageable (configurable)
- **Limit**: Target 10k tracks by ordering releases via a popularity proxy (e.g., MusicBrainz Ratings `rating.rating` when available, fallback to release date recency).

## Staging Schema (PostgreSQL)
Load the MusicBrainz dump into a PostgreSQL instance using the official `InitDb.pl` script. Create the following staging views to simplify exports:

```sql
-- Tracks with release + artist info
CREATE MATERIALIZED VIEW staging_tracks AS
SELECT
    r.id            AS recording_id,
    r.gid           AS recording_mbid,
    r.name          AS track_title,
    r.length        AS track_length_ms,
    rg.name         AS release_group_title,
    rel.name        AS release_title,
    rel.id          AS release_id,
    rel.gid         AS release_mbid,
    rel.release_date_year,
    rel.release_date_month,
    rel.release_date_day,
    a.id            AS artist_id,
    a.gid           AS artist_mbid,
    a.name          AS artist_name,
    rel.country     AS release_country,
    rel.status      AS release_status,
    rg.type         AS release_group_type
FROM recording r
JOIN recording_release rr       ON rr.recording = r.id
JOIN release rel                ON rel.id = rr.release
JOIN release_group rg           ON rg.id = rel.release_group
JOIN artist_credit ac           ON ac.id = r.artist_credit
JOIN artist_credit_name acn     ON acn.artist_credit = ac.id
JOIN artist a                   ON a.id = acn.artist
WHERE rel.status = 1 -- Official
  AND rg.type IN (1, 2, 3); -- Album, Single, EP
```

```sql
-- Track genre/tags (fallback to tag->genre mapping)
CREATE MATERIALIZED VIEW staging_track_genres AS
SELECT DISTINCT
    r.id            AS recording_id,
    COALESCE(g.name, t.name) AS genre_name,
    CASE WHEN g.name IS NOT NULL THEN 'genre' ELSE 'tag' END AS source_type
FROM recording r
LEFT JOIN l_recording_genre lrg ON lrg.entity0 = r.id
LEFT JOIN genre g               ON g.id = lrg.entity1
LEFT JOIN l_recording_tag lrt   ON lrt.entity0 = r.id
LEFT JOIN tag t                 ON t.id = lrt.entity1;
```

## Export Artifacts
| File | Description | Primary Key | Destination Table |
|------|-------------|-------------|-------------------|
| `tracks.csv` | Recording-level metadata | `recording_mbid` | `tracks` |
| `artists.csv` | Unique artists referenced by the selected tracks | `artist_mbid` | `artists` |
| `releases.csv` | Releases/Albums associated with selected tracks | `release_mbid` | `albums` |
| `track_genres.csv` | Many-to-many mapping of tracks to normalized genres | `recording_mbid + genre_name` | `track_genres` |
| `sources.csv` (optional) | Metadata about the export run (timestamp, dump version) | `source_id` | `sources` |

All exports should be UTF-8 encoded CSVs with headers. Consider providing Parquet variants if downstream tooling prefers columnar formats.

## Field Mapping to Target Schema
| Target Field | Source | Transformation | Notes |
|--------------|--------|----------------|-------|
| `id` | `recording_mbid` | Copy | Stored as string; maintain surrogate integer IDs only if legacy APIs require them. |
| `title` | `track_title` | Trim, title-case optional | Keep original capitalization; only normalize whitespace. |
| `artist` | `artist_name` | Copy | If multiple artists, join with `, ` or expose via join table for advanced usage. |
| `album` | `release_title` | Copy | |
| `genre` | `genre_name` | Map through canonical genre dictionary | Default to `Unknown` if no genre/tag present. |
| `release_year` | `COALESCE(release_date_year, extract(year from release_date))` | Copy | |
| `source` | Literal `'musicbrainz'` | Copy | Populate source table as well. |
| `bpm` | n/a | Set `NULL` | Stub field; optionally infer via heuristics later. |
| `energy` | n/a | Set `NULL` | Stub field. |
| `mood` | n/a | Set `NULL` | Stub field. |
| `activity_tags` | n/a | Set empty array | Stub field. |
| `cover_art_url` | Cover Art Archive API using `release_mbid` | Fetch best quality front cover; fallback to placeholder URL | Optional step; store `NULL` if not found. |

## Export Script Outline
Use Python with `psycopg2` or `asyncpg` to run the staging queries and emit CSV files.

```python
import csv
import psycopg2
from pathlib import Path

OUTPUT_DIR = Path("exports/musicbrainz")

QUERIES = {
    "tracks": "SELECT recording_mbid, track_title, artist_name, release_title, release_group_title, release_date_year, release_country FROM curated_tracks",  # curated view filters applied
    "artists": "SELECT DISTINCT artist_mbid, artist_name FROM curated_tracks",
    "releases": "SELECT DISTINCT release_mbid, release_title, release_date_year, release_country FROM curated_tracks",
    "track_genres": "SELECT recording_mbid, normalized_genre FROM curated_track_genres"
}

with psycopg2.connect(dsn) as conn:
    for name, query in QUERIES.items():
        with conn.cursor() as cur:
            cur.execute(query)
            headers = [col[0] for col in cur.description]
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            with (OUTPUT_DIR / f"{name}.csv").open("w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(cur)
```

> **Note:** Replace `curated_tracks` with a final view that includes ranking/limiting logic (e.g., rating-based ordering + `LIMIT 10000`).

## Normalized Genre Dictionary
Maintain a mapping table to standardize genres/tags.

```csv
source_value,normalized_genre
"rock","Rock"
"alternative rock","Alternative Rock"
"hip hop","Hip-Hop"
"pop","Pop"
"electronic","Electronic"
"jazz","Jazz"
"classical","Classical"
"soundtrack","Soundtrack"
"unknown","Unknown"
```

During export, lower-case and strip punctuation before lookup. Unknown values should map to `Unknown`.

## Validation Checklist
- [ ] Track count matches configured limit (default 10,000 ± tolerance for ties).
- [ ] No nulls for required fields (`recording_mbid`, `track_title`, `artist_name`, `release_title`).
- [ ] Genre coverage ≥ 85% (fallback to `Unknown` otherwise).
- [ ] Release years populated for ≥ 95% of records.
- [ ] All CSV files pass schema validation (column headers + types) and are under 200MB each.
- [ ] Sample 25 random tracks to verify artist/album associations.
- [ ] Cover art URLs either valid HTTP links or `NULL`/placeholder.

## Deliverables
- `docs/playlist-curator-musicbrainz-export-spec.md` (this document)
- SQL scripts for staging views (`sql/staging_musicbrainz/*.sql`)
- Python export script (`scripts/export_musicbrainz_catalog.py`)
- Genre normalization CSV (`data/genre_mappings.csv`)

The latter three artifacts will be implemented in subsequent subtasks. This specification unblocks the ETL prototype workstream and documents the requirements for the schema migration task.
