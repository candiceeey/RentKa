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
- 2026-10-14, registration stage 1 (no native code): "Sign up as" dropdown, button "Register your Account", Terms only at registration and on Complete your profile, email verification link sent after registering and required before the ID step (also enforced by `verifyIdentity`, redeployed), ID step = ID type dropdown -> your ID details (ID number, name, address, sex, birthdate; manual entry) -> review -> result -> sign out to Login. rentka-core 80 tests, rules tests 26. NOT yet tried on a phone.
## Next
1. Phone test of stage 1: register -> email link -> ID details -> result -> login; as Lender, Borrower and Both; adding a role.
2. Registration stage 2, one native rebuild:
   - Firebase console: enable Google sign-in; add the debug SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; download the new google-services.json into frontend/.
   - "Continue with Google" on Login and Register (`@react-native-google-signin/google-signin`), then Complete your profile.
   - Own Kotlin Expo module `frontend/modules/rentka-mlkit` with bundled models: text recognition, face detection, image labeling.
   - ID scan (camera -> text recognition -> `parseId` pre-fills the form; photo deleted at once).
   - Face check with motion: ML Kit face detection on a short series of camera stills, one or two random actions (blink, turn head left or right). No images or face data are saved or uploaded; only `livenessPassed` goes into `verifyIdentity`. Turn on `LIVENESS_REQUIRED` (core + function redeploy) after the phone test passes; without a passed check the result cannot be "verified".
   - Rebuild: `npx expo prebuild --clean` then `npx expo run:android` with the phone plugged in.
   - Decide then: turn on Firebase App Check (Play Integrity) so `verifyIdentity` accepts calls only from the genuine app.
   - Release APK later needs its own SHA-1 added in Firebase.
3. Listing flow (lender): photo first, editable auto-fill (uses the image labeling from step 2), unique attribute.
4. Request flow (borrower) and matching (`onItemCreate`, `onRequestCreate`).
5. Rentals (`rentalAction`): deposit proof, handoff, extension, return, settlement, per-role ratings, chat thread.
   - Handoff check: show the other party's verified name, with an "ID didn't match" cancel action.
6. Later if time allows: 6-digit email code as an alternative to the email link.
7. Last: Message Owner before a request, notifications, Get Started 1 to 3, real logo file.
8. Release APK, seed demo data.
