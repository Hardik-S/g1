export const RELATIONS = {
  Songs: {
    name: 'Songs',
    columns: [
      'songId',
      'title',
      'primaryArtistId',
      'genre',
      'releaseYear',
      'energy',
      'bpm',
      'isDuet',
      'source',
      'releaseId',
      'coverArtUrl',
    ],
  },
  Artists: {
    name: 'Artists',
    columns: ['artistId', 'name', 'country'],
  },
  SongArtists: {
    name: 'SongArtists',
    columns: ['songId', 'artistId'],
  },
  SongMood: {
    name: 'SongMood',
    columns: ['songId', 'mood'],
  },
  SongActivity: {
    name: 'SongActivity',
    columns: ['songId', 'activityTag'],
  },
  Likes: {
    name: 'Likes',
    columns: ['userId', 'songId'],
  },
  Users: {
    name: 'Users',
    columns: ['userId', 'name', 'group'],
  },
  SongWideView: {
    name: 'SongWideView',
    columns: [
      'songId',
      'title',
      'artists',
      'genre',
      'releaseYear',
      'energy',
      'bpm',
      'source',
      'releaseTitle',
      'coverArtUrl',
      'moods',
      'activities',
      'likedBy',
    ],
  },
  Releases: {
    name: 'Releases',
    columns: ['releaseId', 'title', 'releaseYear', 'coverArtUrl'],
  },
  Genres: {
    name: 'Genres',
    columns: ['genreId', 'name'],
  },
  SongGenres: {
    name: 'SongGenres',
    columns: ['songId', 'genreId'],
  },
  Sources: {
    name: 'Sources',
    columns: ['sourceId', 'name', 'description', 'isPrimary'],
  },
};

export const WIDE_VIEW_COLUMNS = RELATIONS.SongWideView.columns;
