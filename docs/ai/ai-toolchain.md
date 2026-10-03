# AI Toolchain
## Tools
- **Claude Code** run in terminal in VSCode with **Opus 5.5** as the primary model
- **Claude Design** was used for the first design prototype with my custom design system.
- Github Copilot inline suggestions

## Skills
- Custom  `/spec-driven` skill
- `/changelog`

## Method
The project used a personal take on spec-driven development by JetBrains. This has been used numerous times on personal projects and given the best results. It depends heavily on the author being in charge of every decision.

![Diagram of the spec-driven method, from the context and the constitution through the feature loop to the final review](../assets/spec-driven-method.png)

### Context
The first step is the creation of the constitution based on provided context which included the following:
- **Brief** - The main “Bin There,Done That” PDF
- **Overview** - Jeremy’s email which sets out the requirements
- **System Design** - My rough initial notes about how the system should work
- **Frontend** - Standalone html built in Claude Design project. Assumed design is not the focus of this take home. See project and prompts here:


### Constitution

Constitution includes the main `mission.md`, a `roadmap.md` which determines the features and the order in which they are implemented and details of the stack in `tech-stack.md`.

### Features
From there each feature gets the same treatment - plan, implement, a manual review, validate, then merge it back into main, where I run a replan to make sure I’m on the right track.

The order is as such:
- `/spec-driven constitution` - generate and review the constitution files
For each feature:
- `/spec-driven plan`
- `/spec-driven implement`
- Review stage - done manually for take home
- `/spec-driven validate`
- Merge into main
- `/spec-driven replan`
- Repeat steps 2 - 7 till done all features
- Review, cleanup

### Documentation
The `docs` folder contains 3 items of interest:
- `docs/specs/` is the source of truth for what to build. The `features/` folder has one folder per feature, and each one holds `requirements.md`, `plan.md`, and `validation.md`.
- `docs/ai/` shows how I used AI on the project. `ai-changes.md` records how I changed the AI output and why.
  - `docs/ai/logs/` holds the Claude Code session transcript for each spec-driven step, with one folder per feature.
  - `docs/ai/skill/` holds a copy of the custom spec-driven skill.
- `docs/bonus/` holds my answers to the bonus questions. `3d.md` covers the 3D case and `server_side_rendering.md` covers server side rendering.
