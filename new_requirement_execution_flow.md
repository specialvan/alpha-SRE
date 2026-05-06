# New Requirement Execution Flow

1. Propose the requirement.
Artifact: initial requirement statement or ticket.

2. Assign a decision owner.
Artifact: `new_requirement_intake_template.md` entry with owner.

3. Classify the requirement into a layer and confirm the operational boundary.
Artifact: explicit `baseline` / `increment` / `experimental` / `archive` decision with scope boundaries.

4. Define non-goals, compatibility impact, and affected metrics.
Artifact: completed `new_requirement_intake_template.md`.

5. Identify affected docs, contracts, rollback trigger, and rollback path.
Artifact: `task_launch_template.md` or equivalent task record.

6. Implement the smallest safe change.
Artifact: reviewed code or document change set.

7. Test the changed capability.
Artifact: unit, integration, regression, or acceptance evidence as required by `test_governance.md`.

8. Record evidence, rollback validation, and uncovered gaps.
Artifact: evidence links, artifact locations, and rollback notes.

9. Update the relevant specifications, indexes, and supporting docs.
Artifact: synchronized governance/spec/index documents.

10. Choose the task exit path: complete, continue iterating, or archive.
Artifact: explicit status update with next scope or retirement reason.
