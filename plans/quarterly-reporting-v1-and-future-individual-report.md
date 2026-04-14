# Plan: Quarterly Reporting v1 and Future Individual Quarterly Report

> Source PRD: GitHub issue #8

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Keep quarterly reporting inside the existing dashboard reports route rather than creating a separate page. The current reports experience remains the entry point for both monthly and quarterly reporting.
- **Schema**: Quarterly portfolio reporting v1 uses the existing schema and derives reporting anchors from completed monthly jobs and stored snapshots. No new official-lock or versioning schema is introduced in this plan.
- **Key models**: `Account`, `Snapshot`, `ScrapingJob`, `Category`, and current platform enums remain the core reporting models. Quarterly reporting is derived from `ScrapingJob.completedAt` and related `Snapshot` data.
- **Auth**: Reuse the current authenticated server-action model and existing protected dashboard behavior. No auth model change is required.
- **Third-party boundaries**: Portfolio quarterly reporting remains deterministic and uses only database-backed snapshot data. The worker stays a PDF-rendering boundary. Future individual content reporting uses ScrapeCreators as the live content boundary and OpenAI only for an optional, clearly separated AI-assisted note.
- **Reporting principle**: Portfolio reports are objective, government-facing PDF outputs. The in-app experience is a review-and-export tool, not the final product itself.
- **Category semantics**: Categories are stable reporting groups, may overlap, and must not be treated as additive ownership buckets. Scraping deduplication stays account-level even when category-based views overlap.

---

## Phase 1: Quarterly Mode Shell

**User stories**: 1, 2, 3, 4, 5, 44

### What to build

Add a native quarterly mode to the existing reports experience. Operators can switch between monthly and quarterly, see quarterly-specific labels and controls, and explicitly trigger review generation without regressing the current monthly workflow.

### Acceptance criteria

- [ ] The reports experience exposes a top-level `Monthly | Quarterly` mode switch.
- [ ] Monthly mode continues to work as it does today without behavioral regression.
- [ ] Quarterly mode exposes quarter-oriented controls and keeps the explicit `View Report` interaction.
- [ ] Headers and report copy become mode-aware instead of remaining hardcoded to monthly language.
- [ ] Tests cover mode-switch behavior and protection against monthly regression.

---

## Phase 2: Quarter Derivation and Availability

**User stories**: 6, 8, 9, 10, 11, 12, 13, 42, 43

### What to build

Implement quarterly derivation on top of existing completed jobs. Operators can select available quarters, see why unavailable quarters are disabled, and review a top-level status summary showing source months, baseline, quarter-end coverage, and full-quarter coverage before export.

### Acceptance criteria

- [ ] Quarterly mode derives the quarter-end anchor and previous-quarter baseline from existing completed jobs.
- [ ] Quarter availability is primarily determined by the presence of a usable quarter-end job.
- [ ] Missing internal months surface warnings instead of blocking review.
- [ ] Missing previous-quarter baseline degrades gracefully instead of failing the flow.
- [ ] Quarterly review shows source months, baseline, quarter-end coverage, and full-quarter coverage.
- [ ] Tests cover quarter availability, degradation behavior, and coverage rules.

---

## Phase 3: Quarterly Platform Preview

**User stories**: 15, 25, 26, 27, 28, 29, 30, 31, 32, 33

### What to build

Deliver a quarterly in-app review flow for one platform at a time. After quarter derivation succeeds, the operator can review platform summary metrics, issue classification, rankings, and detailed account-level evidence using the same platform-first interaction model as the current reports page.

### Acceptance criteria

- [ ] Quarterly preview supports platform-specific summary and detailed account review.
- [ ] Performance issues and data-quality issues use the agreed objective rules.
- [ ] Rankings exclude accounts missing quarter-end data and degrade correctly when internal months are missing.
- [ ] Each platform view presents a compact summary before detailed account rows.
- [ ] Tests cover ranking eligibility, issue classification, and preview data shaping.

---

## Phase 4: Executive Quarterly PDF Export

**User stories**: 16, 17, 18, 19, 20, 21, 22, 23, 24, 45, 46, 47, 48, 50, 51

### What to build

Add a quarterly PDF export path to the existing export system. The quarterly PDF should support combined all-platform export and per-platform export, include an executive summary page, and remain separate from the existing monthly template while reusing the same overall export architecture.

### Acceptance criteria

- [ ] Quarterly export supports a combined all-platform PDF.
- [ ] Quarterly export supports per-platform PDF variants.
- [ ] The quarterly PDF uses a dedicated template and does not regress monthly PDF behavior.
- [ ] The quarterly PDF includes executive summary content, coverage visibility, and platform follow-on sections.
- [ ] Tests cover quarterly export payload shaping and template-level smoke behavior.

---

## Phase 5: Category-Aware Quarterly Reporting

**User stories**: 34, 35, 36, 37, 38, 39, 40, 41

### What to build

Extend quarterly reporting so category-filtered views match the product’s reporting-group semantics. Quarterly category reporting should support overlapping membership, shared-account marking, unique-account overall totals, non-additive category totals, and category methodology notes tied to current membership behavior.

### Acceptance criteria

- [ ] Quarterly reporting supports category filtering without breaking all-account quarterly review and export.
- [ ] Shared accounts can appear in multiple category-based views and are marked where appropriate.
- [ ] All-account totals remain unique-account based and category totals are not presented as additive rollups.
- [ ] Category comparisons evaluate a category against its own prior quarter.
- [ ] Category-filtered quarterly output includes the agreed methodology note about current membership.
- [ ] Tests cover overlap handling, unique-account totals, and category comparison behavior.

---

## Phase 6: Future Individual Quarterly Report Foundation

**User stories**: 52, 53, 54, 60, 61, 66

### What to build

Create the foundation for a future individual quarterly content report as a separate manual workflow. This phase defines the one-account, one-platform, one-quarter execution model, starts the report with the official snapshot-based quarterly summary, and introduces visible credit estimation before execution.

### Acceptance criteria

- [ ] The future individual report is a separate workflow from portfolio quarterly reporting.
- [ ] The workflow supports one account, one platform, and one quarter at a time.
- [ ] The run flow exposes estimated ScrapeCreators credit usage before execution.
- [ ] The objective report skeleton begins with official snapshot-based quarterly summary.
- [ ] Tests cover future workflow rules and credit-estimation input shaping where practical.

---

## Phase 7: Future Individual Reconstruction and Enrichment

**User stories**: 55, 56, 57, 58, 59

### What to build

Implement quarter reconstruction and selective enrichment for the future individual report. The workflow reconstructs quarter coverage from listing endpoints where possible, automatically selects a deeper enriched subset by objective rule, and clearly distinguishes reconstructed coverage from deeply inspected content in the report output.

### Acceptance criteria

- [ ] Quarter reconstruction uses listing coverage for one account, one platform, and one quarter.
- [ ] Detailed enrichment applies only to a selected subset of content by default.
- [ ] The enriched subset is chosen automatically using top engagement plus quarter representation.
- [ ] Final report output clearly distinguishes quarter reconstruction coverage from enriched content inspection.
- [ ] Tests cover reconstruction coverage, enrichment selection, and output shaping.

---

## Phase 8: Future Optional AI-Assisted Note

**User stories**: 62, 63, 64, 65

### What to build

Add an optional AI-assisted analytical note to the future individual report. The AI layer remains clearly separated from the objective report body, uses structured summary input rather than uncontrolled raw content, and includes explicit AI-assistance methodology language.

### Acceptance criteria

- [ ] AI-assisted analysis is optional and appears in a clearly separated section.
- [ ] AI input is produced from a structured summary prepared by the app.
- [ ] The report includes explicit AI-assistance footnote or methodology language.
- [ ] Objective report sections remain complete and usable without AI.
- [ ] Tests cover AI input shaping and inclusion/exclusion behavior.
