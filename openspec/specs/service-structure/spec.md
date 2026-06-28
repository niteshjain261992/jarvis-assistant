# service-structure Specification

## Purpose

Define binding conventions for modular application services: orchestrator pattern, branch handlers, centralized error recovery, and shared context objects so multi-step workflows stay readable and maintainable.

## Requirements

### Requirement: Service orchestrator pattern

Application services that coordinate multi-step workflows SHALL expose a small public entry function that orchestrates private step functions. The orchestrator SHALL delegate branch-specific logic to dedicated private handlers rather than inlining all paths in one function.

#### Scenario: Orchestrator delegates to branch handlers

- **WHEN** a service routes work by category (e.g. intent type)
- **THEN** each category is handled by a separate private function invoked from the orchestrator

#### Scenario: Orchestrator size bound

- **WHEN** a service entry function grows beyond ~50 lines
- **THEN** step extraction into private functions is required before adding new behavior

### Requirement: Centralized error recovery

Services with shared failure recovery (logging, persistence cleanup, re-throw) SHALL implement recovery in one private helper rather than duplicating try/catch blocks across branch handlers.

#### Scenario: Single recovery path for thrown failures

- **WHEN** multiple branches share the same failure recovery semantics
- **THEN** a single wrapper or helper performs logging, cleanup, and re-throw

#### Scenario: Branch-specific non-throwing failures

- **WHEN** a branch returns a failed result without throwing (expected business failure)
- **THEN** it MAY handle logging inline and is not required to use the thrown-error recovery wrapper

### Requirement: Shared context object for multi-step pipelines

Multi-step service workflows SHALL pass a typed context object (IDs, entities, request input) to step and branch functions instead of long positional parameter lists.

#### Scenario: Context carries correlation fields

- **WHEN** a pipeline spans multiple repository calls and logging checkpoints
- **THEN** correlation identifiers (e.g. `conversationId`, message IDs) travel in a shared context type

### Requirement: Private by default

Internal workflow steps and branch handlers SHALL remain private (unexported) unless a spec explicitly requires a public API. Tests SHALL validate behavior through the public entry point unless testing a shared utility in `src/utils/`.

#### Scenario: Branch handlers not exported

- **WHEN** intent branch logic is extracted from an orchestrator
- **THEN** branch handler functions are not exported from the module
