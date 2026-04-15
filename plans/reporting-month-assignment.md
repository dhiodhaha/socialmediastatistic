# Plan: Reporting Month Assignment

> Source PRD: #28 - reporting month assignment for monthly and quarterly anchors

## Architectural decisions

Durable decisions that apply across all phases:

- **Schema**: `ScrapingJob` keeps actual job timing fields and gains explicit reporting-period assignment fields on the completed job record. Actual completion date remains operational truth.
- **Reporting precedence**: assigned reporting month/year wins for reporting. Completion-date inference is fallback only.
- **Assignment rules**: only completed jobs are assignable; assignment is restricted to the same month or previous month; one job maps to at most one reporting month and one reporting month maps to one official job.
- **UI surface**: assignment is managed from operator/admin job history surfaces, not from exported reports.
- **Reporting scope**: monthly and quarterly reporting both consume the same reporting-period resolution service so they stay consistent.
- **Audit boundary**: manual overrides require a short reason and source labels are visible in report review/export metadata, while full reasons stay in operator/admin context.

---

## Phase 1: Reporting Month Assignment Foundation

**User stories**: 1, 2, 7, 8, 9, 10, 11, 12, 13, 14, 18

### What to build

Add explicit reporting-month assignment to completed jobs and provide the first operator workflow to set or change that assignment. This slice should include the data shape, validation rules, one-to-one reassignment behavior, and an operator-facing surface to apply overrides with a required reason.

### Acceptance criteria

- [ ] Completed jobs can be assigned to an explicit reporting month and year while preserving their real completion date.
- [ ] Assignment is validated to the same month or previous month only, and only completed jobs can be assigned.
- [ ] Reassigning a month automatically clears the prior job for that month and clears the job's previous assignment.
- [ ] Manual override requires a short reason and stores it for operator/admin use.
- [ ] Operator/admin UI shows current reporting assignment state for completed jobs.

---

## Phase 2: Monthly Reporting Resolution

**User stories**: 3, 5, 6, 15, 17

### What to build

Switch monthly reporting to resolve snapshots through assigned reporting months first, with conservative completion-date inference only when no assignment exists. Show whether the monthly report basis is manual or inferred so operators can verify the source of the report.

### Acceptance criteria

- [ ] Monthly report selection prefers assigned reporting month over completion-date inference.
- [ ] No automatic cross-month guessing is introduced.
- [ ] Monthly review state clearly labels whether the source month was manually assigned or inferred.
- [ ] Existing monthly reporting behavior remains unchanged when no assignment exists.

---

## Phase 3: Quarterly Reporting Resolution

**User stories**: 4, 5, 6, 15, 17

### What to build

Update quarterly option derivation, status, and preview/export data assembly to use assigned reporting months first and inference second. Preserve the existing quarterly mode while making source-month resolution explicit and consistent with monthly reporting.

### Acceptance criteria

- [ ] Quarterly month anchors prefer assigned reporting months over completion-date inference.
- [ ] Quarterly availability and baseline logic continue to work with mixed manual and inferred months.
- [ ] Quarterly review state shows the source for each month as manual or inferred.
- [ ] Quarterly reporting remains deterministic and conservative when no assignment exists.

---

## Phase 4: Reporting Metadata and Export Consistency

**User stories**: 15, 16, 17

### What to build

Carry reporting-source metadata through review and export so operators and readers can see whether months were manually assigned or inferred, without leaking operator-only override reasons into PDFs. This slice closes the consistency gap between in-app review and exported reports.

### Acceptance criteria

- [ ] Monthly and quarterly review surfaces expose source labels consistently.
- [ ] Export payloads include manual vs inferred source metadata where appropriate.
- [ ] PDFs show concise source labeling without including internal override reasons.
- [ ] Operator/admin surfaces retain access to full manual override reasons.

