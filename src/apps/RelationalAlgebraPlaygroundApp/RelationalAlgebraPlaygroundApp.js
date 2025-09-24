import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import Papa from 'papaparse';
import './RelationalAlgebraPlaygroundApp.css';
import { seedRelations } from './data/seedRelations';
import { evaluatePipeline, pipelineToSql, snapshotPipeline } from './logic/pipeline';
import { parseRelationalAlgebra, astToPipeline, evaluateAst } from './logic/parser';

const OPERATOR_PALETTE = [
  { type: 'dataset', label: 'Dataset', icon: '🗃️', description: 'Start from a base relation' },
  { type: 'σ', label: 'Selection σ', icon: 'σ', description: 'Filter rows using predicates' },
  { type: 'π', label: 'Projection π', icon: 'π', description: 'Select and optionally rename columns' },
  { type: 'ρ', label: 'Rename ρ', icon: 'ρ', description: 'Rename columns for clarity' },
  { type: '⋈', label: 'Join ⋈', icon: '⋈', description: 'Match rows across relations' },
  { type: '∪', label: 'Union ∪', icon: '∪', description: 'Combine rows from two relations' },
  { type: '∩', label: 'Intersection ∩', icon: '∩', description: 'Rows common to both relations' },
  { type: '−', label: 'Difference −', icon: '−', description: 'Rows in left but not in right relation' },
  { type: '×', label: 'Product ×', icon: '×', description: 'Cartesian product of relations' },
  { type: '÷', label: 'Division ÷', icon: '÷', description: 'Tuples related to all in divisor' },
];

const DEFAULT_EXPRESSION = 'π_{EmpID,Name}(σ_{Salary > 3000}(Employee))';

const CHALLENGES = [
  {
    id: 'salary-filter',
    title: 'High earners',
    description: 'Find employees earning more than 3000 and return EmpID and Name.',
    solution: 'π_{EmpID,Name}(σ_{Salary > 3000}(Employee))',
    hints: ['Begin with σ on Employee using Salary > 3000.', 'Follow with π to keep only EmpID and Name.'],
  },
  {
    id: 'dept-with-project-no-employee',
    title: 'Project-rich departments lacking staff',
    description: 'Departments that manage projects but currently have no employees.',
    solution:
      'π_{Department.DeptName}( (Department ⋈_{Department.DeptID=Project.DeptID} Project) − (Department ⋈_{Department.DeptID=Employee.DeptID} Employee) )',
    hints: [
      'Join Department with Project to find who owns projects.',
      'Join Department with Employee to find staffed departments.',
      'Use − to subtract staffed departments from project owners, then project DeptName.',
    ],
  },
  {
    id: 'dept-and-staff',
    title: 'Design & Research teammates',
    description: 'Employees working in either Design or Research departments (no duplicates).',
    solution:
      'π_{EmpID,Name}( (σ_{DeptID = 2}(Employee)) ∪ (σ_{DeptID = 1}(Employee)) )',
    hints: ['Filter employees by DeptID for each department.', 'Apply ∪ to merge and π to select columns.'],
  },
  {
    id: 'project-coverage',
    title: 'Projects without assigned department',
    description: 'Projects whose department has no employees assigned.',
    solution:
      'π_{Project.Title}( (Project ⋈_{Project.DeptID=Department.DeptID} Department) − (Project ⋈_{Project.DeptID=Employee.DeptID} Employee) )',
    hints: ['Join Project with Department for names.', 'Join Project with Employee to find staffed projects.', 'Use − to subtract and project the Title.'],
  },
  {
    id: 'division-challenge',
    title: 'Employees covering every project',
    description: 'Return EmpID of employees assigned to every active project across the company.',
    solution: 'π_{EmpID}(Assignment ÷ π_{ProjID}(Project))',
    hints: [
      'Start from the Assignment relation to connect employees and projects.',
      'Use π to extract the full set of project IDs from Project.',
      'Divide Assignment by the project list, then project EmpID to remove duplicates.',
    ],
  },
];

const initialPipelineState = {
  nodes: [],
  history: [],
  future: [],
  selectedNodeId: null,
  executionCursor: -1,
};

function cloneNodes(nodes) {
  return nodes.map((node) => ({
    ...node,
    inputIds: [...(node.inputIds || [])],
    columns: node.columns ? node.columns.map((column) => ({ ...column })) : undefined,
    renameMap: node.renameMap ? { ...node.renameMap } : undefined,
  }));
}

function withHistory(state, nodes, extra = {}) {
  const history = state.history.concat([cloneNodes(state.nodes)]).slice(-25);
  return {
    ...state,
    ...extra,
    nodes,
    history,
    future: [],
  };
}

function pipelineReducer(state, action) {
  switch (action.type) {
    case 'ADD_NODE': {
      const nodes = [...state.nodes, action.node];
      return withHistory(state, nodes, {
        selectedNodeId: action.node.id,
        executionCursor: -1,
      });
    }
    case 'UPDATE_NODE': {
      const nodes = state.nodes.map((node) => (node.id === action.id ? { ...node, ...action.updates } : node));
      return withHistory(state, nodes, { selectedNodeId: action.id, executionCursor: -1 });
    }
    case 'DELETE_NODE': {
      const nodes = state.nodes
        .filter((node) => node.id !== action.id)
        .map((node) => ({
          ...node,
          inputIds: (node.inputIds || []).filter((inputId) => inputId !== action.id),
        }));
      const selectedNodeId = state.selectedNodeId === action.id ? null : state.selectedNodeId;
      return withHistory(state, nodes, { selectedNodeId, executionCursor: -1 });
    }
    case 'REORDER_NODE': {
      const nodes = cloneNodes(state.nodes);
      const [moved] = nodes.splice(action.from, 1);
      nodes.splice(action.to, 0, moved);
      return withHistory(state, nodes, { executionCursor: -1 });
    }
    case 'SET_NODES': {
      return withHistory(state, cloneNodes(action.nodes), {
        selectedNodeId: action.nodes.length ? action.nodes[action.nodes.length - 1].id : null,
        executionCursor: -1,
      });
    }
    case 'SELECT_NODE': {
      return { ...state, selectedNodeId: action.id };
    }
    case 'SET_CURSOR': {
      return { ...state, executionCursor: action.cursor };
    }
    case 'UNDO': {
      if (!state.history.length) {
        return state;
      }
      const previous = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      const future = [cloneNodes(state.nodes), ...state.future];
      return {
        ...state,
        nodes: cloneNodes(previous),
        history,
        future,
        selectedNodeId: previous.length ? previous[previous.length - 1].id : null,
        executionCursor: previous.length ? previous.length - 1 : -1,
      };
    }
    case 'REDO': {
      if (!state.future.length) {
        return state;
      }
      const [next, ...rest] = state.future;
      const history = state.history.concat([cloneNodes(state.nodes)]).slice(-25);
      return {
        ...state,
        nodes: cloneNodes(next),
        history,
        future: rest,
        selectedNodeId: next.length ? next[next.length - 1].id : null,
        executionCursor: next.length ? next.length - 1 : -1,
      };
    }
    case 'RESET': {
      return { ...initialPipelineState };
    }
    default:
      return state;
  }
}

function getNodeLabel(node, index) {
  switch (node.type) {
    case 'dataset':
      return `${index + 1}. ${node.source}`;
    case 'σ':
      return `${index + 1}. σ`;
    case 'π':
      return `${index + 1}. π`;
    case 'ρ':
      return `${index + 1}. ρ`;
    case '⋈':
      return `${index + 1}. ⋈`;
    case '∪':
      return `${index + 1}. ∪`;
    case '∩':
      return `${index + 1}. ∩`;
    case '−':
      return `${index + 1}. −`;
    case '×':
      return `${index + 1}. ×`;
    case '÷':
      return `${index + 1}. ÷`;
    default:
      return `${index + 1}. ${node.type}`;
  }
}

function parseColumnsInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [name, alias] = token.split(/->|←|:/).map((entry) => entry?.trim());
      if (alias) {
        return { name, alias };
      }
      return { name: token };
    });
}

function formatColumnsInput(columns) {
  if (!columns || !columns.length) {
    return '';
  }
  return columns
    .map((column) => (column.alias && column.alias !== column.name ? `${column.name}->${column.alias}` : column.name))
    .join(', ');
}

function parseRenameInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  return trimmed.split(',').reduce((acc, entry) => {
    const [from, to] = entry.split(/->|←|:/).map((token) => token?.trim());
    if (from && to) {
      acc[from] = to;
    }
    return acc;
  }, {});
}

function formatRenameInput(renameMap = {}) {
  return Object.entries(renameMap)
    .map(([from, to]) => `${from}->${to}`)
    .join(', ');
}

function VirtualTable({ relation, highlightedRows = new Set(), highlightedColumns = new Set() }) {
  const containerRef = useRef(null);
  const rowHeight = 32;
  const [viewport, setViewport] = useState({ start: 0, end: 20, height: 320 });

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const height = containerRef.current.clientHeight || 320;
      const visible = Math.ceil(height / rowHeight) + 4;
      setViewport((prev) => ({ ...prev, end: prev.start + visible, height }));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rowHeight]);

  const onScroll = (event) => {
    const top = event.target.scrollTop;
    const start = Math.max(0, Math.floor(top / rowHeight) - 2);
    const visible = Math.ceil((event.target.clientHeight || 320) / rowHeight) + 4;
    setViewport({ start, end: start + visible, height: event.target.clientHeight || 320 });
  };

  const rows = relation?.rows || [];
  const rowIds = relation?.rowIds || [];
  const columns = relation?.schema || [];
  const totalHeight = rows.length * rowHeight;
  const visibleRows = rows.slice(viewport.start, viewport.end);

  return (
    <div className="ra-table-wrapper">
      <div className="ra-virtual-table" ref={containerRef} onScroll={onScroll} style={{ maxHeight: viewport.height }}>
        <div style={{ position: 'relative', height: totalHeight }}>
          <table style={{ position: 'absolute', top: viewport.start * rowHeight, left: 0, right: 0 }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.name} className={highlightedColumns.has(column.name) ? 'ra-col-highlight' : undefined}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>{column.name}</span>
                      <small className="ra-tag">{column.type}</small>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => {
                const actualIndex = viewport.start + rowIndex;
                const id = rowIds[actualIndex];
                const highlighted = highlightedRows.has(id);
                return (
                  <tr key={id || actualIndex} className={highlighted ? 'ra-row-highlight' : undefined}>
                    {row.map((value, columnIndex) => (
                      <td key={`${id || actualIndex}-${columnIndex}`}>{String(value)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <footer style={{ padding: '8px 12px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>
          {rows.length} row{rows.length === 1 ? '' : 's'} • {columns.length} column{columns.length === 1 ? '' : 's'}
        </span>
      </footer>
    </div>
  );
}

function NodeInputs({ node, availableSources, onChange }) {
  const isBinary = ['∪', '∩', '−', '×', '⋈', '÷'].includes(node.type);
  const isUnary = ['σ', 'π', 'ρ'].includes(node.type);
  const inputIds = node.inputIds || [];

  if (!isBinary && !isUnary) {
    return null;
  }

  const handleSelect = (index) => (event) => {
    const updated = [...inputIds];
    updated[index] = event.target.value;
    onChange(updated.filter(Boolean));
  };

  return (
    <div className="ra-node-body">
      {(isUnary ? [0] : [0, 1]).map((slot) => (
        <label key={slot}>
          Input {slot + 1}
          <select value={inputIds[slot] || ''} onChange={handleSelect(slot)}>
            <option value="">Select…</option>
            {availableSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function PipelineNodeCard({
  node,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  availableSources,
  datasets,
  result,
  status,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const label = getNodeLabel(node, index);
  const columnsInput = formatColumnsInput(node.columns || []);
  const renameInput = formatRenameInput(node.renameMap || {});

  return (
    <article
      className={`ra-node-card ${isSelected ? 'selected' : ''} ${status === 'pending' ? 'pending' : ''}`}
      tabIndex={0}
      role="button"
      onClick={() => onSelect(node.id)}
      draggable
      onDragStart={(event) => onDragStart(event, node.id)}
      onDragOver={(event) => onDragOver(event, node.id)}
      onDrop={(event) => onDrop(event, node.id)}
    >
      <header className="ra-node-header">
        <h3>
          <span className="ra-pill">{node.type}</span>
          {label}
        </h3>
        <div className="ra-node-actions">
          <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(node); }} title="Duplicate node">
            ⧉
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(node.id); }} title="Delete node">
            ✕
          </button>
        </div>
      </header>
      {node.type === 'dataset' && (
        <div className="ra-node-body">
          <label>
            Source relation
            <select value={node.source} onChange={(event) => onUpdate(node.id, { source: event.target.value })}>
              {datasets.map((relation) => (
                <option key={relation.name} value={relation.name}>
                  {relation.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <NodeInputs node={node} availableSources={availableSources} onChange={(inputIds) => onUpdate(node.id, { inputIds })} />
      {node.type === 'σ' && (
        <div className="ra-node-body">
          <label>
            Predicate (e.g. Salary &gt; 3000 AND DeptID = 1)
            <input
              value={node.condition || ''}
              onChange={(event) => onUpdate(node.id, { condition: event.target.value })}
              placeholder="Salary &gt; 3000"
            />
          </label>
        </div>
      )}
      {node.type === 'π' && (
        <div className="ra-node-body">
          <label>
            Columns (comma separated, optional alias via -&gt;)
            <input
              value={columnsInput}
              onChange={(event) => onUpdate(node.id, { columns: parseColumnsInput(event.target.value) })}
              placeholder="EmpID, Name-&gt;EmployeeName"
            />
          </label>
        </div>
      )}
      {node.type === 'ρ' && (
        <div className="ra-node-body">
          <label>
            Rename map (comma separated old-&gt;new)
            <input
              value={renameInput}
              onChange={(event) => onUpdate(node.id, { renameMap: parseRenameInput(event.target.value) })}
              placeholder="DeptID-&gt;DepartmentId"
            />
          </label>
        </div>
      )}
      {node.type === '⋈' && (
        <div className="ra-node-body">
          <label>
            Join condition (e.g. Employee.DeptID = Department.DeptID)
            <textarea
              value={node.condition || ''}
              onChange={(event) => onUpdate(node.id, { condition: event.target.value })}
              placeholder="Employee.DeptID = Department.DeptID"
            />
          </label>
        </div>
      )}
      {status === 'error' && result?.error && <span className="ra-error">{result.error}</span>}
      {status !== 'error' && result?.summary && (
        <footer className="ra-node-footer">
          <span>
            {result.summary.rowCount} rows • {result.summary.columnCount} columns
          </span>
          <span>{result.elapsedMs?.toFixed(2)} ms</span>
        </footer>
      )}
    </article>
  );
}

function ChallengeCard({ challenge, onAttempt }) {
  const [expression, setExpression] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [revealedHints, setRevealedHints] = useState(0);

  const handleAttempt = async () => {
    const response = await onAttempt(challenge, expression, revealedHints);
    setStatus(response.status);
    setMessage(response.message);
  };

  const revealHint = () => {
    setRevealedHints((current) => Math.min(challenge.hints.length, current + 1));
  };

  return (
    <div className="ra-challenge-card">
      <header>
        <span>{challenge.title}</span>
        <span className="ra-tag">Challenge</span>
      </header>
      <p className="ra-hint">{challenge.description}</p>
      <textarea
        value={expression}
        onChange={(event) => setExpression(event.target.value)}
        placeholder="Enter RA expression"
        className="ra-expression-editor"
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleAttempt}>
          Grade attempt
        </button>
        <button type="button" onClick={revealHint} disabled={revealedHints >= challenge.hints.length}>
          Reveal hint
        </button>
      </div>
      {revealedHints > 0 && (
        <div className="ra-hints">
          {challenge.hints.slice(0, revealedHints).map((hint, index) => (
            <span key={index}>💡 {hint}</span>
          ))}
        </div>
      )}
      {status && <span className={status === 'success' ? 'ra-success' : 'ra-error'}>{message}</span>}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div className="ra-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function miniVenn(result) {
  if (!result) {
    return null;
  }
  if (!['∪', '∩', '−'].includes(result.type)) {
    return null;
  }
  const leftRows = result.metadata?.details?.leftRows ?? 0;
  const rightRows = result.metadata?.details?.rightRows ?? 0;
  const intersectRows = result.metadata?.relation?.rows?.length ?? 0;
  return (
    <div className="ra-mini-venn">
      <div className="circle">{leftRows}</div>
      <div className="intersect">{intersectRows}</div>
      <div className="circle right">{rightRows}</div>
    </div>
  );
}

function useDatasets() {
  const [datasets, setDatasets] = useState(seedRelations);
  const addDataset = (dataset) => {
    setDatasets((current) => {
      if (current.some((relation) => relation.name === dataset.name)) {
        return current.map((relation) => (relation.name === dataset.name ? dataset : relation));
      }
      return [...current, dataset];
    });
  };
  return { datasets, addDataset };
}

function compareRelations(expected, actual) {
  if (!expected || !actual) {
    return { equal: false, reason: 'One of the relations is missing.' };
  }
  if (expected.schema.length !== actual.schema.length) {
    return { equal: false, reason: 'Schema mismatch.' };
  }
  const expectedKeys = new Set(expected.rows.map((row) => JSON.stringify(row)));
  const actualKeys = new Set(actual.rows.map((row) => JSON.stringify(row)));
  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) {
      return { equal: false, reason: `Missing row ${key}` };
    }
  }
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      return { equal: false, reason: `Unexpected row ${key}` };
    }
  }
  return { equal: true };
}

function RelationalAlgebraPlaygroundApp() {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState);
  const { datasets, addDataset } = useDatasets();
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [expressionError, setExpressionError] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const nodeCounterRef = useRef(0);
  const [statusMessage, setStatusMessage] = useState('Ready');

  const datasetCatalog = useMemo(() => {
    const map = {};
    datasets.forEach((relation) => {
      map[relation.name] = relation;
    });
    return map;
  }, [datasets]);

  const pipelineResults = useMemo(() => evaluatePipeline(state.nodes, datasetCatalog), [state.nodes, datasetCatalog]);
  const selectedIndex = state.nodes.findIndex((node) => node.id === state.selectedNodeId);
  const selectedResult = selectedIndex >= 0 ? pipelineResults[selectedIndex] : null;
  const selectedExecuted = selectedIndex >= 0 && state.executionCursor >= selectedIndex;
  const highlightedRows = useMemo(() => new Set(selectedResult?.metadata?.highlightRows || []), [selectedResult]);
  const highlightedColumns = useMemo(() => new Set(selectedResult?.metadata?.highlightColumns || []), [selectedResult]);

  useEffect(() => {
    if (state.nodes.length && state.executionCursor === -1) {
      setStatusMessage('Pipeline changed — run steps to preview results.');
    }
  }, [state.nodes, state.executionCursor]);

  const visibleResults = pipelineResults.map((result, index) => {
    if (state.executionCursor === -1) {
      return { ...result, status: index <= state.executionCursor ? 'ready' : 'pending' };
    }
    if (index <= state.executionCursor) {
      return { ...result, status: result.error ? 'error' : 'ready' };
    }
    return { ...result, status: 'pending' };
  });

  const availableSourcesByIndex = state.nodes.map((_, index) =>
    state.nodes
      .slice(0, index)
      .filter((node) => node.type !== 'dataset' || node.source)
      .map((node, sourceIndex) => ({ id: node.id, label: getNodeLabel(node, sourceIndex) }))
  );

  const createNode = (type) => {
    nodeCounterRef.current += 1;
    const id = `node-${nodeCounterRef.current}`;
    const lastNodeId = state.nodes.length ? state.nodes[state.nodes.length - 1].id : null;
    if (type === 'dataset') {
      return {
        id,
        type,
        source: datasets[0]?.name || '',
        inputIds: [],
      };
    }
    if (['σ', 'π', 'ρ'].includes(type)) {
      return {
        id,
        type,
        inputIds: lastNodeId ? [lastNodeId] : [],
        condition: type === 'σ' ? '' : undefined,
        columns: type === 'π' ? [] : undefined,
        renameMap: type === 'ρ' ? {} : undefined,
      };
    }
    if (type === '⋈') {
      return {
        id,
        type,
        inputIds: lastNodeId ? [lastNodeId] : [],
        condition: '',
      };
    }
    return {
      id,
      type,
      inputIds: lastNodeId ? [lastNodeId] : [],
    };
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDropActive(false);
    const type = event.dataTransfer.getData('application/x-ra-operator');
    const node = createNode(type);
    dispatch({ type: 'ADD_NODE', node });
    setStatusMessage(`Added ${type} node.`);
  };

  const handleDragOverCanvas = (event) => {
    event.preventDefault();
    setDropActive(true);
  };

  const handleDragLeaveCanvas = () => {
    setDropActive(false);
  };

  const handleNodeDragStart = (event, id) => {
    setDraggedNodeId(id);
    event.dataTransfer.setData('application/x-ra-node', id);
  };

  const handleNodeDragOver = (event, targetId) => {
    event.preventDefault();
    if (draggedNodeId && draggedNodeId !== targetId) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleNodeDrop = (event, targetId) => {
    event.preventDefault();
    const draggedId = draggedNodeId || event.dataTransfer.getData('application/x-ra-node');
    if (!draggedId || draggedId === targetId) {
      return;
    }
    const from = state.nodes.findIndex((node) => node.id === draggedId);
    const to = state.nodes.findIndex((node) => node.id === targetId);
    if (from === -1 || to === -1) {
      return;
    }
    dispatch({ type: 'REORDER_NODE', from, to });
    setDraggedNodeId(null);
  };

  const handleOperatorDragStart = (event, operator) => {
    event.dataTransfer.setData('application/x-ra-operator', operator.type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const parseExpressionToPipeline = () => {
    try {
      const ast = parseRelationalAlgebra(expression);
      const nodes = astToPipeline(ast);
      nodeCounterRef.current = nodes.length;
      dispatch({ type: 'SET_NODES', nodes });
      setExpressionError('');
      setStatusMessage('Expression parsed into pipeline.');
    } catch (error) {
      setExpressionError(error.message);
    }
  };

  const runStep = () => {
    if (!state.nodes.length) return;
    const nextCursor = state.executionCursor + 1;
    if (nextCursor >= state.nodes.length) return;
    dispatch({ type: 'SET_CURSOR', cursor: nextCursor });
    setStatusMessage(`Ran node ${nextCursor + 1}.`);
  };

  const runToCursor = () => {
    if (!state.nodes.length) return;
    const target = state.selectedNodeId
      ? state.nodes.findIndex((node) => node.id === state.selectedNodeId)
      : state.nodes.length - 1;
    dispatch({ type: 'SET_CURSOR', cursor: target });
    setStatusMessage(`Ran to node ${target + 1}.`);
  };

  const runAll = () => {
    if (!state.nodes.length) return;
    dispatch({ type: 'SET_CURSOR', cursor: state.nodes.length - 1 });
    setStatusMessage('Ran entire pipeline.');
  };

  const resetPipeline = () => {
    dispatch({ type: 'RESET' });
    setStatusMessage('Pipeline cleared.');
  };

  const copySql = async () => {
    const sql = pipelineToSql(pipelineResults);
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setStatusMessage('SQL copied to clipboard.');
  };

  const copyPipelineJson = async () => {
    const snapshot = snapshotPipeline(state.nodes);
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setStatusMessage('Pipeline JSON copied to clipboard.');
  };

  const copyPipelineSvg = async () => {
    const width = 320;
    const height = state.nodes.length * 84 + 40;
    const rectangles = state.nodes
      .map((node, index) => {
        const y = 20 + index * 84;
        return `<g><rect x="20" y="${y}" width="${width - 40}" height="60" rx="12" fill="rgba(83,126,242,0.18)" stroke="rgba(114,191,255,0.6)" /><text x="40" y="${y + 34}" font-size="14" fill="#f3f7ff" font-family="Inter">${getNodeLabel(
          node,
          index
        )}</text></g>`;
      })
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#0b1020">${rectangles}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/svg+xml': blob })]);
        setStatusMessage('Pipeline SVG copied to clipboard.');
        return;
      } catch (error) {
        console.warn('Clipboard write failed', error);
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pipeline.svg';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Pipeline SVG downloaded.');
  };

  const importCsv = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const headers = results.meta.fields || [];
        const inferType = (values) => {
          const numbers = values.every((value) => /^-?\d+$/.test(value));
          if (numbers) return 'int';
          const floats = values.every((value) => /^-?\d+(\.\d+)?$/.test(value));
          if (floats) return 'float';
          return 'string';
        };
        const schema = headers.map((header) => ({
          name: header,
          type: inferType(rows.map((row) => row[header])),
        }));
        const typedRows = rows.map((row) => headers.map((header) => row[header]));
        const relation = {
          name: file.name.replace(/\.csv$/i, ''),
          schema,
          rows: typedRows,
        };
        addDataset(relation);
        setStatusMessage(`Imported dataset ${relation.name}.`);
      },
      error: (error) => {
        setStatusMessage(`CSV import failed: ${error.message}`);
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        dispatch({ type: 'UNDO' });
      } else if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'Z'))) {
        event.preventDefault();
        dispatch({ type: 'REDO' });
      } else if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        if (state.nodes.length) {
          dispatch({ type: 'SET_CURSOR', cursor: state.nodes.length - 1 });
        }
      } else if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        const target = state.selectedNodeId
          ? state.nodes.findIndex((node) => node.id === state.selectedNodeId)
          : state.nodes.length - 1;
        if (target >= 0) {
          dispatch({ type: 'SET_CURSOR', cursor: target });
        }
      } else if (event.key === 'Delete' && state.selectedNodeId) {
        dispatch({ type: 'DELETE_NODE', id: state.selectedNodeId });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.nodes, state.selectedNodeId]);

  const handleChallengeAttempt = async (challenge, attemptExpression) => {
    try {
      const astSolution = parseRelationalAlgebra(challenge.solution);
      const solutionEval = evaluateAst(astSolution, datasetCatalog);
      const solutionRelation = solutionEval.relation;
      const astAttempt = parseRelationalAlgebra(attemptExpression);
      const attemptEval = evaluateAst(astAttempt, datasetCatalog);
      const attemptRelation = attemptEval.relation;
      const comparison = compareRelations(solutionRelation, attemptRelation);
      if (comparison.equal) {
        return { status: 'success', message: 'Correct! Result matches the expected relation.' };
      }
      return { status: 'error', message: comparison.reason };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  };

  const className = `ra-playground ${theme === 'light' ? 'light' : ''}`;

  return (
    <div className={className}>
      <header className="ra-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Relational Algebra Playground</h1>
          <p className="ra-hint">Drag operators, parse expressions, and inspect SQL translations live.</p>
        </div>
        <div className="ra-controls">
          <button type="button" onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}>
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
          <button type="button" onClick={copySql} disabled={!pipelineResults.length}>
            Copy SQL
          </button>
          <button type="button" onClick={copyPipelineJson} disabled={!state.nodes.length}>
            Copy JSON
          </button>
          <button type="button" onClick={copyPipelineSvg} disabled={!state.nodes.length}>
            Copy SVG
          </button>
        </div>
      </header>
      <aside className="ra-sidebar">
        <section className="ra-section">
          <h2>Datasets</h2>
          <div className="ra-dataset-list">
            {datasets.map((relation) => (
              <div
                key={relation.name}
                className="ra-chip"
                draggable
                onDragStart={(event) => handleOperatorDragStart(event, { type: 'dataset' })}
              >
                <div>
                  <strong>{relation.name}</strong>
                  <small>
                    {relation.schema.length} cols • {relation.rows.length} rows
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="ra-import">
            <label className="ra-hint">Import CSV</label>
            <input type="file" accept=".csv" onChange={importCsv} />
          </div>
        </section>
        <section className="ra-section">
          <h2>Operators</h2>
          <div className="ra-operator-list">
            {OPERATOR_PALETTE.map((operator) => (
              <div
                key={operator.type}
                className="ra-chip"
                draggable
                onDragStart={(event) => handleOperatorDragStart(event, operator)}
              >
                <div>
                  <strong>
                    {operator.icon} {operator.label}
                  </strong>
                  <small>{operator.description}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="ra-section ra-expression-editor">
          <h2>Expression editor</h2>
          <textarea value={expression} onChange={(event) => setExpression(event.target.value)} />
          <div className="ra-controls">
            <button type="button" onClick={parseExpressionToPipeline}>
              Parse to pipeline
            </button>
            <button type="button" onClick={() => setExpression(DEFAULT_EXPRESSION)}>Reset Example</button>
          </div>
          {expressionError && <span className="ra-error">{expressionError}</span>}
        </section>
        <section className="ra-section">
          <h2>Learning challenges</h2>
          <div className="ra-challenge-list">
            {CHALLENGES.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} onAttempt={handleChallengeAttempt} />
            ))}
          </div>
        </section>
      </aside>
      <main className="ra-canvas" onDragOver={handleDragOverCanvas} onDrop={handleDrop} onDragLeave={handleDragLeaveCanvas}>
        <div className={`ra-canvas-dropzone ${dropActive ? 'active' : ''}`}>Drop operator to add node</div>
        <div className="ra-pipeline">
          {state.nodes.map((node, index) => (
            <PipelineNodeCard
              key={node.id}
              node={node}
              index={index}
              datasets={datasets}
              isSelected={state.selectedNodeId === node.id}
              onSelect={(id) => dispatch({ type: 'SELECT_NODE', id })}
              onUpdate={(id, updates) => dispatch({ type: 'UPDATE_NODE', id, updates })}
              onDelete={(id) => dispatch({ type: 'DELETE_NODE', id })}
              onDuplicate={(original) => {
                const duplicate = cloneNodes([original])[0];
                nodeCounterRef.current += 1;
                duplicate.id = `node-${nodeCounterRef.current}`;
                dispatch({ type: 'ADD_NODE', node: duplicate });
              }}
              availableSources={availableSourcesByIndex[index] || []}
              result={visibleResults[index]}
              status={visibleResults[index]?.status}
              onDragStart={handleNodeDragStart}
              onDragOver={handleNodeDragOver}
              onDrop={handleNodeDrop}
            />
          ))}
          {!state.nodes.length && <p className="ra-hint">Drag a dataset or operator to begin building your pipeline.</p>}
        </div>
      </main>
      <aside className="ra-details">
        <section className="ra-section">
          <h2>Execution controls</h2>
          <div className="ra-controls">
            <button type="button" onClick={runStep} disabled={state.executionCursor >= state.nodes.length - 1}>
              Step ▶
            </button>
            <button type="button" onClick={runToCursor} disabled={!state.nodes.length}>
              Run to cursor
            </button>
            <button type="button" onClick={runAll} disabled={!state.nodes.length}>
              Run all
            </button>
            <button type="button" onClick={resetPipeline} disabled={!state.nodes.length}>
              Clear
            </button>
          </div>
          <div className="ra-shortcuts">
            <span>Ctrl + Z — Undo</span>
            <span>Ctrl + Shift + Z — Redo</span>
            <span>Ctrl + Enter — Run to cursor</span>
            <span>Ctrl + Shift + Enter — Run all</span>
          </div>
        </section>
        <section className="ra-section">
          <h2>Live preview</h2>
          {selectedResult?.relation && selectedExecuted ? (
            <VirtualTable relation={selectedResult.relation} highlightedRows={highlightedRows} highlightedColumns={highlightedColumns} />
          ) : selectedResult && !selectedExecuted ? (
            <p className="ra-hint">Run this node to view its rows (Ctrl + Enter).</p>
          ) : (
            <p className="ra-hint">Select a node and execute it to see rows here.</p>
          )}
       </section>
        <section className="ra-section ra-sql-panel">
          <h2>SQL translation</h2>
          {selectedResult?.sql ? (
            <pre>{selectedResult.sql}</pre>
          ) : (
            <p className="ra-hint">Select a node to view its SQL equivalent.</p>
          )}
        </section>
        <section className="ra-section">
          <h2>Stats</h2>
          <div className="ra-stats-grid">
            <SummaryStat label="Nodes" value={state.nodes.length} />
            <SummaryStat label="Executed" value={Math.max(0, state.executionCursor + 1)} />
            <SummaryStat label="Datasets" value={datasets.length} />
            <SummaryStat label="Rows" value={selectedResult?.relation?.rows?.length || 0} />
          </div>
          {miniVenn(selectedResult)}
        </section>
      </aside>
      <footer className="ra-footer">
        <span>{statusMessage}</span>
      </footer>
    </div>
  );
}

export default RelationalAlgebraPlaygroundApp;
