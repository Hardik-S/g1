import {
  createRelation,
  selection,
  projection,
  equiJoin,
  union,
  difference,
  cartesianProduct,
  division,
} from '../logic/relationalAlgebra';

describe('relational algebra operators', () => {
  const employee = createRelation(
    'Employee',
    [
      { name: 'EmpID', type: 'int' },
      { name: 'Name', type: 'string' },
      { name: 'DeptID', type: 'int' },
    ],
    [
      [1, 'Ada', 10],
      [2, 'Grace', 10],
      [3, 'Alan', 20],
      [4, 'Edsger', 30],
    ],
  );
  const department = createRelation(
    'Department',
    [
      { name: 'DeptID', type: 'int' },
      { name: 'DeptName', type: 'string' },
    ],
    [
      [10, 'Research'],
      [20, 'Infrastructure'],
      [30, 'Design'],
    ],
  );

  it('filters rows via selection', () => {
    const metadata = selection(employee, (row) => row.DeptID === 10);
    expect(metadata.relation.rows).toEqual([
      [1, 'Ada', 10],
      [2, 'Grace', 10],
    ]);
    expect(metadata.highlightRows).toEqual(['Employee-0', 'Employee-1']);
  });

  it('projects unique columns with aliases', () => {
    const metadata = projection(employee, [
      { name: 'EmpID' },
      { name: 'DeptID', alias: 'Team' },
    ]);
    expect(metadata.relation.schema.map((column) => column.name)).toEqual(['EmpID', 'Team']);
    expect(metadata.relation.rows).toContainEqual([1, 10]);
    expect(metadata.relation.rows).toHaveLength(4);
  });

  it('performs equi-join and preserves row identity', () => {
    const metadata = equiJoin(employee, department, {
      leftKeys: ['DeptID'],
      rightKeys: ['DeptID'],
    });
    expect(metadata.relation.schema).toHaveLength(5);
    expect(metadata.relation.rows).toContainEqual([1, 'Ada', 10, 10, 'Research']);
    expect(metadata.details.keys).toContain('Employee.DeptID = Department.DeptID');
  });

  it('computes union with set semantics', () => {
    const metadata = union(employee, employee);
    expect(metadata.relation.rows).toHaveLength(4);
  });

  it('computes difference', () => {
    const metadata = difference(employee, createRelation(
      'EmployeeSubset',
      employee.schema,
      [
        [1, 'Ada', 10],
        [4, 'Edsger', 30],
      ],
    ));
    expect(metadata.relation.rows).toEqual([
      [2, 'Grace', 10],
      [3, 'Alan', 20],
    ]);
  });

  it('computes cartesian product', () => {
    const metadata = cartesianProduct(
      createRelation('A', [{ name: 'id', type: 'int' }], [[1], [2]]),
      createRelation('B', [{ name: 'value', type: 'int' }], [[9]]),
    );
    expect(metadata.relation.rows).toEqual([
      [1, 9],
      [2, 9],
    ]);
  });

  it('computes division for coverage', () => {
    const coverage = createRelation(
      'Coverage',
      [
        { name: 'EmpID', type: 'int' },
        { name: 'ProjID', type: 'int' },
      ],
      [
        [1, 201],
        [1, 202],
        [2, 201],
      ],
    );
    const projects = createRelation('Projects', [{ name: 'ProjID', type: 'int' }], [[201], [202]]);
    const metadata = division(coverage, projects);
    expect(metadata.relation.rows).toEqual([[1]]);
  });
});
