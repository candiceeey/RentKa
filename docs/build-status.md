# Build Status
## Done
- Repo on GitHub (candiceeey/RentKa), Expo app builds and installs on phone as RentKa.
- Firebase project, Auth, Firestore, Storage, Android app configured; test screen reads/writes Firestore.
- rentka-core with 49 passing tests (matching updated: hard filters, generic labels, fallbacks, ranking; autofill chips and accuracy).
- backend/: Firebase config, Firestore and Storage rules from the spec, emulator config, Functions TypeScript scaffold (no functions yet), 17 passing rules tests.
- Real Firestore and Storage rules deployed to `rentka` on 2026-10-09 (temporary connectionTest rule removed). Functions not deployed.
## Next
1. Cloud Functions (verifyIdentity first).
2. ML Kit native module.
3. Registration + ID scan + verifyIdentity.
4. Listing and request flows with auto-fill.
5. Matching, rentals, chat, payment proof, ratings.
6. Release APK, seed demo data.
