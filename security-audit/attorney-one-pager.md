# PatternProof — Security Overview for Attorneys

*Plain-language summary. Prepared following an independent source-code security review, [DATE]. Full technical findings available on request.*

## How client data is separated

Every survivor's incidents, evidence, and case notes live behind row-level access control in our database — a survivor's records are invisible to every other account, including other attorneys, by default. You only see a client's file after they explicitly invite you (or you invite them) and they accept — and that access is scoped, auditable, and revocable by them at any time. If a client revokes your access, your ability to read new data stops immediately; message history remains visible for continuity of representation.

## What you can and can't see from other clients or other firms

- You cannot see another attorney's clients, notes, or billing unless that attorney explicitly grants you access (firm colleague sharing) or you're an invited case collaborator.
- Your private case notes and strategy memos on a client are never visible to that client or to any other attorney.
- Messages between you and your client are readable only by the two of you; read receipts only mark messages read, they cannot alter message content.

## Billing and time records

Time entries you log are tied to the specific client-attorney relationship (case link) they were created under. We identified and are addressing a database-level gap that could, in a low-likelihood scenario, allow a fabricated time entry to be inserted against a case link an attorney doesn't own; this does not expose any client data, and we are closing it as part of ongoing hardening. Exported court packets and Clio-prep packages pull time and billing data strictly from your active case link — you will never see another attorney's billing mixed into your export.

## Court packet exports

Every evidence file included in an export is SHA-256 hashed, and a chain-of-custody manifest is generated alongside the ZIP, so you and the court can independently verify no file was altered after export.

## Clio integration

Clio Manage sync is **not live**. The connection page exists so we could register a redirect URL with Clio during the approval process, but no authorization tokens are exchanged or stored today. "Prepare for Clio" packages are generated locally as importable CSV/ZIP bundles — no data leaves PatternProof's systems as part of that feature.

## What we're actively hardening

An independent review (this document's basis) identified several areas we are addressing directly, in priority order:
1. Auto-lock timing on the survivor-facing app (a stated safety setting that wasn't yet fully wired up)
2. Hardening the "quick exit" panic button against browser back-button recovery
3. Strengthening the local PIN-lock cryptography
4. Adding activity notifications to an older, token-based sharing link so survivors know if it's ever opened
5. Closing the billing-record RLS gap described above
6. Correcting a "tamper-evident" audit-log claim so it accurately reflects what the database enforces, versus what's self-reported

None of these affect the core RLS-based data isolation between clients, firms, or accounts described above — that layer was independently verified as sound.

## Questions

Security contact: [SECURITY CONTACT EMAIL] — we acknowledge reports within 48 hours and provide a remediation timeline within 5 business days for anything reported.
