import {
  ACTIVITIES,
  DECADE_RANGES,
  EXAMPLE_QUERIES,
  GENRES,
  MOODS,
  RANGE_KEYWORDS,
  SAMPLE_GROUP_MEMBERS,
  USERS,
} from './lexicon';
import { WIDE_VIEW_COLUMNS } from '../data/schema';
import {
  baseNode,
  differenceNode,
  divisionNode,
  intersectionNode,
  joinNode,
  productNode,
  projectNode,
  resetIdCounter,
  selectNode,
  unionNode,
} from '../ra/types';
import { buildPredicate } from '../ra/predicates';
import { executePlan } from '../ra/executor';
import { formatNode } from '../ra/format';

const firstOrNull = (values) => (values.length > 0 ? values[0] : null);

const findUserByName = (name) => USERS.find((user) => user.name.toLowerCase() === name.toLowerCase());

const extractUsers = (lowerText) =>
  USERS.filter((user) => lowerText.includes(user.name.toLowerCase())).map((user) => user.name);

const extractGenres = (lowerText) => GENRES.filter((genre) => lowerText.includes(genre.toLowerCase()));
const extractMoods = (lowerText) => MOODS.filter((mood) => lowerText.includes(mood.toLowerCase()));
const extractActivities = (lowerText) => ACTIVITIES.filter((activity) => lowerText.includes(activity.toLowerCase()));

const extractCountry = (text) => {
  const match = text.match(/from ([A-Za-z ]+)/i);
  if (match) {
    return match[1].trim().replace(/[.,!?]+$/, '');
  }
  return null;
};

const extractYearRange = (text) => {
  const ranges = [];
  const explicitMatch = text.match(/(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}/);
  if (explicitMatch) {
    const start = parseInt(explicitMatch[0].split(/[-–]/)[0].trim(), 10);
    const end = parseInt(explicitMatch[0].split(/[-–]/)[1].trim(), 10) + 1;
    ranges.push({ start, end });
  }

  DECADE_RANGES.forEach((decade) => {
    if (text.toLowerCase().includes(decade.label.toLowerCase())) {
      ranges.push({ start: decade.start, end: decade.end });
    }
  });

  if (text.toLowerCase().includes("00s")) {
    ranges.push({ start: 2000, end: 2010 });
  }

  return ranges;
};

const extractBpmComparison = (text) => {
  const lower = text.toLowerCase();
  const bpmMatch = lower.match(/bpm\s+(over|under|at least|at most)?\s*(\d+)/);
  if (!bpmMatch) {
    return null;
  }
  const keyword = bpmMatch[1] ?? 'over';
  const value = parseInt(bpmMatch[2], 10);
  const keywordConfig = RANGE_KEYWORDS.find((entry) => entry.keyword === keyword) ?? { comparison: '>' };
  return { operator: keywordConfig.comparison, value };
};

const buildBaseFilterPlan = (entities, options = {}) => {
  const clauses = [];
  if (entities.genre) {
    clauses.push({ type: 'includes', field: 'genres', value: entities.genre });
  }
  if (entities.mood) {
    clauses.push({ type: 'includes', field: 'moods', value: entities.mood });
  }
  if (entities.activity) {
    clauses.push({ type: 'includes', field: 'activities', value: entities.activity });
  }
  if (entities.yearRange) {
    clauses.push({
      type: 'between',
      field: 'releaseYear',
      min: entities.yearRange.start,
      max: entities.yearRange.end,
    });
  }
  if (entities.bpm) {
    clauses.push({ type: 'comparison', field: 'bpm', operator: entities.bpm.operator, value: entities.bpm.value });
  }

  const predicate = buildPredicate(clauses);
  let root = selectNode(baseNode('SongWideView', 'Songs'), predicate);

  if (options.country) {
    const songs = baseNode('Songs');
    const artists = baseNode('Artists');
    const joinSongs = joinNode(root, songs, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
    const joinArtists = joinNode(joinSongs, artists, { pairs: [{ leftField: 'primaryArtistId', rightField: 'artistId' }] });
    const countryPredicate = buildPredicate([{ type: 'equals', field: 'country', value: options.country }]);
    root = selectNode(joinArtists, countryPredicate);
  }

  return root;
};

const buildBothUsersLikePlan = (userA, userB) => {
  const likesBase = baseNode('Likes');
  const songsWide = baseNode('SongWideView', 'Songs');

  const predicateA = buildPredicate([{ type: 'equals', field: 'userId', value: userA.id }]);
  const predicateB = buildPredicate([{ type: 'equals', field: 'userId', value: userB.id }]);

  const likesA = selectNode(likesBase, predicateA);
  const likesB = selectNode(baseNode('Likes'), predicateB);

  const joinA = joinNode(likesA, songsWide, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
  const joinB = joinNode(likesB, songsWide, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });

  return intersectionNode(joinA, joinB);
};

const buildNotLikedPlan = (baseFilter, user) => {
  const likesBase = baseNode('Likes');
  const songsWide = baseNode('SongWideView', 'Songs');
  const predicate = buildPredicate([{ type: 'equals', field: 'userId', value: user.id }]);
  const likes = selectNode(likesBase, predicate);
  const likedSongs = joinNode(likes, songsWide, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
  const projected = projectNode(likedSongs, WIDE_VIEW_COLUMNS);
  return differenceNode(baseFilter, projected);
};

const buildDivisionPlan = (groupName) => {
  const groupUsers = SAMPLE_GROUP_MEMBERS[groupName];
  if (!groupUsers || groupUsers.length === 0) {
    return null;
  }

  const usersBase = baseNode('Users');
  const likesBase = baseNode('Likes');
  const songsWide = baseNode('SongWideView', 'Songs');

  const predicateUsers = buildPredicate([{ type: 'equals', field: 'group', value: groupName }]);
  const usersFiltered = selectNode(usersBase, predicateUsers);
  const likesJoin = joinNode(likesBase, usersFiltered, { pairs: [{ leftField: 'userId', rightField: 'userId' }] });
  const likesProjected = projectNode(likesJoin, ['songId', 'userId']);
  const divisor = projectNode(usersFiltered, ['userId']);
  const songsLikedByAll = divisionNode(likesProjected, divisor);
  return joinNode(songsLikedByAll, songsWide, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
};

const buildSymmetricDifferencePlan = (genreA, genreB) => {
  const predicateA = buildPredicate([{ type: 'includes', field: 'genres', value: genreA }]);
  const predicateB = buildPredicate([{ type: 'includes', field: 'genres', value: genreB }]);
  const base = baseNode('SongWideView', 'Songs');
  const relA = selectNode(base, predicateA);
  const relB = selectNode(baseNode('SongWideView', 'Songs'), predicateB);
  const intersection = intersectionNode(relA, relB);
  const united = unionNode(relA, relB);
  return differenceNode(united, intersection);
};

const buildDuetPlan = () => {
  const songs = baseNode('Songs');
  const wide = baseNode('SongWideView', 'Songs');
  const songArtists = baseNode('SongArtists');
  const artists = baseNode('Artists');

  const duetPredicate = buildPredicate([{ type: 'boolean', field: 'isDuet', value: true }]);
  const duetSongs = selectNode(songs, duetPredicate);
  const joinArtists = joinNode(duetSongs, songArtists, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
  const joinWithNames = joinNode(joinArtists, artists, { pairs: [{ leftField: 'artistId', rightField: 'artistId' }] });
  const projected = projectNode(joinWithNames, ['songId']);
  return joinNode(projected, wide, { pairs: [{ leftField: 'songId', rightField: 'songId' }] });
};

const buildProjectionPlan = (genre) => {
  const predicate = buildPredicate([{ type: 'includes', field: 'genres', value: genre }]);
  const base = baseNode('SongWideView', 'Songs');
  const filtered = selectNode(base, predicate);
  return projectNode(filtered, ['title', 'artists']);
};

const buildCartesianPlan = (genre, rangeStart, rangeEnd, activity) => {
  const base = baseNode('SongWideView', 'Songs');
  const clauses = [
    { type: 'includes', field: 'genres', value: genre },
    { type: 'between', field: 'releaseYear', min: rangeStart, max: rangeEnd },
  ];
  const predicate = buildPredicate(clauses);
  const filteredSongs = selectNode(base, predicate);
  const projectedSongs = projectNode(filteredSongs, ['songId', 'title', 'genres', 'releaseYear']);
  const activityPredicate = buildPredicate([{ type: 'equals', field: 'activityTag', value: activity }]);
  const activitySelection = selectNode(baseNode('SongActivity'), activityPredicate);
  const activityRelation = projectNode(activitySelection, ['activityTag']);
  return productNode(projectedSongs, activityRelation);
};

const describeFallback = (query, entities) => ({
  status: 'error',
  query,
  entities,
  message: 'The rules engine could not understand this request yet.',
  suggestions: [
    'Try using one of the example queries to learn supported phrasing.',
    'Specify genres, moods, decades, or users to anchor the parser.',
  ],
  examples: EXAMPLE_QUERIES,
});

const finalizePlan = (query, root, entities) => {
  resetIdCounter();
  const execution = executePlan(root);
  const expression = formatNode(root);
  return {
    status: 'ok',
    query,
    entities,
    expression,
    steps: execution.steps,
    result: execution.result,
  };
};

export const parseQuery = (rawQuery) => {
  const query = rawQuery.trim();
  if (query.length === 0) {
    return {
      status: 'idle',
      query,
      message: 'Start by typing a music request such as "Find upbeat rock songs from the 2000s".',
      examples: EXAMPLE_QUERIES,
    };
  }

  const lower = query.toLowerCase();

  const detectedUsers = extractUsers(lower);
  const detectedGenres = extractGenres(lower);
  const detectedMoods = extractMoods(lower);
  const detectedActivities = extractActivities(lower);
  const yearRanges = extractYearRange(query);
  const bpm = extractBpmComparison(query);
  const country = extractCountry(query);

  const entities = {
    users: detectedUsers,
    genre: firstOrNull(detectedGenres),
    mood: firstOrNull(detectedMoods),
    activity: firstOrNull(detectedActivities),
    yearRange: firstOrNull(yearRanges),
    bpm,
    country,
  };

  const bothMatch = query.match(/both\s+([A-Za-z]+)\s+and\s+([A-Za-z]+)\s+like/i);
  if (bothMatch) {
    const userA = findUserByName(bothMatch[1]);
    const userB = findUserByName(bothMatch[2]);
    if (userA && userB) {
      const root = buildBothUsersLikePlan(userA, userB);
      return finalizePlan(query, root, entities);
    }
  }

  const notLikedMatch = query.match(/not\s+liked\s+by\s+([A-Za-z]+)/i);
  if (notLikedMatch) {
    const user = findUserByName(notLikedMatch[1]);
    if (user) {
      const baseFilter = buildBaseFilterPlan(entities);
      const root = buildNotLikedPlan(baseFilter, user);
      return finalizePlan(query, root, entities);
    }
  }

  const everyMemberMatch = query.match(/every\s+member\s+of\s+([A-Za-z]+)/i);
  if (everyMemberMatch) {
    const groupName = everyMemberMatch[1];
    const root = buildDivisionPlan(groupName);
    if (root) {
      return finalizePlan(query, root, entities);
    }
  }

  const eitherMatch = query.match(/either\s+([A-Za-z\- ]+)\s+or\s+([A-Za-z\- ]+),?\s+but\s+not\s+both/i);
  if (eitherMatch) {
    const genreA = eitherMatch[1].trim().toLowerCase();
    const genreB = eitherMatch[2].trim().toLowerCase();
    if (GENRES.includes(genreA) && GENRES.includes(genreB)) {
      const root = buildSymmetricDifferencePlan(genreA, genreB);
      return finalizePlan(query, root, entities);
    }
  }

  if (query.toLowerCase().includes('duet')) {
    const root = buildDuetPlan();
    return finalizePlan(query, root, entities);
  }

  const projectMatch = query.match(/project\s+only\s+title\s+and\s+artist/i);
  if (projectMatch && entities.genre) {
    const root = buildProjectionPlan(entities.genre);
    return finalizePlan(query, root, entities);
  }

  if (query.toLowerCase().includes('cartesian') || query.toLowerCase().includes('pair')) {
    if (entities.genre && entities.yearRange && entities.activity) {
      const root = buildCartesianPlan(entities.genre, entities.yearRange.start, entities.yearRange.end, entities.activity);
      return finalizePlan(query, root, entities);
    }
  }

  if (entities.genre || entities.mood || entities.activity || entities.yearRange || entities.bpm) {
    const root = buildBaseFilterPlan(entities, { country: country ? country.trim() : null });
    return finalizePlan(query, root, entities);
  }

  return describeFallback(query, entities);
};
