# Decisions
- React Native + Expo instead of Flutter (team familiarity).
- Development build, Android only; APK distributed via GitHub Releases.
- Own Kotlin ML Kit Expo module instead of a third-party wrapper.
- ID data stays on-device; automatic verification, no admin approval.
- Separate frontend/ and backend/ folders; shared logic in rentka-core/.
- Storage bucket in US-EAST1 (no-cost location); Firestore in Singapore.
