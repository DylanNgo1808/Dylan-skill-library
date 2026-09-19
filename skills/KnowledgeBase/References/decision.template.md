---
title: "Decision: {imperative title}"
date: { YYYY-MM-DD }
type: decision
status: active # active | reviewed | superseded | reversed
owner: {owner}
reversibility: # one-way | two-way
review_date: { YYYY-MM-DD, +3 months }
tags:
  - decision
connections:
  related: []
  status: orphan
---

# Decision: {imperative title}

## Context

{Why does this decision exist now? 3-5 sentences.}

## Decision

{One imperative sentence.}

## Why this option

- {3-5 bullets — why THIS and not the alternatives. "Because it's better" is not a reason.}

## Alternatives considered

- **{Option A}** — rejected because {reason}

## Tradeoff accepted

- {What is lost by choosing this. Mandatory — no tradeoff = not a decision.}

## Review — {review_date}

{Filled at review time: did it age well? keep / revise / reverse. Update `status` accordingly.}
