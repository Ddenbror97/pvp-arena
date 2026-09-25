# Security warnings: verify each one and write a categorized report

## Goal
Check every open security warning one at a time, whatever its level, using the live database rules. Then deliver a report that sorts each warning into one of four groups:

1. **Intentional public access**: data that is meant to be visible to everyone, for example live game rounds or fairness data.
2. **Intentional server-only write restriction**: players can't write the data directly, and only the server's money functions can change it.
3. **False positive / test-only**: the scanner reasoning doesn't match how the rule actually works, or the warning only affects the test copy of the database.
4. **Actually needs fixing**: a real gap, with how serious it is and the proposed fix.

This pass only audits. Nothing is fixed, dismissed or switched without your approval, and no money state changes.

## Steps
1. **Collect everything:** pull every open finding from the security scan, including the debug and info levels. Also pull every database linter warning (about 43 today), including the 23 notes about who can run the built-in money functions.
2. **Verify each one against the real rules.** For each warning, check:
   - who can read it, and which columns
   - who can write it: add, change, delete or wipe
   - which access rules apply
   - whether it holds money or personal data
3. **Check the function warnings closely.** For each of the 23 functions flagged as runnable by visitors or signed-in players:
   - confirm it checks who is calling
   - confirm it can't move money for someone else
   - confirm it can't skip the real-play, deposit or withdrawal switches
   - confirm it rejects bad input
   Any function that fails a check goes into group 4.
4. **Check the "no access rule" notes.** For each table, confirm it's truly locked to players. "No rule" must mean "nobody gets in", not "the rule is missing".
5. **Write the report:** one line per warning with its group, the evidence (what was checked and what came back) and a one-sentence reason. Group 4 items also get a severity and a proposed fix.
6. **Stop and hand it to you.** Fixes in group 4 and dismissals in groups 1–3 happen only after you approve them.

## Deliverable
A report in your files (Markdown), plus a short summary in chat with the count for each group and every item that needs fixing.

## Note on the uploaded audit spec
The uploaded spec says not to credit the $2 and $4.50 deposits and not to turn on automatic crediting. Both have already happened with your approval in earlier steps. This audit leaves the current state exactly as it is and doesn't reverse anything. The full adversarial audit in the spec can be a separate next pass if you want it.

## Technical details
- Sources: the security scan results (all findings, including debug), the database linter, and live catalog reads for grants and policies on every public table.
- Functions: read each flagged function's grants and source. Confirm it checks the caller, that the caller matches the user it acts on, that the server-side switches are checked inside the function, and that the input is validated.
- Tables with no policy: confirm that browser roles have no table-level grants beyond the intended column-limited reads.
- Changes: none in this pass, read-only.
