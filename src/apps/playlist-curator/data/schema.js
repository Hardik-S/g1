export const RELATIONS = {
  Songs: {
    name: 'Songs',
    columns: [
      'songId',
      'title',
      'primaryArtistId',
      'releaseYear',
      'energy',
      'bpm',
      'isDuet',
      'sourceId',
      'releaseId',
      'releaseTitle',
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
      'genres',
      'releaseYear',
      'energy',
      'bpm',
      'sourceId',
      'releaseTitle',
      'coverArtUrl',
      'moods',
      'activities',
      'likedBy',
    ],
  },
  Releases: {
    name: 'Releases',
    columns: ['releaseId', 'title', 'year', 'coverArtUrl'],
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
    columns: ['sourceId', 'label', 'kind'],
  },
};

export const WIDE_VIEW_COLUMNS = RELATIONS.SongWideView.columns;
