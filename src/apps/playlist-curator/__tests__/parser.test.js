import { parseQuery } from '../nlp/parser';
import { EXAMPLE_QUERIES } from '../nlp/lexicon';
import { getRelation, setActiveSource } from '../data/seed';

const expectOk = (result, query) => {
  expect(result.status).toBe('ok');
  expect(result.expression).toBeTruthy();
  expect(Array.isArray(result.steps)).toBe(true);
};

const sourceRows = getRelation('Sources').rows;
const DEFAULT_SOURCE_ID = sourceRows.find((source) => source.isPrimary)?.sourceId ?? sourceRows[0]?.sourceId;
const MOCK_SOURCE_ID = sourceRows.find((source) => source.sourceId === 'mock' && source.sourceId !== DEFAULT_SOURCE_ID)?.sourceId
  ?? sourceRows.find((source) => source.sourceId !== DEFAULT_SOURCE_ID)?.sourceId
  ?? null;

beforeEach(() => {
  if (DEFAULT_SOURCE_ID) {
    setActiveSource(DEFAULT_SOURCE_ID);
  }
});

afterAll(() => {
  if (DEFAULT_SOURCE_ID) {
    setActiveSource(DEFAULT_SOURCE_ID);
  }
});

describe('playlist curator parser', () => {
  test('parses curated examples without falling back', () => {
    EXAMPLE_QUERIES.forEach((query) => {
      const result = parseQuery(query);
      expectOk(result, query);
    });
  });

  test('suggests repair for unsupported phrasing', () => {
    const result = parseQuery('Show me something surprising without context');
    expect(result.status).toBe('error');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test('excludes songs liked by Alex from chill acoustic request', () => {
    const query = 'List chill acoustic songs not liked by Alex.';
    const result = parseQuery(query);
    expectOk(result, query);
    const titles = result.result.rows.map((row) => row.values.title);
    expect(titles).not.toContain('Ogbaje Acoustic');
  });

  const providerTest = MOCK_SOURCE_ID ? test : test.skip;

  providerTest('marks toggled source as primary and filters relations', () => {
    const baselineWide = getRelation('SongWideView').rows.length;
    setActiveSource(MOCK_SOURCE_ID);
    const sources = getRelation('Sources').rows;
    const mockEntry = sources.find((entry) => entry.sourceId === MOCK_SOURCE_ID);
    expect(mockEntry?.isPrimary).toBe(true);
    if (DEFAULT_SOURCE_ID && DEFAULT_SOURCE_ID !== MOCK_SOURCE_ID) {
      const primaryEntry = sources.find((entry) => entry.sourceId === DEFAULT_SOURCE_ID);
      expect(primaryEntry?.isPrimary).toBe(false);
    }
    const filteredWide = getRelation('SongWideView').rows.length;
    expect(filteredWide).toBeLessThanOrEqual(baselineWide);
  });

  providerTest('limits parser execution to the selected provider catalog', () => {
    setActiveSource(MOCK_SOURCE_ID);
    const result = parseQuery('Find upbeat rock songs from the 2000s for working out.');
    expect(result.status).toBe('ok');
    const providerWide = getRelation('SongWideView').rows;
    if (providerWide.length === 0) {
      expect(result.result.rows.length).toBe(0);
    } else if (result.result.rows.length > 0) {
      const allSources = new Set(result.result.rows.map((row) => row.values.source));
      expect(allSources.size).toBe(1);
      expect(allSources.has(MOCK_SOURCE_ID)).toBe(true);
    }
  });
});
