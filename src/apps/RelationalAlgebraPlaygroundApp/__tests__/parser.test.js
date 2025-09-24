import { parseRelationalAlgebra, astToPipeline, evaluateAst } from '../logic/parser';
import { seedRelations } from '../data/seedRelations';

const catalog = seedRelations.reduce((acc, relation) => {
  acc[relation.name] = relation;
  return acc;
}, {});

describe('relational algebra parser', () => {
  it('parses unicode selection and projection', () => {
    const ast = parseRelationalAlgebra('π_{EmpID,Name}(σ_{Salary > 3000}(Employee))');
    expect(ast.type).toBe('projection');
    expect(ast.source.type).toBe('selection');
  });

  it('parses ascii fallback for sigma and join', () => {
    const ast = parseRelationalAlgebra('JOIN(Employee, Department, Employee.DeptID = Department.DeptID)');
    expect(ast.type).toBe('join');
    expect(ast.left.type).toBe('relation');
    expect(ast.right.type).toBe('relation');
  });

  it('evaluates AST against seed catalog', () => {
    const ast = parseRelationalAlgebra('σ_{DeptID = 1}(Employee)');
    const evaluation = evaluateAst(ast, catalog);
    expect(evaluation.relation.rows.every((row) => row[2] === 1)).toBe(true);
  });

  it('builds pipeline nodes from expression', () => {
    const ast = parseRelationalAlgebra('π_{EmpID}(σ_{Salary > 4000}(Employee))');
    const nodes = astToPipeline(ast);
    expect(nodes).toHaveLength(3); // dataset, selection, projection
    expect(nodes[0].type).toBe('dataset');
    expect(nodes[2].type).toBe('π');
  });
});
