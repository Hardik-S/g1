import { buildPredicate } from './predicates';

export function parseJoinKeys(condition) {
  const trimmed = (condition || '').trim();
  if (!trimmed) {
    throw new Error('Join condition required for ⋈ operator.');
  }
  const clauses = trimmed.split(/\bAND\b/i).map((clause) => clause.trim()).filter(Boolean);
  const leftKeys = [];
  const rightKeys = [];
  const rawClauses = [];
  clauses.forEach((clause) => {
    const match = clause.match(/([^=<>!]+)=([^=<>!]+)/);
    if (!match) {
      throw new Error(`Unsupported join clause "${clause}"`);
    }
    const left = match[1].trim();
    const right = match[2].trim();
    leftKeys.push(left.split('.').pop().trim());
    rightKeys.push(right.split('.').pop().trim());
    rawClauses.push(`${left} = ${right}`);
  });
  return { leftKeys, rightKeys, rawClauses };
}

export function selectionToSql(inputSql, predicateText) {
  const predicate = (predicateText || '').trim() || '1 = 1';
  if (/\bWHERE\b/i.test(inputSql)) {
    return `${inputSql} AND (${predicate})`;
  }
  return `${inputSql} WHERE ${predicate}`;
}

export function projectionToSql(inputSql, columns) {
  if (!columns || columns.length === 0) {
    return inputSql;
  }
  const list = columns.map((column) => {
    if (column.alias && column.alias !== column.name) {
      return `${column.name} AS ${column.alias}`;
    }
    return column.name;
  }).join(', ');
  return `SELECT DISTINCT ${list} FROM (${inputSql})`;
}

export function renameToSql(inputSql, renameMap) {
  if (!renameMap || Object.keys(renameMap).length === 0) {
    return inputSql;
  }
  const selectList = Object.entries(renameMap).map(([from, to]) => `${from} AS ${to}`).join(', ');
  return `SELECT ${selectList} FROM (${inputSql})`;
}

export function joinToSql(leftSql, rightSql, condition) {
  const { rawClauses } = parseJoinKeys(condition);
  const pairs = rawClauses.length ? rawClauses : [condition];
  return `${leftSql} INNER JOIN (${rightSql}) ON ${pairs.join(' AND ')}`;
}

export function setOperatorSql(leftSql, rightSql, keyword) {
  return `${leftSql} ${keyword} ${rightSql}`;
}

export function divisionToSql(dividendSql, divisorSql, quotientColumns) {
  const list = quotientColumns.join(', ');
  const subquery = `SELECT ${list} FROM (${dividendSql}) AS dividend GROUP BY ${list} HAVING COUNT(DISTINCT (${divisorSql}))`;
  return subquery;
}

export function relationToSql(name) {
  return `SELECT * FROM ${name}`;
}

export function predicateSql(condition, schema) {
  return buildPredicate(condition, schema).sql;
}
