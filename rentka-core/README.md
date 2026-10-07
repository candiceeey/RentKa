# rentka-core

Pure TypeScript logic for RentKa. No Firebase, no React Native, so it runs the same in the Expo app and in Cloud Functions, and it is unit-tested.

| File | What it does | Used by |
|---|---|---|
| `src/matching.ts` | Match Score 40/30/30, hard filters, ranking | `onItemCreate`, `onRequestCreate` functions |
| `src/description.ts` | ML Kit labels + OCR text -> editable description, category mapping (`LABEL_MAP`) | App (listing and request forms) |
| `src/idParse.ts` | OCR text from an ID -> name, birthdate, ID number (heuristic, always editable) | App (registration, on-device only) |
| `src/validators.ts` | IMEI (Luhn), serial/mark normalization, masking, 18+ check | App and `verifyIdentity`, `onItemCreate` |
| `src/settlement.ts` | 7-day deposit, covered-until, reminder/overdue, days used, settlement | `rentalAction`, scheduled reminder, app display |
| `src/stateMachine.ts` | Allowed rental transitions per role, item status rule, trust score average | `rentalAction` |

## Use it
Copy `src/` into the app (e.g. `app/lib/core`) and into the functions project (e.g. `functions/src/core`). Keep one source of truth: edit here, re-copy.

```bash
npm install
npm test        # 37 tests
npm run build   # typecheck
```

## Things you must still do
- Rename `LABEL_MAP` categories to match your Chapter 3 category list, and add real labels you see from ML Kit on your own photos.
- Tune `parseId` with real (consenting) ID scans. It is a heuristic. Expect to add rules per ID type.
- Add the HMAC duplicate-ID and duplicate-IMEI checks in Cloud Functions (needs server secrets).
- Decide edge cases in the paper: day counting (24h blocks, rounded up), what a first rating does to the 3.00 default (currently the first rating replaces it).
