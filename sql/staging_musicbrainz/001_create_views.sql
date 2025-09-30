BEGIN;

CREATE SCHEMA IF NOT EXISTS staging_musicbrainz;

DROP MATERIALIZED VIEW IF EXISTS staging_musicbrainz.staging_tracks;
CREATE MATERIALIZED VIEW staging_musicbrainz.staging_tracks AS
SELECT
    r.id                AS recording_id,
    r.gid               AS recording_mbid,
    r.name              AS track_title,
    r.length            AS track_length_ms,
    rg.id               AS release_group_id,
    rg.gid              AS release_group_mbid,
    rg.name             AS release_group_title,
    rel.name            AS release_title,
    rel.id              AS release_id,
    rel.gid             AS release_mbid,
    rel.release_date_year,
    rel.release_date_month,
    rel.release_date_day,
    rel.country         AS release_country,
    rel.status          AS release_status,
    rg.type             AS release_group_type,
    ac.id               AS artist_credit_id,
    a.id                AS primary_artist_id,
    a.gid               AS primary_artist_mbid,
    a.name              AS primary_artist_name,
    r.first_release_date,
    rel.barcode,
    rel.packaging
FROM recording r
JOIN recording_release rr        ON rr.recording = r.id
JOIN release rel                 ON rel.id = rr.release
JOIN release_group rg            ON rg.id = rel.release_group
JOIN artist_credit ac            ON ac.id = r.artist_credit
JOIN artist_credit_name acn      ON acn.artist_credit = ac.id AND acn.position = 0
JOIN artist a                    ON a.id = acn.artist
WHERE rel.status = 1 -- Official
  AND rg.type IN (1, 2, 3) -- Album, Single, EP
  AND r.length BETWEEN 60000 AND 600000; -- 60s - 10m

CREATE UNIQUE INDEX IF NOT EXISTS idx_staging_tracks_recording
  ON staging_musicbrainz.staging_tracks (recording_id);

DROP MATERIALIZED VIEW IF EXISTS staging_musicbrainz.staging_track_genres;
CREATE MATERIALIZED VIEW staging_musicbrainz.staging_track_genres AS
SELECT DISTINCT
    r.id                AS recording_id,
    COALESCE(g.name, t.name) AS genre_name,
    CASE WHEN g.name IS NOT NULL THEN 'genre' ELSE 'tag' END AS source_type
FROM recording r
LEFT JOIN l_recording_genre lrg ON lrg.entity0 = r.id
LEFT JOIN genre g               ON g.id = lrg.entity1
LEFT JOIN l_recording_tag lrt   ON lrt.entity0 = r.id
LEFT JOIN tag t                 ON t.id = lrt.entity1;

CREATE INDEX IF NOT EXISTS idx_staging_track_genres_recording
  ON staging_musicbrainz.staging_track_genres (recording_id);

DROP MATERIALIZED VIEW IF EXISTS staging_musicbrainz.curated_tracks;
CREATE MATERIALIZED VIEW staging_musicbrainz.curated_tracks AS
WITH ranked AS (
  SELECT
      st.recording_id,
      st.recording_mbid,
      st.track_title,
      st.track_length_ms,
      st.release_group_id,
      st.release_group_mbid,
      st.release_group_title,
      st.release_title,
      st.release_id,
      st.release_mbid,
      st.release_date_year,
      st.release_date_month,
      st.release_date_day,
      st.release_country,
      st.release_status,
      st.release_group_type,
      st.artist_credit_id,
      st.primary_artist_id,
      st.primary_artist_mbid,
      st.primary_artist_name,
      st.first_release_date,
      st.barcode,
      st.packaging,
      COALESCE(rgr.rating, 0)          AS release_group_rating,
      COALESCE(rgr.rating_count, 0)    AS release_group_rating_count,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(rgr.rating, 0) DESC,
                 COALESCE(st.release_date_year, 0) DESC,
                 st.recording_id
      ) AS row_number
  FROM staging_musicbrainz.staging_tracks st
  LEFT JOIN release_group_rating_raw rgr ON rgr.release_group = st.release_group_id
)
SELECT *
FROM ranked
WHERE row_number <= 10000;

CREATE UNIQUE INDEX IF NOT EXISTS idx_curated_tracks_recording
  ON staging_musicbrainz.curated_tracks (recording_id);

DROP MATERIALIZED VIEW IF EXISTS staging_musicbrainz.curated_track_genres;
CREATE MATERIALIZED VIEW staging_musicbrainz.curated_track_genres AS
SELECT
    ct.recording_id,
    CASE
      WHEN stg.genre_name IS NULL THEN NULL
      ELSE LOWER(REGEXP_REPLACE(BTRIM(stg.genre_name), '\\s+', ' ', 'g'))
    END AS normalized_genre,
    stg.source_type
FROM staging_musicbrainz.curated_tracks ct
LEFT JOIN staging_musicbrainz.staging_track_genres stg
  ON stg.recording_id = ct.recording_id;

CREATE INDEX IF NOT EXISTS idx_curated_track_genres_recording
  ON staging_musicbrainz.curated_track_genres (recording_id);

COMMIT;
