import React, { useEffect, useMemo, useState } from 'react';
import { MAX_TASK_DEPTH, generateId } from '../taskUtils';

const defaultTaskDraft = () => ({
  id: generateId(),
  title: '',
  description: '',
  dueDate: '',
  completed: false,
  subtasks: [],
});

const cloneDraft = (task) => JSON.parse(JSON.stringify(task));

const SubtaskEditor = ({ node, depth, onChange, onRemove, onAddChild }) => {
  const remainingDepth = MAX_TASK_DEPTH - depth;
  const canAddChild = remainingDepth > 0;

  return (
    <div className={`zen-subtask-editor depth-${depth}`}>
      <div className="zen-subtask-header">
        <input
          className="zen-input"
          value={node.title}
          onChange={(e) => onChange({ ...node, title: e.target.value })}
          placeholder="Subtask title"
        />
        <button type="button" className="zen-mini-btn" onClick={onRemove} aria-label="Remove subtask">
          ×
        </button>
      </div>
      <div className="zen-subtask-grid">
        <label className="zen-field">
          <span>Due</span>
          <input
            type="date"
            className="zen-input"
            value={node.dueDate}
            onChange={(e) => onChange({ ...node, dueDate: e.target.value })}
          />
        </label>
        <label className="zen-field">
          <span>Description</span>
          <textarea
            className="zen-textarea"
            value={node.description}
            onChange={(e) => onChange({ ...node, description: e.target.value })}
            placeholder="Optional notes"
            rows={2}
          />
        </label>
      </div>
      {canAddChild && (
        <button type="button" className="zen-inline-btn" onClick={onAddChild}>
          + Add nested subtask
        </button>
      )}
      {node.subtasks?.length > 0 && (
        <div className="zen-subtask-children">
          {node.subtasks.map((child) => (
            <SubtaskEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              onChange={(updatedChild) => {
                const nextChildren = node.subtasks.map((sub) => (sub.id === child.id ? updatedChild : sub));
                onChange({ ...node, subtasks: nextChildren });
              }}
              onRemove={() => {
                const filtered = node.subtasks.filter((sub) => sub.id !== child.id);
                onChange({ ...node, subtasks: filtered });
              }}
              onAddChild={() => {
                const newChild = { ...defaultTaskDraft(), id: generateId() };
                const nextChildren = [...(node.subtasks || []), newChild];
                onChange({ ...node, subtasks: nextChildren });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskEditorModal = ({
  open,
  onClose,
  onSave,
  initialTask,
  parentTitle,
}) => {
  const [draft, setDraft] = useState(defaultTaskDraft);

  useEffect(() => {
    if (open) {
      if (initialTask) {
        setDraft(cloneDraft({
          ...initialTask,
          subtasks: initialTask.subtasks || [],
        }));
      } else {
        setDraft(defaultTaskDraft());
      }
    }
  }, [open, initialTask]);

  const modalTitle = useMemo(() => {
    if (initialTask) return 'Edit Task';
    if (parentTitle) return `New subtask for ${parentTitle}`;
    return 'New Task';
  }, [initialTask, parentTitle]);

  const handleSave = () => {
    if (!draft.title.trim()) {
      return;
    }
    const sanitized = cloneDraft(draft);
    const pruneDepth = (node, depth = 0) => ({
      ...node,
      subtasks: depth >= MAX_TASK_DEPTH ? [] : (node.subtasks || []).map((child) => pruneDepth(child, depth + 1)),
    });
    onSave(pruneDepth(sanitized));
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="zen-modal-backdrop" role="dialog" aria-modal="true">
      <div className="zen-modal">
        <header className="zen-modal-header">
          <h2>{modalTitle}</h2>
          <button type="button" className="zen-icon-btn" onClick={onClose} aria-label="Discard changes">
            Discard ✕
          </button>
        </header>
        <div className="zen-modal-body">
          <label className="zen-field">
            <span>Title</span>
            <input
              className="zen-input"
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Breathe in a new intention"
            />
          </label>
          <div className="zen-field-row">
            <label className="zen-field">
              <span>Due date</span>
              <input
                type="date"
                className="zen-input"
                value={draft.dueDate}
                onChange={(e) => setDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </label>
            <label className="zen-field">
              <span>Description</span>
              <textarea
                className="zen-textarea"
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Add mindful notes"
                rows={3}
              />
            </label>
          </div>
          <section className="zen-subtasks-section">
            <div className="zen-section-heading">
              <h3>Subtasks</h3>
              <button
                type="button"
                className="zen-inline-btn"
                onClick={() => setDraft((prev) => ({
                  ...prev,
                  subtasks: [...(prev.subtasks || []), { ...defaultTaskDraft(), id: generateId() }],
                }))}
              >
                + Add subtask
              </button>
            </div>
            {(draft.subtasks || []).length === 0 ? (
              <p className="zen-empty-hint">No subtasks yet. Use layers to plan up to three levels deep.</p>
            ) : (
              <div className="zen-subtask-list">
                {draft.subtasks.map((subtask) => (
                  <SubtaskEditor
                    key={subtask.id}
                    node={subtask}
                    depth={1}
                    onChange={(updated) => {
                      setDraft((prev) => ({
                        ...prev,
                        subtasks: prev.subtasks.map((node) => (node.id === subtask.id ? updated : node)),
                      }));
                    }}
                    onRemove={() => {
                      setDraft((prev) => ({
                        ...prev,
                        subtasks: prev.subtasks.filter((node) => node.id !== subtask.id),
                      }));
                    }}
                    onAddChild={() => {
                      setDraft((prev) => ({
                        ...prev,
                        subtasks: prev.subtasks.map((node) => {
                          if (node.id === subtask.id) {
                            return {
                              ...node,
                              subtasks: [...(node.subtasks || []), { ...defaultTaskDraft(), id: generateId() }],
                            };
                          }
                          return node;
                        }),
                      }));
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
        <footer className="zen-modal-footer">
          <button type="button" className="zen-primary-btn" onClick={handleSave}>
            Save Task
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TaskEditorModal;
