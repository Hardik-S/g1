# Relational Algebra Playground

Relational Algebra Playground is an in-browser lab for composing relational algebra pipelines, stepping through intermediate relations, and reviewing equivalent ANSI SQL on every node. The experience is fully client-side inside the g1 launcher and ships with seed datasets, challenge prompts, and CSV import support for experimentation.

## Quickstart

```bash
npm install
npm start
```

Then open [http://localhost:3000/apps/relational-algebra-playground](http://localhost:3000/apps/relational-algebra-playground) in your browser. Drag a dataset or operator block into the canvas, or paste a Unicode/ASCII RA expression into the editor and choose **Parse to pipeline**.

Key controls:

- **Step ▶** executes the next node in the pipeline.
- **Run to cursor** executes all nodes up to the selected block (Ctrl + Enter).
- **Run all** executes the entire pipeline (Ctrl + Shift + Enter).
- **Copy SQL/JSON/SVG** exports the active pipeline for sharing.

## Seed datasets

| Name        | Columns                                               | Rows | Notes |
|-------------|--------------------------------------------------------|------|-------|
| `Employee`  | `EmpID` (int), `Name` (string), `DeptID` (int), `Salary` (int) | 12   | Core employee roster with cross-functional salary data. |
| `Department`| `DeptID` (int), `DeptName` (string)                    | 6    | Department lookup table. |
| `Project`   | `ProjID` (int), `DeptID` (int), `Title` (string)       | 9    | Active initiatives per department. |
| `Assignment`| `EmpID` (int), `ProjID` (int)                          | 19   | Employee-to-project assignments, including a fully staffed exemplar for division demos. |

Upload CSV files via the **Import CSV** control in the left sidebar. The importer infers column types (`int`, `float`, `string`) by sampling the file and registers the new relation in the dataset shelf for immediate use. Schema validation ensures row arity and type consistency before adding the relation.

## Operators and SQL mapping

| Relational Algebra | UI label            | SQL translation                                      |
|--------------------|---------------------|------------------------------------------------------|
| `σ` (Selection)    | Selection σ          | `WHERE` clauses with boolean predicates (`AND`, `OR`) |
| `π` (Projection)   | Projection π         | `SELECT DISTINCT` lists with optional aliases        |
| `ρ` (Rename)       | Rename ρ             | `SELECT ... AS ...` inline column aliases            |
| `⋈` (Join)         | Join ⋈               | `INNER JOIN ... ON ...` (equi-joins)                 |
| `∪` (Union)        | Union ∪              | `UNION` (set semantics)                              |
| `∩` (Intersection) | Intersection ∩       | `INTERSECT`                                         |
| `−` (Difference)   | Difference −         | `EXCEPT`                                            |
| `×` (Product)      | Product ×            | `CROSS JOIN`                                        |
| `÷` (Division)     | Division ÷           | Emitted as a comment-wrapped division pattern using correlated subqueries or `NOT EXISTS` expansion |

Each node’s SQL is copied to the clipboard via the **Copy SQL** action in the header and updates live as you tweak predicates or column lists.

## Learning challenges

The right sidebar features five graded challenges covering selections, joins, set operations, and division. Submit a Unicode or ASCII RA expression to compare against the canonical solution—results are checked with set equality and the grader surfaces the first counterexample row when mismatched. Optional hints reveal the next operator or schema target.

## Testing

Unit and integration coverage for the playground lives in `src/apps/RelationalAlgebraPlaygroundApp/__tests__/`. Run the full suite with:

```bash
npm test
```

Key cases ensure operator closure, parser correctness, pipeline-to-SQL parity, and division edge cases.
