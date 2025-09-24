const OPERATORS = {
  '=': (left, right) => left === right,
  '!=': (left, right) => left !== right,
  '<': (left, right) => left < right,
  '<=': (left, right) => left <= right,
  '>': (left, right) => left > right,
  '>=': (left, right) => left >= right,
};

function tokenise(condition) {
  const tokens = [];
  const source = condition.trim();
  let index = 0;
  const length = source.length;

  const pushToken = (type, value) => {
    tokens.push({ type, value });
  };

  while (index < length) {
    const char = source[index];
    if (char === ' ' || char === '\n' || char === '\t') {
      index += 1;
      continue;
    }
    if (char === '(' || char === ')') {
      pushToken('paren', char);
      index += 1;
      continue;
    }
    if (char === '"' || char === '\'') {
      const quote = char;
      index += 1;
      let buffer = '';
      while (index < length && source[index] !== quote) {
        if (source[index] === '\\' && index + 1 < length) {
          buffer += source[index + 1];
          index += 2;
        } else {
          buffer += source[index];
          index += 1;
        }
      }
      if (source[index] !== quote) {
        throw new Error('Unterminated string literal in predicate.');
      }
      index += 1;
      pushToken('literal', buffer);
      continue;
    }
    if (/[0-9]/.test(char)) {
      let buffer = char;
      index += 1;
      while (index < length && /[0-9\.]/.test(source[index])) {
        buffer += source[index];
        index += 1;
      }
      const numeric = Number(buffer);
      pushToken('literal', Number.isNaN(numeric) ? buffer : numeric);
      continue;
    }
    if (char === '!' && source[index + 1] === '=') {
      pushToken('operator', '!=');
      index += 2;
      continue;
    }
    if (char === '<' || char === '>') {
      if (source[index + 1] === '=') {
        pushToken('operator', `${char}=`);
        index += 2;
      } else {
        pushToken('operator', char);
        index += 1;
      }
      continue;
    }
    if (char === '=') {
      pushToken('operator', '=');
      index += 1;
      continue;
    }
    const keywordMatch = /^(AND|OR|NOT)\b/i.exec(source.slice(index));
    if (keywordMatch) {
      pushToken('keyword', keywordMatch[1].toUpperCase());
      index += keywordMatch[0].length;
      continue;
    }
    const identifierMatch = /^[A-Za-z_][A-Za-z0-9_\.\[\]]*/.exec(source.slice(index));
    if (identifierMatch) {
      pushToken('identifier', identifierMatch[0]);
      index += identifierMatch[0].length;
      continue;
    }
    throw new Error(`Unexpected token near "${source.slice(index, index + 10)}"`);
  }

  return tokens;
}

function parse(tokens) {
  let index = 0;

  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  function parsePrimary() {
    const token = peek();
    if (!token) {
      throw new Error('Unexpected end of predicate.');
    }
    if (token.type === 'paren' && token.value === '(') {
      consume();
      const expression = parseExpression();
      const closing = consume();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Mismatched parentheses in predicate.');
      }
      return expression;
    }
    if (token.type === 'keyword' && token.value === 'NOT') {
      consume();
      return { type: 'not', operand: parsePrimary() };
    }
    if (token.type === 'identifier' || token.type === 'literal') {
      consume();
      return { type: 'value', value: token.value, valueType: token.type };
    }
    throw new Error(`Unexpected token ${token.value}`);
  }

  function parseComparison() {
    const left = parsePrimary();
    const operatorToken = peek();
    if (operatorToken && operatorToken.type === 'operator') {
      consume();
      const right = parsePrimary();
      return { type: 'comparison', operator: operatorToken.value, left, right };
    }
    return left;
  }

  function parseAnd() {
    let node = parseComparison();
    while (peek() && peek().type === 'keyword' && peek().value === 'AND') {
      consume();
      node = { type: 'and', left: node, right: parseComparison() };
    }
    return node;
  }

  function parseExpression() {
    let node = parseAnd();
    while (peek() && peek().type === 'keyword' && peek().value === 'OR') {
      consume();
      node = { type: 'or', left: node, right: parseAnd() };
    }
    return node;
  }

  const ast = parseExpression();
  if (index !== tokens.length) {
    throw new Error('Unexpected trailing tokens in predicate.');
  }
  return ast;
}

function resolveIdentifier(identifier, schema, row) {
  const name = identifier.replace(/\[(\d+)\]/g, '.$1');
  const parts = name.split('.');
  if (parts.length === 1) {
    const columnIndex = schema.findIndex((column) => column.name === parts[0]);
    if (columnIndex === -1) {
      throw new Error(`Unknown column ${parts[0]} in predicate.`);
    }
    return row[columnIndex];
  }
  const joinedName = parts.join('.');
  const columnIndex = schema.findIndex((column) => column.name === joinedName);
  if (columnIndex !== -1) {
    return row[columnIndex];
  }
  // fallback to simple name
  const fallbackIndex = schema.findIndex((column) => column.name.endsWith(parts[parts.length - 1]));
  if (fallbackIndex === -1) {
    throw new Error(`Unable to resolve identifier ${identifier}`);
  }
  return row[fallbackIndex];
}

function evaluateAst(ast, schema, row) {
  switch (ast.type) {
    case 'value':
      if (ast.valueType === 'identifier') {
        return resolveIdentifier(ast.value, schema, row);
      }
      return ast.value;
    case 'comparison': {
      const left = evaluateAst(ast.left, schema, row);
      const right = evaluateAst(ast.right, schema, row);
      const operator = OPERATORS[ast.operator];
      if (!operator) {
        throw new Error(`Unsupported operator ${ast.operator}`);
      }
      return operator(left, right);
    }
    case 'and':
      return evaluateAst(ast.left, schema, row) && evaluateAst(ast.right, schema, row);
    case 'or':
      return evaluateAst(ast.left, schema, row) || evaluateAst(ast.right, schema, row);
    case 'not':
      return !evaluateAst(ast.operand, schema, row);
    default:
      throw new Error(`Unsupported predicate node ${ast.type}`);
  }
}

export function buildPredicate(condition, schema) {
  const trimmed = (condition || '').trim();
  if (!trimmed) {
    const predicate = () => true;
    predicate.sql = '1 = 1';
    return predicate;
  }
  const tokens = tokenise(trimmed);
  const ast = parse(tokens);
  const predicate = (context) => {
    const row = schema.map((column) => context[column.name]);
    return evaluateAst(ast, schema, row);
  };
  predicate.sql = trimmed;
  return predicate;
}
