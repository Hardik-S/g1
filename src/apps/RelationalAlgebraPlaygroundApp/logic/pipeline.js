import { relationByName } from '../data/seedRelations';
import {
  applyOperator,
  createRelation,
  relationDiff,
  summariseRelation,
} from './relationalAlgebra';
import { buildPredicate } from './predicates';
import { parseJoinKeys, projectionToSql, selectionToSql, setOperatorSql, joinToSql, relationToSql } from './sqlTranslator';

function resolveDataset(name, overrides = {}) {
  const relation = overrides[name] || relationByName(name);
  if (!relation) {
    throw new Error(`Dataset ${name} not found.`);
  }
  return createRelation(relation.name, relation.schema, relation.rows, { rowIds: relation.rows.map((_, index) => `${relation.name}-${index}`) });
}

function buildColumnsConfig(relation, columns) {
  if (columns && columns.length > 0) {
    return columns;
  }
  return relation.schema.map((column) => ({ name: column.name }));
}

export function evaluatePipeline(nodes, datasets = {}) {
  const results = new Map();
  const ordered = [];
  nodes.forEach((node) => {
    const startTime = performance.now();
    try {
      if (node.type === 'dataset') {
        const relation = resolveDataset(node.source, datasets);
        const sql = relationToSql(node.source);
        const output = {
          id: node.id,
          type: node.type,
          relation,
          sql,
          metadata: { relation, operation: 'dataset', details: { schema: relation.schema } },
          diff: relationDiff(null, relation),
          summary: summariseRelation(relation),
          elapsedMs: performance.now() - startTime,
        };
        results.set(node.id, output);
        ordered.push(output);
        return;
      }
      const inputNodes = (node.inputIds || []).map((inputId) => {
        const resolved = results.get(inputId);
        if (!resolved) {
          throw new Error(`Input node ${inputId} has not produced a relation yet.`);
        }
        if (!resolved.relation) {
          throw new Error(`Input node ${inputId} is missing relation output.`);
        }
        return resolved;
      });
      let metadata;
      let sql;
      switch (node.type) {
        case 'σ': {
          const predicate = buildPredicate(node.condition, inputNodes[0].relation.schema);
          metadata = applyOperator('σ', [inputNodes[0].relation], { predicate });
          sql = selectionToSql(inputNodes[0].sql, predicate.sql);
          break;
        }
        case 'π': {
          const columns = buildColumnsConfig(inputNodes[0].relation, node.columns);
          metadata = applyOperator('π', [inputNodes[0].relation], { columns });
          sql = projectionToSql(inputNodes[0].sql, columns);
          break;
        }
        case 'ρ': {
          metadata = applyOperator('ρ', [inputNodes[0].relation], { renameMap: node.renameMap || {} });
          sql = `${inputNodes[0].sql} /* RENAME ${JSON.stringify(node.renameMap || {})} */`;
          break;
        }
        case '∪': {
          metadata = applyOperator('∪', [inputNodes[0].relation, inputNodes[1].relation], {});
          sql = setOperatorSql(inputNodes[0].sql, inputNodes[1].sql, 'UNION');
          break;
        }
        case '∩': {
          metadata = applyOperator('∩', [inputNodes[0].relation, inputNodes[1].relation], {});
          sql = setOperatorSql(inputNodes[0].sql, inputNodes[1].sql, 'INTERSECT');
          break;
        }
        case '−': {
          metadata = applyOperator('−', [inputNodes[0].relation, inputNodes[1].relation], {});
          sql = setOperatorSql(inputNodes[0].sql, inputNodes[1].sql, 'EXCEPT');
          break;
        }
        case '×': {
          metadata = applyOperator('×', [inputNodes[0].relation, inputNodes[1].relation], {});
          sql = `${inputNodes[0].sql} CROSS JOIN (${inputNodes[1].sql})`;
          break;
        }
        case '⋈': {
          const joinCondition = parseJoinKeys(node.condition);
          metadata = applyOperator('⋈', [inputNodes[0].relation, inputNodes[1].relation], { joinCondition });
          sql = joinToSql(inputNodes[0].sql, inputNodes[1].sql, node.condition);
          break;
        }
        case '÷': {
          metadata = applyOperator('÷', [inputNodes[0].relation, inputNodes[1].relation], {});
          sql = `${inputNodes[0].sql} /* DIVISION by (${inputNodes[1].sql}) */`;
          break;
        }
        default:
          throw new Error(`Unsupported node type ${node.type}`);
      }
      const previous = ordered.length > 0 ? ordered[ordered.length - 1].relation : null;
      const diff = relationDiff(previous, metadata.relation);
      const output = {
        id: node.id,
        type: node.type,
        relation: metadata.relation,
        sql,
        metadata,
        diff,
        summary: summariseRelation(metadata.relation),
        elapsedMs: performance.now() - startTime,
        inputs: inputNodes.map((input) => input.id),
      };
      results.set(node.id, output);
      ordered.push(output);
    } catch (error) {
      const output = {
        id: node.id,
        type: node.type,
        relation: null,
        sql: '',
        metadata: null,
        diff: null,
        summary: null,
        error: error.message,
        elapsedMs: performance.now() - startTime,
        inputs: node.inputIds,
      };
      results.set(node.id, output);
      ordered.push(output);
    }
  });
  return ordered;
}

export function pipelineToSql(ordered) {
  if (!ordered || ordered.length === 0) {
    return '';
  }
  const last = ordered[ordered.length - 1];
  return last.sql;
}

export function snapshotPipeline(nodes) {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    condition: node.condition || null,
    columns: node.columns || null,
    renameMap: node.renameMap || null,
    inputIds: node.inputIds || [],
    source: node.source || null,
  }));
}
