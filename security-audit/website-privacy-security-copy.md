# Website copy — Privacy & Security section

*Drop-in copy for a /privacy or /security page. Written to be accurate to the current implementation — nothing here overclaims.*

---

## Your privacy and security

PatternProof was built for people documenting abuse — often while the person they're documenting is the same person who might see their phone. Every design decision starts there.

**Your records are private by default.** Nothing you log — incidents, evidence, voice notes, communications — is visible to anyone unless you explicitly choose to share it. Not other users. Not other survivors. Not an attorney, until you invite one and they accept.

**Sharing is scoped and revocable.** When you invite an attorney, you choose what they can see — everything, or specific incidents and evidence you select. You can revoke access at any time; once revoked, they lose the ability to see anything new.

**Data is encrypted in transit and protected at rest.** All traffic between your device and our servers is encrypted (TLS). Your data is stored in access-controlled infrastructure that no other user's account can reach.

**We hide the app in plain sight.** PatternProof can disguise itself as an everyday app — a planner, a recipe box, a reading list — and includes a quick-exit shortcut to leave instantly if someone walks in. We're actively strengthening this feature based on an independent security review (see below).

**You can lock the app locally.** A PIN or your device's fingerprint/Face ID keeps the app closed even if your phone is unlocked. We're upgrading the underlying PIN storage to be more resistant to anyone examining the device directly.

**You can export everything, any time.** A full backup — every incident, every file, a chronological narrative, and integrity hashes for every document — is available as a downloadable ZIP whenever you want it, for your own records or to hand to an attorney.

**Independent security review.** We commissioned a source-level security audit covering database access controls, attorney-client data separation, our physical-device-safety features, and our own marketing claims. It's ongoing work, not a one-time checkbox — see our [Security page / SECURITY.md] for our vulnerability disclosure process and remediation timelines.

**Reporting a concern.** If you find a security issue, email [SECURITY CONTACT] with the subject line `[SECURITY]`. We acknowledge every report within 48 hours.

---

### Notes for whoever owns this copy (not for publication)

- Do **not** use the phrase "end-to-end encrypted" anywhere on the site. The current architecture is TLS-in-transit + access-controlled storage, which is a legitimate and defensible claim — but it is not end-to-end encryption (the backend can read plaintext, which is how the attorney-portal feature works at all). The live login page currently says this and should be corrected — see audit finding #9.
- Avoid calling the audit log "tamper-evident" in external copy until the RLS UPDATE/DELETE restriction (finding #6) is actually applied — right now the account owner's own client can rewrite their own history, which undercuts that specific word.
- "Quick exit" and PIN-lock copy above describes the *intent* accurately; the audit found real implementation gaps (auto-lock not wired, back-button history not cleared, PIN hash weakly derived) — the phrasing above says "we're actively strengthening" rather than claiming these are already airtight, on purpose. Update this note once the fixes ship, and only then can the copy be stated as unconditional fact.
