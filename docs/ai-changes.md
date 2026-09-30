# AI changes

Each entry gives the date, the phase, what the AI produced, what I changed, and why.

## 2026-09-29, constitution

- The AI drafted a roadmap with a final write-up feature. I removed it. The README, this log, and the other logs now update during every feature, so the documents stay current with the code.
- The AI listed the admin page before the hotspot distribution in the stretch goals. I swapped the order.
- The AI offered to put the bonus write-ups for 3D and server-side rendering in the roadmap. I kept them out, because I write them myself.

## 2026-09-29, plan for feature 1, scaffold

- The AI proposed plain CSS for the frontend. I changed it to SCSS.
- The AI proposed Makefile targets with no way to run both apps at once and no way to remove the stack. I added a `dev` target that runs the backend and the frontend together, and a `destroy` target next to `deploy`.
- The AI proposed backend coverage with pytest-cov, which was not in the tech stack. I approved it and added pytest-cov 7.1.0 to specs/tech-stack.md.

## 2026-09-29, implement feature 1, scaffold

- The AI found that npm installed Angular 21.2.24 instead of the 21.2.1 in the tech stack, and it offered to pin 21.2.1. I kept 21.2.24 and had the AI update specs/tech-stack.md.
