import { relationByName } from '../data/seedRelations';
import {
  applyOperator,
  createRelation,
} from './relationalAlgebra';
import { buildPredicate } from './predicates';
import { parseJoinKeys } from './sqlTranslator';

class ParserError extends Error {
  constructor(message, index) {
    super(message);
    this.index = index;
  }
}

function createContext(source) {
  return {
    source,
    index: 0,
  };
}

function peek(context) {
  return context.source[context.index];
}

function consume(context) {
  const char = context.source[context.index];
  context.index += 1;
  return char;
}

function skipWhitespace(context) {
  while (context.index < context.source.length) {
    const char = context.source[context.index];
    if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
      context.index += 1;
    } else {
      break;
    }
  }
}

function match(context, token) {
  skipWhitespace(context);
  if (context.source.slice(context.index, context.index + token.length) === token) {
    context.index += token.length;
    return true;
  }
  return false;
}

function matchWord(context, word) {
  skipWhitespace(context);
  const segment = context.source.slice(context.index, context.index + word.length);
  if (segment.toLowerCase() === word.toLowerCase()) {
    const next = context.source[context.index + word.length];
    if (!next || /[^a-zA-Z0-9_]/.test(next)) {
      context.index += word.length;
      return true;
    }
  }
  return false;
}

function expect(context, token, message) {
  if (!match(context, token)) {
    throw new ParserError(message || `Expected "${token}"`, context.index);
  }
}

function parseIdentifier(context) {
  skipWhitespace(context);
  const char = peek(context);
  if (char === '"') {
    consume(context);
    let value = '';
    while (context.index < context.source.length) {
      const nextChar = consume(context);
      if (nextChar === '"') {
        return value;
      }
      value += nextChar;
    }
    throw new ParserError('Unterminated quoted identifier', context.index);
  }
  const matchResult = /[a-zA-Z_][a-zA-Z0-9_.]*/.exec(context.source.slice(context.index));
  if (!matchResult) {
    throw new ParserError('Expected identifier', context.index);
  }
  context.index += matchResult[0].length;
  return matchResult[0];
}

function parseColumnsList(raw) {
  const trimmed = raw.trim()
    .replace(/[{}]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '');
  if (!trimmed) {
    return [];
  }
  return trimmed.split(',').map((entry) => {
    const [left, right] = entry.split(/->|←|:/).map((part) => part?.trim()).filter(Boolean);
    if (right) {
      return { name: left, alias: right };
    }
    if (left) {
      return { name: left };
    }
    return null;
  }).filter(Boolean);
}

function parseRenameMap(raw) {
  const trimmed = raw.trim()
    .replace(/[{}]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '');
  if (!trimmed) {
    return {};
  }
  const map = {};
  trimmed.split(',').forEach((entry) => {
    const [from, to] = entry.split(/->|←|:/).map((part) => part?.trim());
    if (!from || !to) {
      throw new ParserError(`Invalid rename mapping in "${entry}"`, -1);
    }
    map[from] = to;
  });
  return map;
}

function readUntilComma(context) {
  let depth = 0;
  let buffer = '';
  while (context.index < context.source.length) {
    const char = context.source[context.index];
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    } else if (char === ')' || char === ']' || char === '}') {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (char === ',' && depth === 0) {
      break;
    }
    buffer += char;
    context.index += 1;
  }
  return buffer;
}

function parseUnary(context) {
  skipWhitespace(context);
  if (match(context, 'σ')) {
    let condition = '';
    skipWhitespace(context);
    if (match(context, '_')) {
      skipWhitespace(context);
      if (match(context, '{')) {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '}') {
          context.index += 1;
        }
        condition = context.source.slice(start, context.index);
        expect(context, '}', 'Selection condition missing closing brace.');
      } else {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '(') {
          context.index += 1;
        }
        condition = context.source.slice(start, context.index).trim();
      }
    }
    expect(context, '(', 'Selection requires parentheses.');
    const source = parseExpression(context);
    expect(context, ')', 'Selection missing closing parenthesis.');
    return { type: 'selection', condition: condition.trim(), source };
  }
  if (match(context, 'π')) {
    let columnSpec = '';
    skipWhitespace(context);
    if (match(context, '_')) {
      skipWhitespace(context);
      if (match(context, '{')) {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '}') {
          context.index += 1;
        }
        columnSpec = context.source.slice(start, context.index);
        expect(context, '}', 'Projection missing closing brace.');
      } else {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '(') {
          context.index += 1;
        }
        columnSpec = context.source.slice(start, context.index);
      }
    }
    expect(context, '(', 'Projection requires parentheses.');
    const source = parseExpression(context);
    expect(context, ')', 'Projection missing closing parenthesis.');
    return { type: 'projection', columns: parseColumnsList(columnSpec), source };
  }
  if (match(context, 'ρ')) {
    let renameSpec = '';
    skipWhitespace(context);
    if (match(context, '_')) {
      skipWhitespace(context);
      if (match(context, '{')) {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '}') {
          context.index += 1;
        }
        renameSpec = context.source.slice(start, context.index);
        expect(context, '}', 'Rename missing closing brace.');
      } else {
        const start = context.index;
        while (context.index < context.source.length && context.source[context.index] !== '(') {
          context.index += 1;
        }
        renameSpec = context.source.slice(start, context.index);
      }
    }
    expect(context, '(', 'Rename requires parentheses.');
    const source = parseExpression(context);
    expect(context, ')', 'Rename missing closing parenthesis.');
    return { type: 'rename', renameMap: parseRenameMap(renameSpec), source };
  }
  if (matchWord(context, 'sigma')) {
    expect(context, '(', 'sigma requires parentheses.');
    const conditionRaw = readUntilComma(context);
    expect(context, ',', 'sigma expects a relation argument.');
    const source = parseExpression(context);
    expect(context, ')', 'sigma call missing closing parenthesis.');
    return { type: 'selection', condition: conditionRaw.trim(), source };
  }
  if (matchWord(context, 'pi')) {
    expect(context, '(', 'pi requires parentheses.');
    const columnRaw = readUntilComma(context);
    expect(context, ',', 'pi expects relation argument after column list.');
    const source = parseExpression(context);
    expect(context, ')', 'pi call missing closing parenthesis.');
    return { type: 'projection', columns: parseColumnsList(columnRaw), source };
  }
  if (matchWord(context, 'rho')) {
    expect(context, '(', 'rho requires parentheses.');
    const renameRaw = readUntilComma(context);
    expect(context, ',', 'rho expects relation argument after mapping.');
    const source = parseExpression(context);
    expect(context, ')', 'rho call missing closing parenthesis.');
    return { type: 'rename', renameMap: parseRenameMap(renameRaw), source };
  }
  if (matchWord(context, 'JOIN')) {
    expect(context, '(', 'JOIN requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'JOIN expects right relation.');
    const right = parseExpression(context);
    expect(context, ',', 'JOIN expects ON condition.');
    const conditionRaw = readUntilComma(context);
    expect(context, ')', 'JOIN call missing closing parenthesis.');
    return { type: 'join', condition: conditionRaw.trim(), left, right };
  }
  if (matchWord(context, 'UNION')) {
    expect(context, '(', 'UNION requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'UNION expects right relation.');
    const right = parseExpression(context);
    expect(context, ')', 'UNION missing closing parenthesis.');
    return { type: 'union', left, right };
  }
  if (matchWord(context, 'INTERSECT')) {
    expect(context, '(', 'INTERSECT requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'INTERSECT expects right relation.');
    const right = parseExpression(context);
    expect(context, ')', 'INTERSECT missing closing parenthesis.');
    return { type: 'intersection', left, right };
  }
  if (matchWord(context, 'DIFF')) {
    expect(context, '(', 'DIFF requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'DIFF expects right relation.');
    const right = parseExpression(context);
    expect(context, ')', 'DIFF missing closing parenthesis.');
    return { type: 'difference', left, right };
  }
  if (matchWord(context, 'CROSS')) {
    expect(context, '(', 'CROSS requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'CROSS expects right relation.');
    const right = parseExpression(context);
    expect(context, ')', 'CROSS missing closing parenthesis.');
    return { type: 'product', left, right };
  }
  if (matchWord(context, 'DIV')) {
    expect(context, '(', 'DIV requires parentheses.');
    const left = parseExpression(context);
    expect(context, ',', 'DIV expects right relation.');
    const right = parseExpression(context);
    expect(context, ')', 'DIV missing closing parenthesis.');
    return { type: 'division', left, right };
  }
  skipWhitespace(context);
  if (match(context, '(')) {
    const expression = parseExpression(context);
    expect(context, ')', 'Unclosed parenthesis.');
    return expression;
  }
  const identifier = parseIdentifier(context);
  return { type: 'relation', name: identifier };
}

function parseProductLike(context) {
  let expression = parseUnary(context);
  // Cartesian product and division / join as inline operators
  while (true) {
    skipWhitespace(context);
    if (match(context, '×')) {
      const right = parseUnary(context);
      expression = { type: 'product', left: expression, right };
      continue;
    }
    if (match(context, '÷')) {
      const right = parseUnary(context);
      expression = { type: 'division', left: expression, right };
      continue;
    }
    if (match(context, '⋈')) {
      let condition = '';
      skipWhitespace(context);
      if (match(context, '_')) {
        skipWhitespace(context);
        if (match(context, '{')) {
          const start = context.index;
          while (context.index < context.source.length && context.source[context.index] !== '}') {
            context.index += 1;
          }
          condition = context.source.slice(start, context.index);
          expect(context, '}', 'Join condition missing closing brace.');
        } else {
          const start = context.index;
          while (context.index < context.source.length && context.source[context.index] !== '(') {
            context.index += 1;
          }
          condition = context.source.slice(start, context.index).trim();
        }
      }
      const right = parseUnary(context);
      expression = { type: 'join', condition: condition.trim(), left: expression, right };
      continue;
    }
    break;
  }
  return expression;
}

function parseUnionLike(context) {
  let expression = parseProductLike(context);
  while (true) {
    skipWhitespace(context);
    if (match(context, '∪')) {
      const right = parseProductLike(context);
      expression = { type: 'union', left: expression, right };
      continue;
    }
    if (match(context, '∩')) {
      const right = parseProductLike(context);
      expression = { type: 'intersection', left: expression, right };
      continue;
    }
    if (match(context, '−')) {
      const right = parseProductLike(context);
      expression = { type: 'difference', left: expression, right };
      continue;
    }
    break;
  }
  return expression;
}

export function parseExpression(context) {
  return parseUnionLike(context);
}

export function parseRelationalAlgebra(input) {
  const context = createContext(input);
  const expression = parseExpression(context);
  skipWhitespace(context);
  if (context.index !== context.source.length) {
    throw new ParserError(`Unexpected trailing input at position ${context.index + 1}`, context.index);
  }
  return expression;
}

function resolveRelationNode(node, catalog) {
  if (node.type !== 'relation') {
    throw new Error('Attempted to resolve non-relation node as base relation.');
  }
  const relation = catalog[node.name] || relationByName(node.name);
  if (!relation) {
    throw new Error(`Unknown relation ${node.name}`);
  }
  return createRelation(relation.name, relation.schema, relation.rows, { rowIds: relation.rows.map((_, index) => `${relation.name}-${index}`) });
}

function parseJoinCondition(condition) {
  const parsed = parseJoinKeys(condition);
  return {
    raw: condition,
    leftKeys: parsed.leftKeys,
    rightKeys: parsed.rightKeys,
  };
}

export function evaluateAst(node, catalog = {}) {
  switch (node.type) {
    case 'relation':
      return {
        relation: resolveRelationNode(node, catalog),
        sql: `SELECT * FROM ${node.name}`,
        operator: 'dataset',
        metadata: null,
        spec: { source: node.name },
      };
    case 'selection': {
      const source = evaluateAst(node.source, catalog);
      const predicate = buildPredicate(node.condition, source.relation.schema);
      const metadata = applyOperator('σ', [source.relation], { predicate });
      return {
        relation: metadata.relation,
        sql: `${source.sql} WHERE ${predicate.sql || node.condition}`,
        operator: 'σ',
        metadata,
        inputs: [source],
        spec: { condition: node.condition },
      };
    }
    case 'projection': {
      const source = evaluateAst(node.source, catalog);
      const columns = node.columns.length > 0 ? node.columns : source.relation.schema.map((column) => ({ name: column.name }));
      const metadata = applyOperator('π', [source.relation], { columns });
      return {
        relation: metadata.relation,
        sql: `SELECT DISTINCT ${columns.map((column) => column.name === '*' ? '*' : column.name).join(', ')} FROM (${source.sql})`,
        operator: 'π',
        metadata,
        inputs: [source],
        spec: { columns },
      };
    }
    case 'rename': {
      const source = evaluateAst(node.source, catalog);
      const metadata = applyOperator('ρ', [source.relation], { renameMap: node.renameMap });
      return {
        relation: metadata.relation,
        sql: `${source.sql} /* rename ${JSON.stringify(node.renameMap)} */`,
        operator: 'ρ',
        metadata,
        inputs: [source],
        spec: { renameMap: node.renameMap },
      };
    }
    case 'union': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const metadata = applyOperator('∪', [left.relation, right.relation], {});
      return {
        relation: metadata.relation,
        sql: `${left.sql} UNION ${right.sql}`,
        operator: '∪',
        metadata,
        inputs: [left, right],
        spec: {},
      };
    }
    case 'intersection': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const metadata = applyOperator('∩', [left.relation, right.relation], {});
      return {
        relation: metadata.relation,
        sql: `${left.sql} INTERSECT ${right.sql}`,
        operator: '∩',
        metadata,
        inputs: [left, right],
        spec: {},
      };
    }
    case 'difference': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const metadata = applyOperator('−', [left.relation, right.relation], {});
      return {
        relation: metadata.relation,
        sql: `${left.sql} EXCEPT ${right.sql}`,
        operator: '−',
        metadata,
        inputs: [left, right],
        spec: {},
      };
    }
    case 'product': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const metadata = applyOperator('×', [left.relation, right.relation], {});
      return {
        relation: metadata.relation,
        sql: `${left.sql} CROSS JOIN (${right.sql})`,
        operator: '×',
        metadata,
        inputs: [left, right],
        spec: {},
      };
    }
    case 'join': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const joinCondition = parseJoinCondition(node.condition);
      const metadata = applyOperator('⋈', [left.relation, right.relation], { joinCondition });
      return {
        relation: metadata.relation,
        sql: `${left.sql} JOIN (${right.sql}) ON ${joinCondition.leftKeys.map((key, index) => `${key} = ${joinCondition.rightKeys[index]}`).join(' AND ')}`,
        operator: '⋈',
        metadata,
        inputs: [left, right],
        spec: { condition: node.condition },
      };
    }
    case 'division': {
      const left = evaluateAst(node.left, catalog);
      const right = evaluateAst(node.right, catalog);
      const metadata = applyOperator('÷', [left.relation, right.relation], {});
      return {
        relation: metadata.relation,
        sql: `${left.sql} /* DIVISION with ${right.sql} */`,
        operator: '÷',
        metadata,
        inputs: [left, right],
        spec: {},
      };
    }
    default:
      throw new Error(`Unsupported AST node type ${node.type}`);
  }
}

export class PipelineBuilder {
  constructor(ast) {
    this.ast = ast;
    this.nodes = [];
  }

  build() {
    this.traverse(this.ast);
    return this.nodes;
  }

  traverse(node) {
    switch (node.type) {
      case 'relation': {
        this.nodes.push({ type: 'dataset', source: node.name });
        break;
      }
      case 'selection': {
        this.traverse(node.source);
        this.nodes.push({ type: 'σ', condition: node.condition });
        break;
      }
      case 'projection': {
        this.traverse(node.source);
        this.nodes.push({ type: 'π', columns: node.columns });
        break;
      }
      case 'rename': {
        this.traverse(node.source);
        this.nodes.push({ type: 'ρ', renameMap: node.renameMap });
        break;
      }
      case 'union':
      case 'intersection':
      case 'difference':
      case 'product':
      case 'join':
      case 'division': {
        this.traverse(node.left);
        this.traverse(node.right);
        this.nodes.push({ type: node.type === 'product' ? '×' : node.type === 'difference' ? '−' : node.type === 'union' ? '∪' : node.type === 'intersection' ? '∩' : node.type === 'join' ? '⋈' : '÷', condition: node.condition, columns: node.columns, renameMap: node.renameMap });
        break;
      }
      default:
        throw new Error(`Unhandled node type ${node.type}`);
    }
  }
}

export function astToPipeline(ast) {
  const evaluation = evaluateAst(ast);
  const nodes = [];
  const datasetCache = new Map();
  let counter = 0;

  function nextId() {
    counter += 1;
    return `node-${counter}`;
  }

  function visit(nodeEval) {
    if (nodeEval.operator === 'dataset') {
      const datasetName = nodeEval.spec?.source || nodeEval.relation.name;
      if (!datasetCache.has(datasetName)) {
        const id = nextId();
        nodes.push({ id, type: 'dataset', source: datasetName, inputIds: [] });
        datasetCache.set(datasetName, id);
      }
      return datasetCache.get(datasetName);
    }
    const inputIds = (nodeEval.inputs || []).map((input) => visit(input));
    const id = nextId();
    const node = { id, type: nodeEval.operator, inputIds };
    if (nodeEval.operator === 'σ') {
      node.condition = nodeEval.spec?.condition || '';
    }
    if (nodeEval.operator === 'π') {
      node.columns = nodeEval.spec?.columns || [];
    }
    if (nodeEval.operator === 'ρ') {
      node.renameMap = nodeEval.spec?.renameMap || {};
    }
    if (nodeEval.operator === '⋈') {
      node.condition = nodeEval.spec?.condition || '';
    }
    nodes.push(node);
    return id;
  }

  visit(evaluation);
  return nodes;
}
