# Test Log
| Date | What was tested | Result | Notes |
|------|-----------------|--------|-------|
| 2026-10-09 | Firestore and Storage security rules in the Firebase emulator (`cd backend && npm run test:rules`) | 17 of 17 passed | Emulator only (project `demo-rentka`). Rules are not deployed yet. |

## Security rules tests (2026-10-09, emulator)
| Test ID | Scenario | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| R01 | Unverified user creates an item or a request | Denied | Denied | Pass |
| R02 | Verified user creates own item (available) and own request (open) | Allowed | Allowed | Pass |
| R03 | Verified user creates an item for another owner, an item with status rented, or a request with status matched | Denied | Denied | Pass |
| R04 | User creates own profile with `verified` or `trustScore` | Denied | Denied | Pass |
| R04b | User creates own profile with `isAdult`, `ratingCount`, `verifiedAt` or `idType` | Denied | Denied | Pass |
| R04c | User creates own profile with allowed fields; same for another uid | Allowed; denied | Allowed; denied | Pass |
| R05 | User updates own `fullName`, `contact`, `fcmToken` | Allowed | Allowed | Pass |
| R06 | User updates own `verified`, `trustScore`, `ratingCount`; another user's profile | Denied | Denied | Pass |
| R07 | Owner edits item description; owner edits `status` or `currentRentalId`; non-owner edits item | Allowed; denied; denied | Allowed; denied; denied | Pass |
| R08 | Client writes `rentals`, `matches`, `deposits`, `reviews` | Denied | Denied | Pass |
| R09 | Participants read the rental and its chat; non-participant reads rental, chat, match | Allowed; denied | Allowed; denied | Pass |
| R10 | Chat message with own `senderId`; with another user's `senderId`; from a non-participant | Allowed; denied; denied | Allowed; denied; denied | Pass |
| R11 | Full unique ID read by owner; by borrower before the rental is on the item; by borrower after; by a stranger | Allowed; denied; allowed; denied | Allowed; denied; allowed; denied | Pass |
| R12 | Client reads `uniqueIds`, `idHashes`, `verifyAttempts`, `transactionLogs` | Denied | Denied | Pass |
| S01 | Item photo: owner uploads image under 5 MB; other user's folder; non-image; over 5 MB; signed-out read | Allowed; denied; denied; denied; denied | Allowed; denied; denied; denied; denied | Pass |
| S02 | Payment proof and condition photo: participants upload and read; non-participant uploads or reads | Allowed; denied | Allowed; denied | Pass |
| S03 | Upload under `ids/` (no such path) | Denied | Denied | Pass |
