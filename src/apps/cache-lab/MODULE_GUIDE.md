# Module Guide

This guide summarises how each Cache Learning Lab module reinforces cache concepts and references useful reading material.

## Mapping Explorer
- **Goal:** Connect physical/virtual addresses to cache structures by decomposing tag/index/offset bits.
- **How to use:** Enter addresses (decimal or hex) and step through the highlighted table to see hits vs misses.
- **Reference:** Hennessy & Patterson, *Computer Architecture*, Chapter on memory hierarchy (sections on direct-mapped caches).

## Replacement Simulator
- **Goal:** Compare the behavioural differences between LRU, FIFO, and Random policies.
- **How to use:** Load a trace (built-in or custom) and observe hit/miss counts per policy. Random is seeded with 42 for repeatability.
- **Reference:** [CMU 15-213 Cache Lab writeup](http://csapp.cs.cmu.edu/), section on replacement policies.

## Parameter Playground
- **Goal:** Understand how block size, associativity, and total capacity affect miss ratio.
- **How to use:** Run the block-size sweep, observe the chart, and export data for deeper study. Combine with the Experiment panel for extended sweeps.
- **Reference:** "Three Cs" model from Mark D. Hill, *What is Latency Tolerance?* (1996).

## Locality Visualizer
- **Goal:** Internalise spatial/temporal locality using canonical traces and a mini DSL (`seq`, `stride`, `random`).
- **How to use:** Toggle built-in traces, adjust the DSL, and watch miss-ratio bars react in real time.
- **Reference:** Denning, *The Locality Principle* (Communications of the ACM, 2005).

## Miss Classifier
- **Goal:** Explain compulsory, conflict, and capacity misses via the three-run method.
- **How to use:** Examine the table of misses, hover (or focus) each row to review the classification rule.
- **Reference:** Mattson et al., *Evaluation Techniques for Storage Hierarchies* (IBM Systems Journal, 1970).

## Hierarchy Explorer
- **Goal:** See how multi-level caches and memory latency affect AMAT.
- **How to use:** Adjust L1/L2/L3 capacities and latencies, compare AMAT with and without deeper levels.
- **Reference:** Hennessy & Patterson, *Memory Hierarchy Design*, AMAT equation derivation.

## Pipeline Impact
- **Goal:** Translate cache miss rates into pipeline CPI penalties.
- **How to use:** Enter CPI base, miss penalty, and memory references per instruction. Link from the hierarchy to reuse AMAT as miss penalty.
- **Reference:** Hennessy & Patterson, *Quantitative Design and Analysis*, CPI accounting.

## Trace Loader
- **Goal:** Bring in external traces (CSV) and reuse them across modules.
- **How to use:** Upload CSVs or load bundled samples; errors are surfaced inline.
- **Reference:** Format inspired by the CS:APP Cache Lab trace schema.

## Learn / Experiment / Assess / Dashboard
- **Learn:** Step-by-step path through modules with contextual tips.
- **Experiment:** Quick stride sweeps to observe locality pressure.
- **Assess:** Deterministic quizzes covering mapping, miss classification, and hit prediction. Progress stored locally.
- **Dashboard:** Aggregated metrics, block-size sweep chart, per-set occupancy, and hierarchy hit rates for executive summaries.
