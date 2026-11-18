# @flowclaim/policy-engine

Deterministic Directed Acyclic Graph (DAG) Policy Engine for FlowClaim.

Tagline: *AI reads the mess. Deterministic algorithms make the call.*

## Overview

`@flowclaim/policy-engine` executes corporate compliance policy rules organized as a Directed Acyclic Graph. It uses Kahn's algorithm for topological sorting, detects dependency cycles, computes derived temporal and financial facts, evaluates AST condition trees, and prunes dependent branches when prerequisites fail.

## Features

- **Strict DAG Topology**: Kahn's topological sort with $\mathcal{O}(V + E)$ time complexity.
- **Deterministic Ordering**: Ties between independent rules are broken by `ruleId` ascending.
- **Cycle Detection**: 3-color DFS cycle detector returning the exact circular path.
- **AST Condition Tree**: Pure evaluation of comparison (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`), set (`in`, `notIn`), presence (`exists`), and logical combinators (`all`, `any`, `not`).
- **Pruning & Short-Circuiting**: Dependent rules are automatically marked `SKIPPED` when prerequisites fail.
- **Zero Eval / Zero Dynamic Code**: Fail-closed pure function execution; no I/O, no system clock reads.

## API Reference

```javascript
import {
  validatePolicy,
  topologicalSort,
  detectCycle,
  evaluatePolicy,
} from '@flowclaim/policy-engine';

// 1. Validate policy schema and acyclicity
const validation = validatePolicy(policyDefinition);
if (!validation.ok) {
  console.error(validation.errors);
}

// 2. Evaluate policy against facts
const result = evaluatePolicy({ policy: policyDefinition, facts });
console.log(result.outcome); // 'PASS' | 'REVIEW_REQUIRED' | 'BLOCKED'
```

## Running Tests

```bash
node --test tests/**/*.test.js
```
