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
