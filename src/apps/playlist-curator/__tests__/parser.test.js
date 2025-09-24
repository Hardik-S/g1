import { parseQuery } from '../nlp/parser';
import { EXAMPLE_QUERIES } from '../nlp/lexicon';

const expectOk = (result, query) => {
  expect(result.status).toBe('ok');
  expect(result.expression).toBeTruthy();
  expect(Array.isArray(result.steps)).toBe(true);
};

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
    expect(titles).not.toContain('Acoustic Dawn');
  });
});
