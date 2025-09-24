export const RELATIONS = {
  Songs: {
    name: 'Songs',
    columns: [
      'songId',
      'title',
      'primaryArtistId',
      'genre',
      'year',
      'energy',
      'bpm',
      'isDuet',
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
      'year',
      'energy',
      'bpm',
      'moods',
      'activities',
      'likedBy',
    ],
  },
};

export const WIDE_VIEW_COLUMNS = RELATIONS.SongWideView.columns;
