# PipelineNews

PipelineNews separates source data, interface modules, immutable compilers, dated releases, architecture reports and build instructions.

## Repository structure

- `data/` — shared data and manifests
- `ui/` — interface source modules, templates, styles and vendor files
- `index/` — immutable dated compilers
- `releases/` — immutable dated release output
- `atman/` — audits and architecture reports
- `build/` — timestamped functional build instructions
- `archive/` — retained historical material

## Current build instructions

- [Companies House functional next steps](build/202608262103-companies-house-functional-next-steps.md)

Build instructions do not authorise deployment. Every deployment requires explicit owner approval.

## V8 build workflows

- [Build V8 foundation](https://github.com/Ventusltd/pipelinenews/actions/workflows/build-v8-foundation.yml)
- [Gate V8 foundation](https://github.com/Ventusltd/pipelinenews/actions/workflows/gate-v8-foundation.yml)
- [Compile V8 with Companies data](https://github.com/Ventusltd/pipelinenews/actions/workflows/compile-v8-with-companies.yml)
- [Annual Companies data refresh](https://github.com/Ventusltd/companies/actions/workflows/annual-companies-house-refresh.yml)

Companies House processing and the stable annual dataset live in [Ventusltd/companies](https://github.com/Ventusltd/companies). PipelineNews consumes only a pinned compact manifest and cartridges. No workflow above authorises deployment.


---

## Cable engines

Ventus is a **cables and connectivity** company, and the clue is in the name. What this estate measures is **cables**: where one starts, where it ends, what route it can take, and what is publicly known about it. Every engine models a cable, and a project's class selects **which question** is asked, never **whether** a question is answered.

| document | what it holds |
| --- | --- |
| [Cable engines](https://github.com/Ventusltd/gridmachine1/blob/main/CABLE-ENGINES.md) | the rule, the priority, and how a project is routed to an engine |
| [Datasheets](https://github.com/Ventusltd/gridmachine1/blob/main/CABLE-ENGINE-DATASHEETS.md) | one contract per engine: question, endpoints, geometry, inputs, outputs, allowed silence |
| [Engineering plan](https://github.com/Ventusltd/gridmachine1/blob/main/ENGINEERING-PLAN.md) | what gets fixed, in what order, and what is protected |
| [Bug register](https://github.com/Ventusltd/gridmachine1/blob/main/BUGS.md) | numbered tickets with links, evidence and status |
| [The capsule](https://github.com/Ventusltd/gridmachine1/blob/main/reports/20260907T230000Z-engine-capsule/README.md) | the working engines sealed with their hashes, and what makes them worth copying |

The five engines: **substation finder within a radius**, **interconnector subsea link**, **offshore export cable to its onshore connection**, **400 kV overhead line and transmission connection**, and **132 kV distribution**. The first and fourth work today and are protected by their own passing receipts.

**This repository decides which engine answers.** The engine category belongs on the row, not in the map: the table shows it, the MAP link carries it, and the receipt asserts it. That makes routing testable before a browser opens, visible to a reader, and unable to disagree with itself. Inferring the engine at arrival is what made offshore projects look silent.
