# Build Status
## Done
- Repo on GitHub (candiceeey/RentKa), Expo app builds and installs on phone as RentKa.
- Firebase project, Auth, Firestore, Storage, Android app configured; test screen reads/writes Firestore.
- rentka-core with 49 passing tests (matching updated: hard filters, generic labels, fallbacks, ranking; autofill chips and accuracy).
- backend/: Firebase config, Firestore and Storage rules from the spec, emulator config, Functions TypeScript scaffold (no functions yet), 17 passing rules tests.
- Real Firestore and Storage rules deployed to `rentka` on 2026-10-09 (temporary connectionTest rule removed). Functions not deployed.
- sync-core.bat copies rentka-core/src into frontend/src/core and backend/functions/src/core. rentka-core now has 55 passing tests, rules tests 18.
- App foundation: email/password register and login, users profile write (sign-up fields only), lender/borrower switch, tabs (Home, Rentals, Profile), theme. Type-checks and bundles; NOT yet tried on a phone.
- Built screens restyled to docs/prototype (green/cream theme, Inter, shared components). Logo is a placeholder until the image file is added. Type-checks and bundles; NOT yet tried on a phone.
- 2026-10-10: roles chosen at sign-up (Lender / Borrower / Both, add the other later), per-role trust scores, ID step (form -> check -> verified or rejected), tabs per role, Forgot Password, Terms checkbox. rentka-core 69 tests, rules tests 26.
- 2026-10-10: new rules and the `verifyIdentity` function deployed to `rentka` (Singapore, max 2 instances, secret `ID_HMAC_SECRET` in Secret Manager). The function answers; the signed-in path is NOT yet tested on a phone.
- 2026-10-14: `verifyIdentity` changed and redeployed: the phone runs the ID checks and sends only a SHA-256 hash of the ID type and number plus pass/fail results. rentka-core 76 tests. Hashes stored before this change use the old format and no longer block duplicates (test data only).
## Next
1. Phone test: registration as Lender, Borrower and Both; ID step outcomes; adding a role.
2. Listing flow (lender): photo first, editable auto-fill, unique attribute.
3. Request flow (borrower) and matching (`onItemCreate`, `onRequestCreate`).
4. Rentals (`rentalAction`): deposit proof, handoff, extension, return, settlement, per-role ratings, chat thread.
   - Handoff check: show the other party's verified name, with an "ID didn't match" cancel action.
5. ML Kit native module: photo labels and text for auto-fill, ID scan that pre-fills the ID form.
6. Liveness check (built together with step 5, after steps 2 to 4 work): ML Kit Face Detection on the device asks for one or two random actions (blink, turn head left or right). No images or face data are saved or uploaded; only pass/fail goes into the `verifyIdentity` call. ID step order becomes form (or scan) -> liveness -> result, and without a passed check the result cannot be "verified". Until then the current flow stays and registration is not blocked. The switch is `LIVENESS_REQUIRED` in `rentka-core/src/identity.ts` (off).
   - Decide then: turn on Firebase App Check (Play Integrity) so `verifyIdentity` accepts calls only from the genuine app.
7. Last: Message Owner before a request, notifications, Get Started 1 to 3, real logo file.
8. Release APK, seed demo data.
