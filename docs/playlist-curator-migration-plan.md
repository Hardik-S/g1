# Playlist Curator Data Migration Plan

## Overview
This plan outlines how to replace the mock playlist curator database with a MusicBrainz-backed dataset while keeping the architecture extensible for future integrations (e.g., Spotify, Apple Music). It covers deliverables, task breakdowns, schema changes, and risks, organized into short- and medium-term roadmaps.

## Objectives
1. Import a curated MusicBrainz dataset that includes songs, artists, albums, genres, release years, and source attribution.
2. Update the relational schema, API surface, and frontend executors to operate with the enriched dataset.
3. Lay the groundwork for periodic synchronization and eventual third-party integrations without locking in to a single provider.

## Roadmap
### Phase 1 (Short-term: ~2 Weeks)
**Goal:** Transition from mock data to a MusicBrainz-derived dataset via one-off ingestion.

| Deliverable | Description | Owner | Dependencies |
|-------------|-------------|-------|--------------|
| MusicBrainz Export Spec | Document the exact MusicBrainz entities and relationships (recordings, releases, artists, genres/tags) and define the export pipeline (CSV/JSON). | Data Engineer | Access to MusicBrainz dump or API, storage location |
| ETL Prototype | Build a script that pulls/export MusicBrainz data, normalizes it into the curated schema, and writes to the production database. Include deduplication rules. | Data Engineer | Export Spec |
| Schema Migration | Update DB schema to add required columns (see schema diff), add indices, and generate migration scripts. | Backend Engineer | ETL Prototype |
| RA Executor Update | Adjust the resolver/executor layer to query the new schema, map stub fields, and support source toggling between mock and live DB. | Backend Engineer | Schema Migration |
| Frontend Pagination/Caching | Implement pagination controls, client-side caching, and loading states to handle larger datasets. | Frontend Engineer | RA Executor Update |
| QA & Validation | Validate data quality, run regression tests, and update documentation. | QA | Completion of above tasks |

### Phase 2 (Medium-term: 4–6 Weeks)
**Goal:** Automate sync and improve scalability.

| Deliverable | Description | Owner | Dependencies |
|-------------|-------------|-------|--------------|
| Incremental Sync Service | Create an automated job (daily/weekly) that fetches delta updates from MusicBrainz, applies ETL transformations, and merges into DB with conflict resolution. | Data Engineer | Phase 1 ETL |
| Monitoring & Alerts | Add observability to the sync pipeline (success/failure metrics, data volume, anomaly detection). | DevOps | Incremental Sync Service |
| Scalable Query Layer | Enhance RA executor to support server-side filtering (by genre, year, etc.), caching, and fallbacks between data sources. | Backend Engineer | Incremental Sync Service |
| Frontend Enhancements | Integrate advanced filtering, search, and possibly lazy-loaded details panels to improve UX with larger datasets. | Frontend Engineer | Scalable Query Layer |
| Integration Abstraction | Introduce a provider interface allowing alternative sources (Spotify, Apple Music). Provide stubs/mocks for non-open data. | Architect | Scalable Query Layer |

### Phase 3 (Optional / Future)
- Real-time integrations with authenticated APIs (Spotify) for user-specific data.
- Enrichment services for moods, BPM, and energy leveraging third-party APIs or ML inference.

## Task Breakdown
### ETL Pipeline
1. **Source Extraction**
   - Obtain MusicBrainz recording, release, artist, and tag dumps (CSV/JSON).
   - Filter for desired track types (e.g., studio recordings, exclude podcasts/live if undesired).
2. **Transformation**
   - Normalize naming conventions, handle special characters, and standardize date formats.
   - Map MusicBrainz genres/tags to our canonical genre list; add fallback for missing tags.
   - Generate surrogate keys compatible with existing mock schema expectations.
3. **Load**
   - Bulk insert into staging tables, run dedupe logic (by recording MBID, ISRC, or combination of title+artist+album).
   - Populate production tables via `INSERT ... SELECT` with conflict resolution (e.g., upsert on MBID).
4. **Validation**
   - Verify counts vs. expected totals, spot-check random entries, ensure referential integrity.

### Schema Alignment
1. Draft migration scripts (SQL/ORM) adding new columns (source, release_year, etc.) and reference tables.
2. Update data access layer to use MBIDs or stable IDs.
3. Modify RA executor to expose stubbed fields (BPM, energy, moods) with placeholder values until real data arrives.
4. Write migration rollback strategy and document seeding steps.

### UI & Caching
1. Introduce pagination parameters (page number, page size) and adjust queries.
2. Add caching layer (client-side or simple in-memory server cache) for frequently accessed lists.
3. Provide loading/skeleton states and error handling for large fetches.
4. Document toggles between mock data and MusicBrainz data for demos.

### Source Toggling
1. Abstract data provider interface with implementations for mock and MusicBrainz.
2. Provide configuration (env var, feature flag) to select provider at runtime.
3. Ensure tests run against mock provider while allowing integration tests with MusicBrainz subset.

## Schema Diff
| Field | Mock Schema | MusicBrainz-Aligned Schema | Status |
|-------|-------------|----------------------------|--------|
| `id` | Integer auto-increment | UUID / MBID-backed string | **Change** (migrate to string to store MBID; maintain surrogate key if needed) |
| `title` | String | String (recording title) | **Live** |
| `artist` | String | String (primary artist credit) | **Live** |
| `album` | String | String (release title) | **Live** |
| `genre` | Enum (limited) | String/Enum (mapped from MusicBrainz tags) | **Live**, requires mapping table |
| `release_year` | Integer (optional) | Integer (from release date) | **Live** |
| `source` | Not present | Enum (`musicbrainz`, `mock`, `spotify`, etc.) | **Live** (new column) |
| `bpm` | Integer (mocked) | Nullable Integer (not in MusicBrainz) | **Stub** (populate via heuristics or leave null) |
| `energy` | Integer (mocked) | Nullable Integer | **Stub** |
| `mood` | String (mocked) | Nullable String | **Stub** |
| `activity_tags` | Array<String> (mocked) | Nullable Array<String> | **Stub** |
| `cover_art_url` | String (mocked) | String (from Cover Art Archive when available) | **Live** (requires additional fetch; fallback to placeholder) |

### Additional Tables / Relationships
- **Artists Table**: Store artist MBID, name, aliases.
- **Albums (Releases) Table**: Store release MBID, title, release date, cover art link.
- **Track-to-Genre Mapping**: Many-to-many table linking tracks to normalized genres.
- **Sources Table (Optional)**: Metadata for each data provider.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Data volume (~10k tracks) slows queries | Medium | Implement pagination, indexing, caching early (Phase 1 deliverable). |
| MusicBrainz genre data inconsistent | Medium | Create mapping rules and fallback to "Unknown" genre; allow manual overrides. |
| Missing BPM/Energy data | Low | Mark fields as nullable/stubbed; plan enrichment phase once Spotify integration available. |
| Licensing concerns with future providers | High | Maintain source flag, document licensing constraints; keep non-open providers in demo-only mode. |
| Schema changes break mock demos | Medium | Provide provider toggle and ensure mock dataset updated to match new schema. |
| Incremental sync conflicts | Medium | Use deterministic keys (MBID), track updated timestamps, and build idempotent upserts. |

## Deliverables Checklist
- [ ] MusicBrainz export spec drafted and approved.
- [ ] ETL prototype ingests initial dataset into staging.
- [ ] Database schema migrated and documented.
- [ ] RA executor updated with provider abstraction and schema changes.
- [ ] Frontend supports pagination, caching, and source toggling UI/flags.
- [ ] Documentation updated (README, runbooks) with ingestion steps and configuration.
- [ ] Monitoring plan ready for medium-term automation.

## Documentation Updates
- Update README with overview of real-data mode vs mock mode.
- Add runbook for ETL execution and troubleshooting.
- Maintain schema diagram reflecting MusicBrainz alignment.

## Next Steps
1. Assign owners for Phase 1 deliverables and align on acceptance criteria.
2. Schedule MusicBrainz export dry run to validate tooling.
3. Kick off schema migration and executor updates in parallel (with feature flags) to minimize downtime.
4. Begin planning for Phase 2 automation to ensure smooth transition post-MVP.
