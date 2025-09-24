import { FormEvent, useMemo, useState } from 'react';
import { placeholderWords } from '../data/placeholderWords';
import { useSelection } from '../context/SelectionContext';

export function SearchPanel() {
  const { selectedWordId, setSelectedWordId } = useSelection();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return placeholderWords;
    }

    return placeholderWords.filter((entry) => {
      const wordMatch = entry.word.toLowerCase().includes(trimmedQuery);
      const idMatch = entry.id.toLowerCase().includes(trimmedQuery);
      const familyMatch = entry.family.toLowerCase().includes(trimmedQuery);

      return wordMatch || idMatch || familyMatch;
    });
  }, [query]);

  const selectedWord = useMemo(
    () => placeholderWords.find((entry) => entry.id === selectedWordId) ?? null,
    [selectedWordId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (matches.length > 0) {
      setSelectedWordId(matches[0].id);
    }
  };

  return (
    <section className="panel" aria-labelledby="search-heading">
      <div className="panel-header">
        <h2 id="search-heading">Search</h2>
        <p>Preview the bundled dataset and choose a word to inspect in the visualisations.</p>
      </div>
      <div className="panel-body">
        <form className="search-form" role="search" aria-label="Search etymology dataset" onSubmit={handleSubmit}>
          <label htmlFor="word-search">Search for a word</label>
          <input
            id="word-search"
            type="search"
            name="word-search"
            placeholder="Type part of a word or language family"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="button-primary">
            Select top match
          </button>
        </form>
        <ul className="search-results" role="listbox" aria-label="Search suggestions">
          {matches.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedWordId === entry.id}
                onClick={() => setSelectedWordId(entry.id)}
              >
                <span className="result-word">{entry.word}</span>
                <span className="result-language">{entry.language}</span>
              </button>
            </li>
          ))}
        </ul>
        {matches.length === 0 ? (
          <p role="status">No entries match that query yet. Try another spelling.</p>
        ) : null}
        <div className="selection-announce" aria-live="polite">
          {selectedWord ? (
            <span>
              Selected word: <strong>{selectedWord.word}</strong> — {selectedWord.summary}
            </span>
          ) : (
            <span>No word selected yet.</span>
          )}
        </div>
      </div>
    </section>
  );
}
