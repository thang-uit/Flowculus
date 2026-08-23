# ADR 0001: Keep the canvas behind an adapter boundary

Status: accepted

## Context

Flowculus must eventually exchange files with draw.io while also exposing semantic process metadata and cycle-time analysis. Pointer movement and canvas rendering are performance-sensitive, while formula evaluation should remain independently testable.

## Decision

The web shell owns composition and user-facing panels. A dedicated canvas adapter owns draw.io protocol details. The process model, validation and analysis packages remain pure TypeScript and communicate through serializable data.

The production workspace uses the draw.io embed behind the existing adapter boundary. A small local semantic model is still used as the first analysis result while the iframe is loading or unavailable. Load, autosave, save and export are supported; draw.io does not expose a documented lightweight selection-change event, so selection synchronization remains an explicit follow-up rather than an implicit guess.

## Consequences

- Canvas implementation can change without moving domain formulas into React.
- The first page remains fast and works without an account or server state.
- A later adapter must define selection synchronization and metadata fallback explicitly.
- The fallback model is not a substitute for a successful semantic import; files without `flowculus-*` metadata must be confirmed by the user before exact analysis is trusted.
