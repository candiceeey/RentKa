# RentKa — Project Brief for Claude Code

## What this is
RentKa is a mobile peer-to-peer item rental app for Butuan City (capstone project). Final defense is the week after 2026-10-07, so speed matters: a working APK is needed for user testing, then paper Chapters 4-5.

## About the user (Candy)
- Leads the capstone team. Familiar with React Native basics, not an expert. Windows machine, repo at `C:\dev\RentKa`.
- Explain plainly, give exact Windows cmd commands, and ask for terminal output when something fails.
- Keep answers concise but complete. Make changes yourself rather than asking her to edit files by hand.

## Stack
- `frontend/`: React Native + Expo SDK 57, TypeScript, Expo Router (`src/app`), development build (NOT Expo Go), Android only, package `com.rentka.app`.
- `backend/`: Firebase (not created yet): Firestore (Singapore), Storage (US-EAST1), Auth (email/password), Cloud Functions 2nd gen. Project id `rentka`. Blaze plan is on: avoid anything that could run up costs.
- `rentka-core/`: pure TypeScript logic with tests (matching, description, ID parsing, validators, settlement, state machine). Sync into the app with `sync-core.bat`.
- Use the React Native Firebase **modular API** (`getAuth`, `getFirestore`, `doc`, `setDoc`...).
- ML Kit (image labeling + text recognition) via our own Expo local native module (Kotlin). Third-party wrappers were rejected.

## Commands
- Tests: `cd rentka-core && npm test`
- Dev server: `cd frontend && npx expo start --dev-client`
- Build/install on phone: `npx expo run:android` (USB debugging on)
- Clean native rebuild: `npx expo prebuild --clean`
- Check phone connection: `adb devices`

## Product rules (do not change without asking)
- Match Score = Field×0.40 + Labels×0.30 + Proximity×0.30. With no usable photo: 0.55 Field / 0.45 Proximity. Labels count only at confidence ≥ 0.70. Field = 0.5 category + 0.3 subcategory + 0.2 characteristic overlap. Proximity = max(0, 1 − km/10). Hard filters: item available and dailyRate ≤ borrower dailyBudget.
- Photo auto-fill: ML Kit labels/text fill an **editable** description.
- ID verification runs on-device (GCash-style scan, pre-fill). Raw ID data is never uploaded. The cloud stores only verified, isAdult, timestamp, and an HMAC hash. Verification is automatic, with no admin approval. Be honest in the paper: no face matching.
- An item is hidden from listings until returned. One lender per match per item. Each item has a unique attribute (e.g. IMEI for phones, Luhn-validated).
- Rentals can be open-ended. Deposit = dailyRate × 7 and covers 7 days. At day 7 the app prompts return or extend (top up), and the lender is alerted when the deadline passes. daysUsed = ceil(hours/24), min 1. Settlement is refund / even / owed. Payment happens outside the app: the system records amounts and statuses only.
- All rental state changes go through one callable function, `rentalAction`.
- Trust score = (old×count + rating)/(count+1).

## Working agreements
- Use plan mode for anything touching more than a few files.
- Run `rentka-core` tests after changing core logic.
- Never commit secrets: service account keys (`*firebase-adminsdk*.json`), `.env`, keystores. `google-services.json` is already in the repo.
- Run `git status` before commits. Commit in small steps with clear messages.
- Log decisions in `docs/decisions.md`, progress in `docs/build-status.md`, anything that affects the paper in `docs/paper-change-log.md`, and test results in `docs/test-log.md`.

## Known open items
- Firestore rules are only the temporary `connectionTest` rule: deploy real rules from the spec.
- Set the Google Cloud budget alert.
- Verify the Blaze payment/hold status.

## Reference docs
@docs/data-model-and-rules.md
@docs/decisions.md
@docs/build-status.md
