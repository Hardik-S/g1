import React from 'react';
import './PlaylistCuratorApp.css';
import { QueryInputPanel } from './QueryInputPanel';
import { RAExpressionCard } from './RAExpressionCard';
import { ExecutionTimeline } from './ExecutionTimeline';
import { ResultCard } from './ResultCard';
import { ExamplesTray } from './ExamplesTray';
import { selectActions, selectParse, selectQuery, usePlaylistCuratorStore } from '../state/store';

const usePlaylistCurator = () => {
  const query = usePlaylistCuratorStore(selectQuery);
  const parse = usePlaylistCuratorStore(selectParse);
  const actions = usePlaylistCuratorStore(selectActions);
  return { query, parse, actions };
};

export const PlaylistCuratorApp = () => {
  const { query, parse, actions } = usePlaylistCurator();

  return (
    <div className="pc-shell">
      <header className="pc-header">
        <div>
          <h1 className="pc-title">Playlist Curator</h1>
          <p className="pc-subtitle">Translate natural language music requests into relational algebra.</p>
        </div>
        <div>
          {parse.status === 'ok' ? (
            <span className="pc-status-ok">Parser confidence: deterministic</span>
          ) : parse.status === 'error' ? (
            <span className="pc-status-error">Unable to build a plan</span>
          ) : (
            <span className="pc-hint">Awaiting input…</span>
          )}
        </div>
      </header>
      <div className="pc-content">
        <QueryInputPanel
          query={query}
          parse={parse}
          onChange={actions.setQuery}
          onClear={actions.clear}
          onRandom={actions.randomExample}
        />
        <RAExpressionCard parse={parse} />
        <ExecutionTimeline steps={parse.steps ?? []} />
        <ResultCard parse={parse} />
        <ExamplesTray onSelect={actions.loadExample} />
      </div>
    </div>
  );
};

export default PlaylistCuratorApp;
