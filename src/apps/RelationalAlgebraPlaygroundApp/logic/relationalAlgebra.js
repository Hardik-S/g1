export function normaliseValue(value, type) {
  if (value === null || value === undefined) {
    return null;
  }
  if (type === 'int') {
    const num = Number(value);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      throw new Error(`Expected integer value, received ${value}`);
    }
    return num;
  }
  if (type === 'float') {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(`Expected numeric value, received ${value}`);
    }
    return num;
  }
  if (type === 'bool') {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true' || value === 'TRUE' || value === 1) {
      return true;
    }
    if (value === 'false' || value === 'FALSE' || value === 0) {
      return false;
    }
    throw new Error(`Expected boolean value, received ${value}`);
  }
  return `${value}`;
}

export function createRelation(name, schema, rows, options = {}) {
  if (!Array.isArray(schema) || schema.length === 0) {
    throw new Error('Schema must contain at least one column.');
  }
  const seenNames = new Set();
  schema.forEach((column) => {
    if (!column || !column.name) {
      throw new Error('Schema entries must include a name.');
    }
    if (seenNames.has(column.name)) {
      throw new Error(`Duplicate column name "${column.name}" in schema.`);
    }
    seenNames.add(column.name);
  });

  const relation = {
    name: options.alias || name,
    schema: schema.map((column) => ({ ...column })),
    rows: [],
    rowIds: [],
  };

  rows.forEach((rawRow, rawIndex) => {
    if (!Array.isArray(rawRow)) {
      throw new Error(`Row ${rawIndex + 1} must be an array.`);
    }
    if (rawRow.length !== schema.length) {
      throw new Error(`Row ${rawIndex + 1} has ${rawRow.length} values but expected ${schema.length}.`);
    }
    const typedRow = rawRow.map((value, index) => normaliseValue(value, schema[index].type));
    relation.rows.push(typedRow);
    relation.rowIds.push(options.rowIds?.[rawIndex] || `${name}-${rawIndex}`);
  });

  return relation;
}

export function cloneRelation(relation, overrides = {}) {
  return {
    name: overrides.name || relation.name,
    schema: overrides.schema ? overrides.schema.map((column) => ({ ...column })) : relation.schema.map((column) => ({ ...column })),
    rows: relation.rows.map((row) => [...row]),
    rowIds: [...relation.rowIds],
  };
}

function ensureCompatibleSchemas(left, right) {
  if (left.schema.length !== right.schema.length) {
    throw new Error('Relations must share the same arity for this operation.');
  }
  left.schema.forEach((column, index) => {
    const other = right.schema[index];
    if (column.type !== other.type) {
      throw new Error(`Type mismatch for column ${index + 1}: ${column.type} vs ${other.type}`);
    }
  });
}

function dedupeRows(rows, rowIds) {
  const seen = new Map();
  const filteredRows = [];
  const filteredIds = [];
  rows.forEach((row, index) => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.set(key, rowIds[index]);
      filteredRows.push(row);
      filteredIds.push(rowIds[index]);
    }
  });
  return { rows: filteredRows, rowIds: filteredIds };
}

function buildMetadata({ relation, operation, highlightRows = [], highlightColumns = [], diff = null, details = {} }) {
  return {
    relation,
    operation,
    highlightRows,
    highlightColumns,
    diff,
    details,
  };
}

export function relationToObjects(relation) {
  return relation.rows.map((row) => {
    const obj = {};
    relation.schema.forEach((column, index) => {
      obj[column.name] = row[index];
    });
    return obj;
  });
}

export function selection(relation, predicate) {
  const filteredRows = [];
  const filteredIds = [];
  relation.rows.forEach((row, index) => {
    const context = {};
    relation.schema.forEach((column, columnIndex) => {
      context[column.name] = row[columnIndex];
    });
    if (predicate(context)) {
      filteredRows.push([...row]);
      filteredIds.push(relation.rowIds[index]);
    }
  });
  const result = createRelation(relation.name, relation.schema, filteredRows, { rowIds: filteredIds, alias: relation.name });
  return buildMetadata({
    relation: result,
    operation: 'σ',
    highlightRows: filteredIds,
    diff: {
      removed: relation.rows.length - filteredRows.length,
      kept: filteredRows.length,
    },
    details: { predicate: predicate.toString() },
  });
}

export function projection(relation, columns) {
  if (!columns || columns.length === 0) {
    throw new Error('Projection requires at least one column.');
  }
  const columnIndexes = columns.map((columnName) => {
    const index = relation.schema.findIndex((column) => column.name === columnName.name);
    if (index === -1) {
      throw new Error(`Column ${columnName.name} not found in relation ${relation.name}.`);
    }
    return { index, type: relation.schema[index].type, alias: columnName.alias || columnName.name };
  });

  const projectedRows = relation.rows.map((row, rowIndex) => {
    return columnIndexes.map(({ index }) => row[index]);
  });
  const projectedIds = relation.rowIds.map((rowId) => `${rowId}-π`);
  const schema = columnIndexes.map(({ alias, type }) => ({ name: alias, type }));
  const deduped = dedupeRows(projectedRows, projectedIds);
  const result = createRelation(relation.name, schema, deduped.rows, { rowIds: deduped.rowIds, alias: relation.name });
  return buildMetadata({
    relation: result,
    operation: 'π',
    highlightColumns: schema.map((column) => column.name),
    diff: {
      inputColumns: relation.schema.length,
      outputColumns: schema.length,
    },
    details: { columns: schema.map((column) => column.name) },
  });
}

export function rename(relation, renameMap) {
  const newSchema = relation.schema.map((column) => {
    return {
      name: renameMap[column.name] || column.name,
      type: column.type,
    };
  });
  const result = createRelation(relation.name, newSchema, relation.rows, { rowIds: relation.rowIds, alias: relation.name });
  return buildMetadata({
    relation: result,
    operation: 'ρ',
    highlightColumns: Object.values(renameMap),
    details: { renameMap },
  });
}

export function union(left, right) {
  ensureCompatibleSchemas(left, right);
  const combinedRows = [...left.rows.map((row) => [...row]), ...right.rows.map((row) => [...row])];
  const combinedIds = [...left.rowIds, ...right.rowIds];
  const deduped = dedupeRows(combinedRows, combinedIds);
  const result = createRelation(left.name, left.schema, deduped.rows, { rowIds: deduped.rowIds, alias: `${left.name}∪${right.name}` });
  return buildMetadata({
    relation: result,
    operation: '∪',
    highlightRows: deduped.rowIds,
    details: { left: left.name, right: right.name, leftRows: left.rows.length, rightRows: right.rows.length },
  });
}

export function intersection(left, right) {
  ensureCompatibleSchemas(left, right);
  const rightKeys = new Map();
  right.rows.forEach((row, index) => {
    rightKeys.set(JSON.stringify(row), right.rowIds[index]);
  });
  const matchedRows = [];
  const matchedIds = [];
  left.rows.forEach((row, index) => {
    const key = JSON.stringify(row);
    if (rightKeys.has(key)) {
      matchedRows.push([...row]);
      matchedIds.push(`${left.rowIds[index]}∩${rightKeys.get(key)}`);
    }
  });
  const result = createRelation(left.name, left.schema, matchedRows, { rowIds: matchedIds, alias: `${left.name}∩${right.name}` });
  return buildMetadata({
    relation: result,
    operation: '∩',
    highlightRows: matchedIds,
    details: { left: left.name, right: right.name, leftRows: left.rows.length, rightRows: right.rows.length },
  });
}

export function difference(left, right) {
  ensureCompatibleSchemas(left, right);
  const rightKeys = new Set(right.rows.map((row) => JSON.stringify(row)));
  const filteredRows = [];
  const filteredIds = [];
  left.rows.forEach((row, index) => {
    const key = JSON.stringify(row);
    if (!rightKeys.has(key)) {
      filteredRows.push([...row]);
      filteredIds.push(`${left.rowIds[index]}-`);
    }
  });
  const result = createRelation(left.name, left.schema, filteredRows, { rowIds: filteredIds, alias: `${left.name}−${right.name}` });
  return buildMetadata({
    relation: result,
    operation: '−',
    highlightRows: filteredIds,
    diff: {
      removed: left.rows.length - filteredRows.length,
    },
    details: { left: left.name, right: right.name, leftRows: left.rows.length, rightRows: right.rows.length },
  });
}

export function cartesianProduct(left, right) {
  const schema = [
    ...left.schema.map((column) => ({ name: `${left.name}.${column.name}`, type: column.type })),
    ...right.schema.map((column) => ({ name: `${right.name}.${column.name}`, type: column.type })),
  ];
  const rows = [];
  const rowIds = [];
  left.rows.forEach((leftRow, leftIndex) => {
    right.rows.forEach((rightRow, rightIndex) => {
      rows.push([...leftRow, ...rightRow]);
      rowIds.push(`${left.rowIds[leftIndex]}×${right.rowIds[rightIndex]}`);
    });
  });
  const result = createRelation(`${left.name}×${right.name}`, schema, rows, { rowIds });
  return buildMetadata({
    relation: result,
    operation: '×',
    highlightRows: rowIds,
    details: { left: left.name, right: right.name },
  });
}

export function equiJoin(left, right, joinCondition) {
  const leftKeyIndexes = joinCondition.leftKeys.map((key) => {
    const index = left.schema.findIndex((column) => column.name === key);
    if (index === -1) {
      throw new Error(`Join key ${key} not present in left relation ${left.name}.`);
    }
    return index;
  });
  const rightKeyIndexes = joinCondition.rightKeys.map((key) => {
    const index = right.schema.findIndex((column) => column.name === key);
    if (index === -1) {
      throw new Error(`Join key ${key} not present in right relation ${right.name}.`);
    }
    return index;
  });
  if (leftKeyIndexes.length !== rightKeyIndexes.length) {
    throw new Error('Join key counts must match.');
  }
  const schema = [
    ...left.schema.map((column) => ({ name: `${left.name}.${column.name}`, type: column.type })),
    ...right.schema.map((column) => ({ name: `${right.name}.${column.name}`, type: column.type })),
  ];
  const rightIndexMap = new Map();
  right.rows.forEach((row, index) => {
    const key = rightKeyIndexes.map((keyIndex) => row[keyIndex]).join('|');
    if (!rightIndexMap.has(key)) {
      rightIndexMap.set(key, []);
    }
    rightIndexMap.get(key).push({ row, rowId: right.rowIds[index] });
  });

  const joinedRows = [];
  const joinedIds = [];
  const matchedPairs = [];

  left.rows.forEach((leftRow, leftIndex) => {
    const key = leftKeyIndexes.map((keyIndex) => leftRow[keyIndex]).join('|');
    const matches = rightIndexMap.get(key);
    if (matches) {
      matches.forEach(({ row: rightRow, rowId }) => {
        joinedRows.push([...leftRow, ...rightRow]);
        const newId = `${left.rowIds[leftIndex]}⋈${rowId}`;
        joinedIds.push(newId);
        matchedPairs.push({ left: left.rowIds[leftIndex], right: rowId });
      });
    }
  });

  const result = createRelation(`${left.name}⋈${right.name}`, schema, joinedRows, { rowIds: joinedIds });
  return buildMetadata({
    relation: result,
    operation: '⋈',
    highlightRows: joinedIds,
    details: {
      left: left.name,
      right: right.name,
      keys: joinCondition.leftKeys.map((key, index) => `${left.name}.${key} = ${right.name}.${joinCondition.rightKeys[index]}`),
      matchedPairs,
    },
  });
}

export function division(dividend, divisor) {
  if (divisor.schema.length > dividend.schema.length) {
    throw new Error('Divisor arity cannot exceed dividend arity.');
  }
  const dividendSchemaNames = dividend.schema.map((column) => column.name);
  const divisorSchemaNames = divisor.schema.map((column) => column.name);

  divisorSchemaNames.forEach((columnName) => {
    if (!dividendSchemaNames.includes(columnName)) {
      throw new Error(`Divisor column ${columnName} missing from dividend schema.`);
    }
  });

  const quotientColumns = dividend.schema.filter((column) => !divisorSchemaNames.includes(column.name));
  const quotientColumnNames = quotientColumns.map((column) => column.name);

  const grouped = new Map();
  dividend.rows.forEach((row, index) => {
    const quotientKey = quotientColumnNames.map((columnName) => {
      const columnIndex = dividend.schema.findIndex((column) => column.name === columnName);
      return row[columnIndex];
    });
    const divisorKey = divisorSchemaNames.map((columnName) => {
      const columnIndex = dividend.schema.findIndex((column) => column.name === columnName);
      return row[columnIndex];
    });
    const key = JSON.stringify(quotientKey);
    if (!grouped.has(key)) {
      grouped.set(key, new Set());
    }
    grouped.get(key).add(JSON.stringify(divisorKey));
  });

  const requiredKeys = new Set(divisor.rows.map((row) => JSON.stringify(row)));
  const quotientRows = [];
  const quotientIds = [];

  grouped.forEach((divisorSet, key) => {
    let containsAll = true;
    requiredKeys.forEach((requiredKey) => {
      if (!divisorSet.has(requiredKey)) {
        containsAll = false;
      }
    });
    if (containsAll) {
      const values = JSON.parse(key);
      quotientRows.push(values);
      quotientIds.push(`${dividend.name}÷${divisor.name}-${key}`);
    }
  });

  const result = createRelation(`${dividend.name}÷${divisor.name}`, quotientColumns, quotientRows, { rowIds: quotientIds });
  return buildMetadata({
    relation: result,
    operation: '÷',
    highlightRows: quotientIds,
    details: {
      dividend: dividend.name,
      divisor: divisor.name,
      quotientColumns: quotientColumnNames,
    },
  });
}

export function applyOperator(operator, inputs, payload) {
  switch (operator) {
    case 'dataset':
      return buildMetadata({ relation: inputs[0], operation: 'dataset' });
    case 'σ':
      return selection(inputs[0], payload.predicate);
    case 'π':
      return projection(inputs[0], payload.columns);
    case 'ρ':
      return rename(inputs[0], payload.renameMap);
    case '∪':
      return union(inputs[0], inputs[1]);
    case '−':
      return difference(inputs[0], inputs[1]);
    case '×':
      return cartesianProduct(inputs[0], inputs[1]);
    case '⋈':
      return equiJoin(inputs[0], inputs[1], payload.joinCondition);
    case '∩':
      return intersection(inputs[0], inputs[1]);
    case '÷':
      return division(inputs[0], inputs[1]);
    default:
      throw new Error(`Unsupported operator ${operator}`);
  }
}

export function mergeMetadata(base, extension) {
  return {
    ...base,
    ...extension,
    details: { ...(base?.details || {}), ...(extension?.details || {}) },
  };
}

export function summariseRelation(relation) {
  return {
    name: relation.name,
    rowCount: relation.rows.length,
    columnCount: relation.schema.length,
  };
}

export function relationDiff(previous, next) {
  if (!previous) {
    return {
      added: next?.rows.length || 0,
      removed: 0,
      changedColumns: next?.schema.length || 0,
    };
  }
  const previousKeys = new Set(previous.rows.map((row) => JSON.stringify(row)));
  const nextKeys = new Set(next.rows.map((row) => JSON.stringify(row)));
  let added = 0;
  nextKeys.forEach((key) => {
    if (!previousKeys.has(key)) {
      added += 1;
    }
  });
  let removed = 0;
  previousKeys.forEach((key) => {
    if (!nextKeys.has(key)) {
      removed += 1;
    }
  });
  const changedColumns = previous.schema.filter((column, index) => {
    const other = next.schema[index];
    return !other || column.name !== other.name || column.type !== other.type;
  }).length;
  return { added, removed, changedColumns };
}

export function ensureRelation(value) {
  if (!value || !Array.isArray(value.schema) || !Array.isArray(value.rows)) {
    throw new Error('Value is not a relation.');
  }
  return value;
}
