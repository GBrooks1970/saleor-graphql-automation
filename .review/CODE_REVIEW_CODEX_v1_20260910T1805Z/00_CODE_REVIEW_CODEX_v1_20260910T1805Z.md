# Code Review: Saleor GraphQL Automation

**Reviewer:** AI assistant (Codex GPT-5)  
**Date:** 2026-09-10T18:05Z  
**Scope:** Full merged codebase at `d76e094` (63 tracked files; 37 TypeScript files; 2,932 TypeScript lines)

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Review](03_PROJECT_REVIEWS/PROJECT_001_SALEOR_GRAPHQL_AUTOMATION.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

## Structure Summary

This review treats the repository as one project. It separates verified risks, the project-level assessment, cross-cutting concerns, prioritised recommendations, architecture analysis, and practical migration plans.

## Key Findings

- **HIGH - R-01:** The smoke-safety guard drops inherited feature tags and validates tag combinations rather than mutation behaviour, so its zero-side-effect guarantee is not established.
- **HIGH - R-02:** Live schema drift is absent from `npm run verify`; the dormant checker also fails against the pinned SUT and falls back to self-comparison when an explicit endpoint is unreachable.
- **MEDIUM - R-03:** Valkey uses a mutable tag despite repeated claims that every SUT image is digest-pinned.
- **MEDIUM - R-04:** API, PostgreSQL, and Valkey ports bind to all host interfaces while local fixture credentials and a static application secret are committed.
- **MEDIUM - R-05:** The design document presents planned MFA, multi-line checkout, staff fulfilment, latency alerts, and a 30-second cold boot as current capabilities.

## Navigation Guide

Start with the [Executive Summary](01_EXECUTIVE_SUMMARY.md), then use [Risks and Issues](02_RISKS_AND_ISSUES.md) for evidence and remediation. The remaining files explain architectural context and provide an implementation order without changing the reviewed code.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
