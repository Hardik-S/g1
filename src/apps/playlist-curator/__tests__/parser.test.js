import { parseQuery } from '../nlp/parser';
import { EXAMPLE_QUERIES } from '../nlp/lexicon';
import { getActiveSourceId, getRelation, setActiveSourceId } from '../data/seed';

const expectOk = (result, query) => {
  expect(result.status).toBe('ok');
  expect(result.expression).toBeTruthy();
  expect(Array.isArray(result.steps)).toBe(true);
};

describe('playlist curator parser', () => {
  const defaultSource = getActiveSourceId();

  afterEach(() => {
    setActiveSourceId(defaultSource);
  });

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

  test('updates sources relation when toggling providers', () => {
    setActiveSourceId(defaultSource);
    const initialSources = getRelation('Sources').rows;
    const primaryRow = initialSources.find((row) => row.sourceId === defaultSource);
    expect(primaryRow?.isPrimary).toBe(true);

    const alternate = initialSources.find((row) => row.sourceId !== defaultSource);
    expect(alternate).toBeDefined();

    setActiveSourceId(alternate.sourceId);
    const toggledSources = getRelation('Sources').rows;
    const toggledPrimary = toggledSources.find((row) => row.sourceId === alternate.sourceId);
    expect(toggledPrimary?.isPrimary).toBe(true);
    const defaultEntry = toggledSources.find((row) => row.sourceId === defaultSource);
    expect(defaultEntry?.isPrimary).toBe(false);
  });

  test('limits parsed query results to the active source catalog', () => {
    const query = 'List chill acoustic songs not liked by Alex.';

    setActiveSourceId(defaultSource);
    const defaultResult = parseQuery(query);
    expectOk(defaultResult, query);
    defaultResult.result.rows.forEach((row) => {
      expect(row.values.source).toBe(defaultSource);
    });

    const alternateSource = getRelation('Sources').rows.find((row) => row.sourceId !== defaultSource);
    expect(alternateSource).toBeDefined();

    setActiveSourceId(alternateSource.sourceId);
    const alternateResult = parseQuery(query);
    expectOk(alternateResult, query);
    alternateResult.result.rows.forEach((row) => {
      expect(row.values.source).toBe(alternateSource.sourceId);
    });
  });
});
