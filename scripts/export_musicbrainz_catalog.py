"""Export curated MusicBrainz staging views to CSV artifacts.

This helper connects to a PostgreSQL instance that hosts the MusicBrainz dump
and the staging helpers created by ``sql/staging_musicbrainz/001_create_views.sql``.
It materialises the CSVs referenced by the playlist curator migration plan so
downstream ETL jobs can ingest deterministic datasets without rebuilding the
queries.

Usage::

    python scripts/export_musicbrainz_catalog.py --dsn postgresql://... \
        --output-dir exports/musicbrainz

When ``--dsn`` is omitted the script falls back to the ``DATABASE_URL``
environment variable. The output directory is created if it does not exist.
"""

from __future__ import annotations

import argparse
import csv
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Sequence

import psycopg2


CURATED_TRACKS_QUERY = """
SELECT
    recording_mbid,
    track_title,
    primary_artist_name,
    primary_artist_mbid,
    release_title,
    release_group_title,
    release_mbid,
    release_group_mbid,
    release_date_year,
    release_country,
    track_length_ms,
    release_group_type,
    release_status,
    barcode,
    packaging,
    first_release_date,
    row_number
FROM staging_musicbrainz.curated_tracks
ORDER BY row_number;
"""

CURATED_ARTISTS_QUERY = """
SELECT DISTINCT
    primary_artist_mbid AS artist_mbid,
    primary_artist_name AS artist_name
FROM staging_musicbrainz.curated_tracks
ORDER BY artist_name, artist_mbid;
"""

CURATED_RELEASES_QUERY = """
SELECT DISTINCT
    release_mbid,
    release_title,
    release_group_mbid,
    release_group_title,
    release_date_year,
    release_country,
    barcode,
    packaging
FROM staging_musicbrainz.curated_tracks
ORDER BY release_title, release_mbid;
"""

CURATED_TRACK_GENRES_QUERY = """
SELECT
    ct.recording_mbid,
    ctg.normalized_genre,
    ctg.source_type
FROM staging_musicbrainz.curated_track_genres ctg
JOIN staging_musicbrainz.curated_tracks ct
  ON ct.recording_id = ctg.recording_id
WHERE ctg.normalized_genre IS NOT NULL
ORDER BY ct.row_number, ctg.normalized_genre;
"""


@dataclass(frozen=True)
class ExportDefinition:
    name: str
    query: str
    headers: Sequence[str]


EXPORTS: List[ExportDefinition] = [
    ExportDefinition(
        name="tracks",
        query=CURATED_TRACKS_QUERY,
        headers=(
            "recording_mbid",
            "track_title",
            "primary_artist_name",
            "primary_artist_mbid",
            "release_title",
            "release_group_title",
            "release_mbid",
            "release_group_mbid",
            "release_date_year",
            "release_country",
            "track_length_ms",
            "release_group_type",
            "release_status",
            "barcode",
            "packaging",
            "first_release_date",
            "row_number",
        ),
    ),
    ExportDefinition(
        name="artists",
        query=CURATED_ARTISTS_QUERY,
        headers=("artist_mbid", "artist_name"),
    ),
    ExportDefinition(
        name="releases",
        query=CURATED_RELEASES_QUERY,
        headers=(
            "release_mbid",
            "release_title",
            "release_group_mbid",
            "release_group_title",
            "release_date_year",
            "release_country",
            "barcode",
            "packaging",
        ),
    ),
    ExportDefinition(
        name="track_genres",
        query=CURATED_TRACK_GENRES_QUERY,
        headers=("recording_mbid", "normalized_genre", "source_type"),
    ),
]


def batched(cursor, size: int = 1000) -> Iterator[Sequence[object]]:
    while True:
        rows = cursor.fetchmany(size)
        if not rows:
            return
        for row in rows:
            yield row


def export_table(connection, definition: ExportDefinition, output_dir: Path) -> Path:
    path = output_dir / f"{definition.name}.csv"
    with connection.cursor(name=f"export_{definition.name}") as cursor:
        cursor.itersize = 2000
        cursor.execute(definition.query)
        with path.open("w", newline="", encoding="utf-8") as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(definition.headers)
            for row in batched(cursor):
                writer.writerow(row)
    return path


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export curated MusicBrainz CSVs")
    parser.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL DSN (defaults to DATABASE_URL environment variable)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("exports/musicbrainz"),
        help="Directory where CSV files will be written",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log planned exports without executing any queries",
    )
    return parser.parse_args(list(argv) if argv is not None else None)


def main(argv: Iterable[str] | None = None) -> None:
    args = parse_args(argv)
    if not args.dsn:
        raise SystemExit("A PostgreSQL DSN must be provided via --dsn or DATABASE_URL")

    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        for definition in EXPORTS:
            print(f"[DRY RUN] Would export {definition.name} -> {output_dir / (definition.name + '.csv')}")
        return

    with psycopg2.connect(args.dsn) as connection:
        for definition in EXPORTS:
            path = export_table(connection, definition, output_dir)
            print(f"Exported {definition.name} ({path})")


if __name__ == "__main__":
    main()
