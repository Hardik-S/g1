import { evaluatePipeline, pipelineToSql } from '../logic/pipeline';
import { seedRelations } from '../data/seedRelations';

const catalog = seedRelations.reduce((acc, relation) => {
  acc[relation.name] = relation;
  return acc;
}, {});

describe('pipeline execution', () => {
  it('runs a selection followed by projection', () => {
    const nodes = [
      { id: 'n1', type: 'dataset', source: 'Employee', inputIds: [] },
      { id: 'n2', type: 'σ', inputIds: ['n1'], condition: 'Salary > 4000' },
      { id: 'n3', type: 'π', inputIds: ['n2'], columns: [{ name: 'EmpID' }, { name: 'Name' }] },
    ];
    const results = evaluatePipeline(nodes, catalog);
    expect(results[2].relation.rows.every((row) => row.length === 2)).toBe(true);
    expect(results[2].sql).toMatch(/SELECT DISTINCT/);
  });

  it('computes join SQL from pipeline', () => {
    const nodes = [
      { id: 'a', type: 'dataset', source: 'Employee', inputIds: [] },
      { id: 'b', type: 'dataset', source: 'Department', inputIds: [] },
      {
        id: 'c',
        type: '⋈',
        inputIds: ['a', 'b'],
        condition: 'Employee.DeptID = Department.DeptID',
      },
    ];
    const results = evaluatePipeline(nodes, catalog);
    expect(results[2].relation.rows.length).toBeGreaterThan(0);
    expect(results[2].sql).toMatch(/INNER JOIN/);
  });

  it('exposes SQL for final node', () => {
    const nodes = [
      { id: 'assign', type: 'dataset', source: 'Assignment', inputIds: [] },
      { id: 'projects', type: 'dataset', source: 'Project', inputIds: [] },
      { id: 'proj-only', type: 'π', inputIds: ['projects'], columns: [{ name: 'ProjID' }] },
      { id: 'div', type: '÷', inputIds: ['assign', 'proj-only'] },
    ];
    const results = evaluatePipeline(nodes, catalog);
    const sql = pipelineToSql(results);
    expect(sql).toContain('DIVISION');
  });
});
