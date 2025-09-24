let counter = 0;

const makeId = (prefix) => `${prefix}-${++counter}`;

export const NODE_KINDS = {
  BASE: 'base',
  SELECT: 'select',
  PROJECT: 'project',
  UNION: 'union',
  INTERSECTION: 'intersection',
  DIFFERENCE: 'difference',
  PRODUCT: 'product',
  JOIN: 'join',
  DIVISION: 'division',
};

export const baseNode = (relationName, alias) => ({
  id: makeId('base'),
  kind: NODE_KINDS.BASE,
  relationName,
  alias: alias ?? relationName,
});

export const selectNode = (input, predicate, label) => ({
  id: makeId('sigma'),
  kind: NODE_KINDS.SELECT,
  input,
  predicate,
  label,
});

export const projectNode = (input, columns) => ({
  id: makeId('pi'),
  kind: NODE_KINDS.PROJECT,
  input,
  columns,
});

export const unionNode = (left, right) => ({
  id: makeId('union'),
  kind: NODE_KINDS.UNION,
  left,
  right,
});

export const intersectionNode = (left, right) => ({
  id: makeId('intersect'),
  kind: NODE_KINDS.INTERSECTION,
  left,
  right,
});

export const differenceNode = (left, right) => ({
  id: makeId('diff'),
  kind: NODE_KINDS.DIFFERENCE,
  left,
  right,
});

export const productNode = (left, right) => ({
  id: makeId('prod'),
  kind: NODE_KINDS.PRODUCT,
  left,
  right,
});

export const joinNode = (left, right, condition) => ({
  id: makeId('join'),
  kind: NODE_KINDS.JOIN,
  left,
  right,
  condition,
});

export const divisionNode = (dividend, divisor) => ({
  id: makeId('div'),
  kind: NODE_KINDS.DIVISION,
  dividend,
  divisor,
});

export const resetIdCounter = () => {
  counter = 0;
};
