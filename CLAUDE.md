# RentKa — Project Brief for Claude Code

## What this is
RentKa is a mobile peer-to-peer item rental app for Butuan City (capstone project). Final defense is the week after 2026-10-07, so speed matters: a working APK is needed for user testing, then paper Chapters 4-5.

## About the user (Candy)
- Leads the capstone team. Familiar with React Native basics, not an expert. Windows machine, repo at `C:\dev\RentKa`.
- Explain plainly, give exact Windows cmd commands, and ask for terminal output when something fails.
- Keep answers concise but complete. Make changes yourself rather than asking her to edit files by hand.

## Stack
- `frontend/`: React Native + Expo SDK 57, TypeScript, Expo Router (`src/app`), development build (NOT Expo Go), Android only, package `com.rentka.app`.
- `backend/`: Firebase (Firestore and Storage rules deployed; `verifyIdentity` function deployed 2026-10-10 in asia-southeast1; other functions not written yet): Firestore (Singapore), Storage (US-EAST1), Auth (email/password), Cloud Functions 2nd gen. Project id `rentka`. Blaze plan is on: avoid anything that could run up costs.
- `rentka-core/`: pure TypeScript logic with tests (matching, description, ID parsing, validators, settlement, state machine). After editing `rentka-core\src`, run `sync-core.bat` (repo root): it mirrors the files into `frontend\src\core` and `backend\functions\src\core`. Never edit those copies.
- Use the React Native Firebase **modular API** (`getAuth`, `getFirestore`, `doc`, `setDoc`...).
- ML Kit (text recognition, face detection, image labeling) via our own Expo local native module (Kotlin), planned at `frontend/modules/rentka-mlkit`. Third-party wrappers were rejected.
- Sign-in: email/password with an email verification link; Google sign-in planned for the stage-2 rebuild.

## Commands
- Tests: `cd rentka-core && npm test`
- Rules tests (emulator, needs Java): `cd backend && npm run test:rules`
- Build functions: `cd backend\functions && npm run build`
- Dev server: `cd frontend && npx expo start --dev-client`
- Build/install on phone: `npx expo run:android` (USB debugging on)
- Clean native rebuild: `npx expo prebuild --clean`
- Check phone connection: `adb devices`

## Product rules (do not change without asking)
- Match Score = Field×0.40 + Labels×0.30 + Proximity×0.30. Full rules (fallback weights, generic label list, hard filters, ranking, min score 0.40, top 5) are in `docs/data-model-and-rules.md` and `rentka-core/src/matching.ts`. Keep weights in the `WEIGHTS` config.
- Photo auto-fill: ML Kit labels/text fill an **editable** description plus editable characteristic chips. Always store raw `photoLabels` and `autofillSuggested` untouched; Field uses the confirmed fields, Labels uses raw `photoLabels`, and the free-text description is never matched.
- Roles: the user chooses Lender, Borrower or Both at registration. `roles` holds only that choice; a role can be added later from Profile, never removed. Posting an item needs the lender role, posting a request needs the borrower role (rules enforce both).
- ID verification is required for every user at registration, whatever the role. The ID step is an editable form (name, birthdate, ID type, ID number) that the ML Kit scan will pre-fill later. Raw ID data is never uploaded: the name, birthdate, ID type and ID number never leave the phone. The phone runs the checks itself (valid details, 18+, name matches the account) and sends `verifyIdentity` only a SHA-256 hash of the normalized ID type and number plus those pass/fail results. The function applies a server-side HMAC to that hash, checks duplicates and the attempt limit, and stores only verified, isAdult, verifiedAt and the HMAC (plus attempt times for the lockout). Because the pass/fail results come from the phone, a modified app could fake them; App Check is the planned safeguard. Verification is automatic with two outcomes only: verified, or rejected with a reason (no "flagged", no admin approval). Until verified, a user cannot post an item or request, or accept or start a rental. Be honest in the paper: no face matching.
- Registration flow: Register (or Continue with Google, then Complete your profile) -> verify email by link (Google accounts skip) -> ID type -> scan ID -> face check with motion -> editable ID details (ID number, name, address, sex, birthdate) -> review -> result -> sign out to Login. Scan, face check and Google sign-in arrive with the stage-2 native rebuild (`docs/build-status.md` step 2); until then the details are typed by hand and `LIVENESS_REQUIRED` stays off. Address and sex stay on the phone like the other ID fields.
- An item is hidden from listings until returned. One lender per match per item. Each item has a unique attribute (e.g. IMEI for phones, Luhn-validated).
- Rentals can be open-ended. Deposit = dailyRate × 7 and covers 7 days. At day 7 the app prompts return or extend (top up), and the lender is alerted when the deadline passes. daysUsed = ceil(hours/24), min 1. Settlement is refund / even / owed. Payment happens outside the app: the system records amounts and statuses only.
- All rental state changes go through one callable function, `rentalAction`.
- Trust score is per role: lenderTrustScore and borrowerTrustScore (each with its count, function-written; a missing field means 3.00 / 0). A rating updates the role the rated person had in that rental: (old×count + rating)/(count+1). Never show a combined score. Reviews are one 1-5 rating plus a comment.
- The inbox shows only chats for the active role. Tabs follow the prototype per role (Lender: Home, Listings, Requests, Messages; Borrower: Home, Requests, Messages).
- Not in the data model: ID type, ID number, date of birth, gender, address, avatar.

## Working agreements
- Use plan mode for anything touching more than a few files.
- Run `rentka-core` tests after changing core logic.
- Never commit secrets: service account keys (`*firebase-adminsdk*.json`), `.env`, keystores. `google-services.json` is already in the repo.
- Run `git status` before commits. Commit in small steps with clear messages.
- Log decisions in `docs/decisions.md`, progress in `docs/build-status.md`, anything that affects the paper in `docs/paper-change-log.md`, and test results in `docs/test-log.md`.

## Known open items
- Check that Storage rules can read Firestore (cross-service permission) with a real payment-proof upload from the app.
- Deploying functions on this machine needs `FUNCTIONS_DISCOVERY_TIMEOUT=60` (the default 10-second code-load check timed out).
- The logo is a placeholder until the image file is added.
- Verify the Blaze payment/hold status.

## Reference docs
@docs/data-model-and-rules.md
@docs/decisions.md
@docs/build-status.md
