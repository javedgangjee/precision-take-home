---
name: spec-driven
description: Runs a spec-driven development loop in any repo. It writes a constitution once, then plans, implements, validates, and replans each feature. Use it when the user asks to write or update the constitution, plan the next feature, implement or validate a feature, or replan after a merge.
---

# Spec-driven workflow

This skill runs the spec-driven development loop. The user calls it as `/spec-driven <mode> [feature]`. The five modes are listed below in the order they are used.

- The `constitution` mode runs once at the start. It writes specs/mission.md, specs/tech-stack.md, and specs/roadmap.md, and CLAUDE.md if the repo has no agent instructions file.
- The `plan` mode starts each feature. It makes a feature branch and writes plan.md, requirements.md, and validation.md for that feature.
- The `implement` mode runs after the user approves the plan. It writes code and tests on the feature branch.
- The `validate` mode runs after implement. It reports a pass or a fail for each check in validation.md.
- The `replan` mode runs after the user merges a feature. It updates the roadmap, the other constitution files if needed, and the changelog.

If the user gives no mode, look at which files exist in specs/ and at the git state, say which mode comes next, and ask before you start. If specs/roadmap.md does not exist, the next mode is constitution.

## Rules for every mode

1. Read CLAUDE.md or AGENTS.md and the files in specs/ before you do anything else, if they exist. Follow any project rules they state.
2. Treat the files in specs/ as the source of truth for what to build.
3. Stop if the specs do not answer a question the task depends on. Tell the user the gap, and wait.
4. Do not commit. The user reviews, commits, and merges.
5. Run one mode per session. When a mode ends, tell the user to clear the session before the next mode, so each step starts with fresh context.
6. Write every file in plain English with full sentences, including in lists. Do not use em dashes or en dashes. Keep each file short.
7. Ask one question at a time and wait for the answer before you ask the next one.
8. Keep replies short and plain. Do not repeat file contents the user can open, do not restate the user's answers, and do not summarise what you are about to do.

## Mode: constitution

1. Ask the user for the documents that describe the project, such as a brief, a requirements list, or a README. Read each one in full, including any pictures in it. If the repo already has code, read enough of it to learn what the project does and how it is built.
2. Read any files that already exist in specs/. If the constitution files exist, update them and keep what is still true.
3. Ask the user whether you draft the files or write an outline of headings and questions for the user to fill in. If the user picks the outline, do steps 5 to 8 as outlines and skip step 4.
4. Ask the user about each thing the files need that the documents and the code do not answer, one question at a time. The usual gaps are why the project exists and who uses it, the tool and library versions, the test tools, and the order of features.
5. Write specs/mission.md. It says in a few sentences why the project exists, who uses it, and what the system does.
6. Write specs/tech-stack.md. It lists the languages, frameworks, versions, test tools, and where the system runs.
7. Write specs/roadmap.md. It is a numbered list of features. Each feature has a one-sentence goal, the requirements it covers, and a status of planned, in progress, or done.
8. If the repo has neither CLAUDE.md nor AGENTS.md, write a short CLAUDE.md. It points at specs/ and at the project documents, and it says that the user commits and merges.
9. Check that every requirement in the project documents maps to at least one feature. List any that has no feature.
10. Show the files to the user and stop.

## Mode: plan

1. Read the constitution files. Use the feature the user names. If the user names none, use the first feature with status planned, and confirm it with the user.
2. Check that the working tree is clean. If it is not clean, stop and tell the user.
3. Make a branch named `feature/NN-slug` from the default branch, where NN is the two-digit roadmap number.
4. Make the folder specs/features/NN-slug/ and write three files in it.
   - requirements.md lists what this feature must do, with a reference to the requirement in the project documents or the constitution for each item. It then lists anything the feature needs that neither source covers, such as file names. Mark each such item and ask the user about it.
   - plan.md lists the steps in order. Each step names the files it creates or changes.
   - validation.md lists the checks that prove the feature works. Each automated check lists its test cases with input and expected result, and gives the command that runs it. Each manual check gives exact steps and the expected result. Every worked example in the project documents that this feature covers becomes a test case.
5. Set the feature status to in progress in specs/roadmap.md.
6. Show the files to the user and stop. Do not start implement until the user approves the plan.

## Mode: implement

1. Read the feature folder. Ask the user to confirm the plan is approved. If it is not, stop.
2. Do the plan steps in order. Change only the files the plan names.
3. Write the automated tests from validation.md with the cases as listed. Do not add, remove, or change a case without asking.
4. Run the tests and the linters, and fix the failures.
5. Report the steps you did, the test results, and anything that differs from the plan. Then stop.

## Mode: validate

1. Run each automated check in validation.md and record a pass or a fail with a short summary of the output.
2. For each manual check, give the user the exact steps and ask for the result.
3. Check that each item in requirements.md has at least one passing check. List any item that has none.
4. Add a Results section with today's date at the end of validation.md.
5. If every check passes, tell the user the feature is ready for review, commit, and merge. If a check fails, list each failure and tell the user to run implement again or change the plan. Do not commit.

## Mode: replan

1. Check that the feature branch is merged into the default branch. Set the feature status to done in specs/roadmap.md.
2. Run the `changelog` skill for the merged feature. When the user approves the entries, carry on with the next step here.
3. Ask the user what changed during the feature, such as drift from the plan or new findings.
4. Make small changes to the constitution files now. Add large changes to the roadmap as new features.
5. If a change goes against one of the project documents, stop and tell the user. The user decides.
6. Ask the user whether a prompt they repeat should become a skill. Do not make the skill without approval.
7. Show the changes and stop.
