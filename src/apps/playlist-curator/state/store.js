import { create } from 'zustand';
import { EXAMPLE_QUERIES } from '../nlp/lexicon';
import { parseQuery } from '../nlp/parser';

const buildState = (query) => ({ query, parse: parseQuery(query) });

export const usePlaylistCuratorStore = create((set, get) => ({
  ...buildState(''),
  setQuery: (value) => set(buildState(value)),
  loadExample: (value) => set(buildState(value)),
  clear: () => set(buildState('')),
  randomExample: () => {
    const pool = EXAMPLE_QUERIES;
    const sample = pool[Math.floor(Math.random() * pool.length)];
    set(buildState(sample));
  },
}));

export const selectQuery = (state) => state.query;
export const selectParse = (state) => state.parse;
export const selectActions = (state) => ({
  setQuery: state.setQuery,
  loadExample: state.loadExample,
  clear: state.clear,
  randomExample: state.randomExample,
});
