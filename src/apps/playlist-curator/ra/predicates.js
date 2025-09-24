export const clauseToString = (clause) => {
  if (clause.type === 'between') {
    return `${clause.field}∈[${clause.min}, ${clause.max})`;
  }
  if (clause.type === 'comparison') {
    return `${clause.field} ${clause.operator} ${clause.value}`;
  }
  if (clause.type === 'includes') {
    return `${clause.field} contains '${clause.value}'`;
  }
  if (clause.type === 'equals') {
    return `${clause.field}=${clause.value}`;
  }
  if (clause.type === 'boolean') {
    return `${clause.field} is ${clause.value}`;
  }
  return clause.label ?? clause.field;
};

export const predicateToString = (predicate) => {
  if (!predicate || predicate.clauses.length === 0) {
    return 'true';
  }
  return predicate.clauses.map(clauseToString).join(' ∧ ');
};

export const evaluateClause = (clause, row) => {
  const value = row[clause.field];
  switch (clause.type) {
    case 'between':
      return value >= clause.min && value < clause.max;
    case 'comparison':
      switch (clause.operator) {
        case '>':
          return value > clause.value;
        case '<':
          return value < clause.value;
        case '>=':
          return value >= clause.value;
        case '<=':
          return value <= clause.value;
        default:
          return false;
      }
    case 'equals':
      return value === clause.value;
    case 'boolean':
      return Boolean(value) === clause.value;
    case 'includes':
      if (Array.isArray(value)) {
        return value.map((item) => String(item).toLowerCase()).includes(String(clause.value).toLowerCase());
      }
      return String(value).toLowerCase().includes(String(clause.value).toLowerCase());
    default:
      return true;
  }
};

export const buildPredicate = (clauses) => ({
  clauses,
  test: (row) => clauses.every((clause) => evaluateClause(clause, row)),
});
