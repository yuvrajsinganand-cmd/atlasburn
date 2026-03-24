# AtlasBurn Architecture

## Overview

AtlasBurn is a runtime cost protection layer for AI systems.

It sits between:
- AI applications (agents, workflows, APIs)
- LLM providers (OpenAI, Anthropic, etc.)

and provides:
- real-time cost tracking
- anomaly detection
- automated guardrails

---

## Core Principle

> Cost is not a number. It is a distribution.

AtlasBurn models AI spend as a stochastic system rather than static usage.

---

## System Components

### 1. SDK Layer (Client-side)

- Captures:
  - token usage
  - request metadata
  - latency
  - cost attribution
- Sends structured events to backend

Located in:
/src/lib/sdk

---

### 2. Ingestion Layer

- Receives telemetry from SDK
- Validates and normalizes data
- Handles retries and failures

Key responsibilities:
- fault tolerance
- rate limiting
- batching

---

### 3. Cost Engine (Core Brain)

This is the core of AtlasBurn.

Implements:
- Monte Carlo simulations
- log-normal cost modeling
- burn distribution analysis

Outputs:
- P50 (expected burn)
- P95 (risk scenario)
- tail-risk projections

Purpose:
> Detect when cost behavior deviates from normal patterns before it becomes visible.

---

### 4. Detection Engine

Detects:
- retry cascades
- agent loops
- abnormal token spikes
- cost acceleration patterns

Techniques:
- threshold detection
- probabilistic modeling
- pattern recognition

---

### 5. Guardrail System

Executes actions:

- Kill runaway agents
- Throttle requests
- Cap usage
- Alert system

Design goal:
> Prevent cost explosions in real-time.

---

### 6. Data Layer

- Firestore (current)
- Stores:
  - usage logs
  - aggregated metrics
  - anomaly signals

Future:
- Time-series DB (for scale)
- Streaming pipelines

---

### 7. Frontend / Dashboard

- Displays:
  - real-time spend
  - cost distributions
  - anomaly alerts

Built with:
- Next.js
- Tailwind

---

## Data Flow
AI App → SDK → Ingestion → Cost Engine → Detection → Guardrails → Dashboard

---

## Design Philosophy

AtlasBurn is built on:

- Real-time > batch analysis
- Prevention > reporting
- Signal > noise
- Minimalism > over-engineering

---

## Current Limitations

- Early-stage simulation accuracy
- Limited provider integrations
- Single-region deployment

---

## Future Direction

- Multi-provider routing
- Autonomous cost optimization engine
- Predictive budgeting
- Enterprise-grade infra

---

## Final Note

AtlasBurn is not an analytics tool.

It is a control system.
