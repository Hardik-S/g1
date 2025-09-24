import './App.css';
import { AppToolbar } from './components/AppToolbar';
import { SearchPanel } from './components/SearchPanel';
import { TimelinePlaceholder } from './components/TimelinePlaceholder';
import { TreePlaceholder } from './components/TreePlaceholder';
import { placeholderWords } from './data/placeholderWords';
import { useSelection } from './context/SelectionContext';

function SelectedWordSummary() {
  const { selectedWordId } = useSelection();
  const selectedWord = placeholderWords.find((entry) => entry.id === selectedWordId);

  if (!selectedWord) {
    return <p aria-live="polite">Choose a word to view its forthcoming tree, timeline, and export options.</p>;
  }

  return (
    <p aria-live="polite">
      Preparing visuals for <strong>{selectedWord.word}</strong> ({selectedWord.language}). Expect linked tree, timeline, and
      export controls as the build advances.
    </p>
  );
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">EtymoSphere</h1>
        <p className="app-tagline">
          A forthcoming static explorer that connects search, collapsible trees, and chronological timelines to surface
          the stories inside etymological datasets.
        </p>
        <dl className="app-meta" aria-label="Project overview">
          <div>
            <dt>Dataset entries</dt>
            <dd>{placeholderWords.length}</dd>
          </div>
          <div>
            <dt>Visualisation stack</dt>
            <dd>D3.js + SVG</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Scaffolding in progress</dd>
          </div>
        </dl>
      </header>
      <main className="app-layout">
        <aside className="sidebar">
          <SearchPanel />
          <AppToolbar />
        </aside>
        <section className="visuals" aria-label="Preview panes">
          <TreePlaceholder />
          <TimelinePlaceholder />
        </section>
      </main>
      <footer className="app-footer">
        <SelectedWordSummary />
      </footer>
    </div>
  );
}

export default App;
