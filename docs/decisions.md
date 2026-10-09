# Decisions
- React Native + Expo instead of Flutter (team familiarity).
- Development build, Android only; APK distributed via GitHub Releases.
- Own Kotlin ML Kit Expo module instead of a third-party wrapper.
- ID data stays on-device; automatic verification, no admin approval.
- Separate frontend/ and backend/ folders; shared logic in rentka-core/.
- Storage bucket in US-EAST1 (no-cost location); Firestore in Singapore.
- Matching: category is a hard filter; labels used only when both sides have usable non-generic labels; characteristic score is coverage of requested chips; min score 0.40, top 5, tiebreak trust then distance.
- Auto-fill: raw photoLabels and autofillSuggested are stored untouched next to the user-confirmed fields.
