import { getRelation } from '../data/seed';
import { NODE_KINDS } from './types';
import { predicateToString } from './predicates';

const cloneValues = (columns, sourceValues) => {
  const result = {};
  columns.forEach((column) => {
    result[column] = sourceValues[column];
  });
  return result;
};

const makeBaseRelation = (name) => {
  const relation = getRelation(name);
  const columns = relation.columns;
  const rows = relation.rows.map((row, index) => ({
    values: { ...row },
    lineage: [{ relation: name, index }],
  }));
  return { name, columns, rows };
};

const dedupeRows = (columns, rows) => {
  const seen = new Set();
  const result = [];
  rows.forEach((row) => {
    const key = JSON.stringify(columns.map((column) => row.values[column]));
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });
  return result;
};

const select = (input, predicate) => {
  const rows = input.rows.filter((row) => predicate.test(row.values));
  return {
    name: `${input.name}_sel`,
    columns: input.columns,
    rows,
    meta: { predicate: predicateToString(predicate) },
  };
};

const project = (input, columns) => {
  const rows = input.rows.map((row) => ({
    values: cloneValues(columns, row.values),
    lineage: row.lineage,
  }));
  return {
    name: `${input.name}_proj`,
    columns,
    rows: dedupeRows(columns, rows),
  };
};

const union = (left, right) => {
  const columns = left.columns;
  const rows = dedupeRows(columns, [...left.rows, ...right.rows]);
  return { name: `${left.name}_union_${right.name}`, columns, rows };
};

const intersection = (left, right) => {
  const columns = left.columns;
  const rightKeys = new Set(right.rows.map((row) => JSON.stringify(columns.map((column) => row.values[column]))));
  const rows = left.rows.filter((row) => rightKeys.has(JSON.stringify(columns.map((column) => row.values[column]))));
  return { name: `${left.name}_inter_${right.name}`, columns, rows };
};

const difference = (left, right) => {
  const columns = left.columns;
  const rightKeys = new Set(right.rows.map((row) => JSON.stringify(columns.map((column) => row.values[column]))));
  const rows = left.rows.filter((row) => !rightKeys.has(JSON.stringify(columns.map((column) => row.values[column]))));
  return { name: `${left.name}_minus_${right.name}`, columns, rows };
};

const product = (left, right) => {
  const columns = [...left.columns, ...right.columns];
  const rows = [];
  left.rows.forEach((leftRow) => {
    right.rows.forEach((rightRow) => {
      rows.push({
        values: { ...leftRow.values, ...rightRow.values },
        lineage: [...leftRow.lineage, ...rightRow.lineage],
      });
    });
  });
  return { name: `${left.name}_x_${right.name}`, columns, rows };
};

const join = (left, right, condition) => {
  const columns = [...left.columns];
  right.columns.forEach((column) => {
    if (!columns.includes(column)) {
      columns.push(column);
    }
  });
  const rows = [];
  left.rows.forEach((leftRow) => {
    right.rows.forEach((rightRow) => {
      const matches = condition.pairs.every((pair) => leftRow.values[pair.leftField] === rightRow.values[pair.rightField]);
      if (matches) {
        rows.push({
          values: { ...leftRow.values, ...rightRow.values },
          lineage: [...leftRow.lineage, ...rightRow.lineage],
        });
      }
    });
  });
  return { name: `${left.name}_join_${right.name}`, columns, rows };
};

const division = (dividend, divisor) => {
  const divisorColumns = divisor.columns;
  const keepColumns = dividend.columns.filter((column) => !divisorColumns.includes(column));
  const groups = new Map();
  dividend.rows.forEach((row) => {
    const key = JSON.stringify(keepColumns.map((column) => row.values[column]));
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  });

  const divisorKeys = divisor.rows.map((row) => JSON.stringify(divisorColumns.map((column) => row.values[column])));

  const rows = [];
  groups.forEach((rowsForKey, key) => {
    const baseValues = JSON.parse(key);
    const mappingValues = {};
    keepColumns.forEach((column, index) => {
      mappingValues[column] = baseValues[index];
    });

    const coversAll = divisorKeys.every((divKey) => {
      const targetValues = JSON.parse(divKey);
      return rowsForKey.some((row) => divisorColumns.every((column, index) => row.values[column] === targetValues[index]));
    });

    if (coversAll) {
      rows.push({
        values: mappingValues,
        lineage: rowsForKey.flatMap((row) => row.lineage),
      });
    }
  });

  return {
    name: `${dividend.name}_div_${divisor.name}`,
    columns: keepColumns,
    rows: dedupeRows(keepColumns, rows),
  };
};

export const evaluateNode = (node, steps = []) => {
  switch (node.kind) {
    case NODE_KINDS.BASE: {
      const relation = makeBaseRelation(node.relationName);
      steps.push({ id: node.id, label: node.relationName, output: relation });
      return relation;
    }
    case NODE_KINDS.SELECT: {
      const input = evaluateNode(node.input, steps);
      const result = select(input, node.predicate);
      steps.push({ id: node.id, label: `σ[${predicateToString(node.predicate)}]`, input, output: result });
      return result;
    }
    case NODE_KINDS.PROJECT: {
      const input = evaluateNode(node.input, steps);
      const result = project(input, node.columns);
      steps.push({ id: node.id, label: `π[${node.columns.join(', ')}]`, input, output: result });
      return result;
    }
    case NODE_KINDS.UNION: {
      const left = evaluateNode(node.left, steps);
      const right = evaluateNode(node.right, steps);
      const result = union(left, right);
      steps.push({ id: node.id, label: '∪', left, right, output: result });
      return result;
    }
    case NODE_KINDS.INTERSECTION: {
      const left = evaluateNode(node.left, steps);
      const right = evaluateNode(node.right, steps);
      const result = intersection(left, right);
      steps.push({ id: node.id, label: '∩', left, right, output: result });
      return result;
    }
    case NODE_KINDS.DIFFERENCE: {
      const left = evaluateNode(node.left, steps);
      const right = evaluateNode(node.right, steps);
      const result = difference(left, right);
      steps.push({ id: node.id, label: '−', left, right, output: result });
      return result;
    }
    case NODE_KINDS.PRODUCT: {
      const left = evaluateNode(node.left, steps);
      const right = evaluateNode(node.right, steps);
      const result = product(left, right);
      steps.push({ id: node.id, label: '×', left, right, output: result });
      return result;
    }
    case NODE_KINDS.JOIN: {
      const left = evaluateNode(node.left, steps);
      const right = evaluateNode(node.right, steps);
      const result = join(left, right, node.condition);
      steps.push({ id: node.id, label: '⋈', left, right, output: result });
      return result;
    }
    case NODE_KINDS.DIVISION: {
      const dividend = evaluateNode(node.dividend, steps);
      const divisor = evaluateNode(node.divisor, steps);
      const result = division(dividend, divisor);
      steps.push({ id: node.id, label: '÷', left: dividend, right: divisor, output: result });
      return result;
    }
    default:
      throw new Error(`Unsupported node kind: ${node.kind}`);
  }
};

export const executePlan = (root) => {
  const steps = [];
  const result = evaluateNode(root, steps);
  return { steps, result };
};
