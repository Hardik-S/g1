import React, { useState } from 'react';
import '../NamecraftApp.css';

const defaultNameDraft = () => ({ label: '', meaning: '', phonetics: '', tags: '' });
const defaultScenarioDraft = () => ({ title: '', goal: '', stressTest: '', riskNotes: '' });

const RoomEditor = ({ room, updateRoom, helpers, onRunTest, newNameInputRef }) => {
  const [nameDraft, setNameDraft] = useState(defaultNameDraft);
  const [scenarioDraft, setScenarioDraft] = useState(defaultScenarioDraft);

  const addName = () => {
    if (!nameDraft.label.trim()) {
      return;
    }
    updateRoom((current) =>
      helpers.addCandidateName(current, {
        ...nameDraft,
        tags: nameDraft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
    );
    setNameDraft(defaultNameDraft());
    newNameInputRef?.current?.focus();
  };

  const addScenario = () => {
    if (!scenarioDraft.title.trim()) {
      return;
    }
    updateRoom((current) => helpers.addScenario(current, scenarioDraft));
    setScenarioDraft(defaultScenarioDraft());
  };

  return (
    <section className="namecraft-panel" aria-labelledby="namecraft-editor-heading">
      <div className="namecraft-results-header">
        <h2 id="namecraft-editor-heading">Design Canvas</h2>
        <div className="namecraft-keyboard-hint">
          <span>N</span>
          <span>T</span>
          <span>E</span>
        </div>
      </div>
      <div className="namecraft-field-group">
        <div className="namecraft-field">
          <label htmlFor="room-title">Room title</label>
          <input
            id="room-title"
            value={room.title}
            onChange={(event) =>
              updateRoom((current) => ({ ...current, title: event.target.value, updatedAt: new Date().toISOString() }))
            }
          />
        </div>
        <div className="namecraft-field">
          <label htmlFor="room-notes">Purpose statement</label>
          <textarea
            id="room-notes"
            rows={3}
            value={room.notes}
            onChange={(event) =>
              updateRoom((current) => ({ ...current, notes: event.target.value, updatedAt: new Date().toISOString() }))
            }
            placeholder="Clarify research goals, target communities, and constraints."
          />
        </div>
      </div>

      <div className="namecraft-field-group">
        <header>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#cbd5f5' }}>Candidate Names</h3>
        </header>
        <div className="namecraft-grid-two">
          <div className="namecraft-field">
            <label htmlFor="name-label">Name</label>
            <input
              id="name-label"
              ref={newNameInputRef}
              value={nameDraft.label}
              onChange={(event) => setNameDraft((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="e.g. Resonata"
            />
          </div>
          <div className="namecraft-field">
            <label htmlFor="name-phonetics">Pronunciation</label>
            <input
              id="name-phonetics"
              value={nameDraft.phonetics}
              onChange={(event) => setNameDraft((prev) => ({ ...prev, phonetics: event.target.value }))}
              placeholder="ree-zoh-NAH-tah"
            />
          </div>
        </div>
        <div className="namecraft-field">
          <label htmlFor="name-meaning">Meaning</label>
          <textarea
            id="name-meaning"
            rows={2}
            value={nameDraft.meaning}
            onChange={(event) => setNameDraft((prev) => ({ ...prev, meaning: event.target.value }))}
            placeholder="Contextualise the cue and alignment with your goals."
          />
        </div>
        <div className="namecraft-field">
          <label htmlFor="name-tags">Tags</label>
          <input
            id="name-tags"
            value={nameDraft.tags}
            onChange={(event) => setNameDraft((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="Comma-separated cues (warm, archive, vowel)"
          />
        </div>
        <div>
          <button type="button" className="namecraft-button is-primary" onClick={addName}>
            Add Candidate
          </button>
        </div>

        {room.names.length ? (
          room.names.map((candidate) => (
            <div key={candidate.id} className="namecraft-result-card">
              <div className="namecraft-grid-two">
                <div className="namecraft-field">
                  <label htmlFor={`${candidate.id}-label`}>Label</label>
                  <input
                    id={`${candidate.id}-label`}
                    value={candidate.label}
                    onChange={(event) =>
                      updateRoom((current) =>
                        helpers.updateCandidateName(current, candidate.id, {
                          label: event.target.value,
                        })
                      )
                    }
                  />
                </div>
                <div className="namecraft-field">
                  <label htmlFor={`${candidate.id}-phonetics`}>Pronunciation</label>
                  <input
                    id={`${candidate.id}-phonetics`}
                    value={candidate.phonetics}
                    onChange={(event) =>
                      updateRoom((current) =>
                        helpers.updateCandidateName(current, candidate.id, {
                          phonetics: event.target.value,
                        })
                      )
                    }
                  />
                </div>
              </div>
              <div className="namecraft-field">
                <label htmlFor={`${candidate.id}-meaning`}>Meaning</label>
                <textarea
                  id={`${candidate.id}-meaning`}
                  rows={2}
                  value={candidate.meaning}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateCandidateName(current, candidate.id, {
                        meaning: event.target.value,
                      })
                    )
                  }
                />
              </div>
              <div className="namecraft-field">
                <label htmlFor={`${candidate.id}-tags`}>Tags</label>
                <input
                  id={`${candidate.id}-tags`}
                  value={candidate.tags.join(', ')}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateCandidateName(current, candidate.id, {
                        tags: event.target.value
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    )
                  }
                />
              </div>
              <div>
                <button
                  type="button"
                  className="namecraft-button"
                  onClick={() => updateRoom((current) => helpers.removeCandidateName(current, candidate.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="namecraft-empty-state">
            Add at least one candidate to unlock deterministic heuristics.
          </div>
        )}
      </div>

      <div className="namecraft-field-group">
        <header>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#cbd5f5' }}>Scenarios</h3>
        </header>
        <div className="namecraft-field">
          <label htmlFor="scenario-title">Scenario title</label>
          <input
            id="scenario-title"
            value={scenarioDraft.title}
            onChange={(event) => setScenarioDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Poster reveal, field kit labelling, ..."
          />
        </div>
        <div className="namecraft-field">
          <label htmlFor="scenario-goal">Goal emphasis</label>
          <textarea
            id="scenario-goal"
            rows={2}
            value={scenarioDraft.goal}
            onChange={(event) => setScenarioDraft((prev) => ({ ...prev, goal: event.target.value }))}
            placeholder="Describe what success looks like."
          />
        </div>
        <div className="namecraft-field">
          <label htmlFor="scenario-stress">Stress test</label>
          <textarea
            id="scenario-stress"
            rows={2}
            value={scenarioDraft.stressTest}
            onChange={(event) => setScenarioDraft((prev) => ({ ...prev, stressTest: event.target.value }))}
            placeholder="Document failure modes and confusion risks."
          />
        </div>
        <div className="namecraft-field">
          <label htmlFor="scenario-risk">Community notes</label>
          <textarea
            id="scenario-risk"
            rows={2}
            value={scenarioDraft.riskNotes}
            onChange={(event) => setScenarioDraft((prev) => ({ ...prev, riskNotes: event.target.value }))}
            placeholder="Reference linguistic community commitments."
          />
        </div>
        <div>
          <button type="button" className="namecraft-button is-primary" onClick={addScenario}>
            Add Scenario
          </button>
        </div>

        {room.scenarios.length ? (
          room.scenarios.map((scenario) => (
            <div key={scenario.id} className="namecraft-result-card">
              <div className="namecraft-field">
                <label htmlFor={`${scenario.id}-title`}>Title</label>
                <input
                  id={`${scenario.id}-title`}
                  value={scenario.title}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateScenario(current, scenario.id, {
                        title: event.target.value,
                      })
                    )
                  }
                />
              </div>
              <div className="namecraft-field">
                <label htmlFor={`${scenario.id}-goal`}>Goal</label>
                <textarea
                  id={`${scenario.id}-goal`}
                  rows={2}
                  value={scenario.goal}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateScenario(current, scenario.id, {
                        goal: event.target.value,
                      })
                    )
                  }
                />
              </div>
              <div className="namecraft-field">
                <label htmlFor={`${scenario.id}-stress`}>Stress test</label>
                <textarea
                  id={`${scenario.id}-stress`}
                  rows={2}
                  value={scenario.stressTest}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateScenario(current, scenario.id, {
                        stressTest: event.target.value,
                      })
                    )
                  }
                />
              </div>
              <div className="namecraft-field">
                <label htmlFor={`${scenario.id}-risk`}>Community notes</label>
                <textarea
                  id={`${scenario.id}-risk`}
                  rows={2}
                  value={scenario.riskNotes}
                  onChange={(event) =>
                    updateRoom((current) =>
                      helpers.updateScenario(current, scenario.id, {
                        riskNotes: event.target.value,
                      })
                    )
                  }
                />
              </div>
              <div>
                <button
                  type="button"
                  className="namecraft-button"
                  onClick={() => updateRoom((current) => helpers.removeScenario(current, scenario.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="namecraft-empty-state">Define at least one scenario to calibrate heuristics.</div>
        )}
      </div>

      <div>
        <button type="button" className="namecraft-button is-primary" onClick={onRunTest}>
          Run deterministic test
        </button>
      </div>
    </section>
  );
};

export default RoomEditor;
