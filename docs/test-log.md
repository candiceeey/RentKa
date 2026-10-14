# Test Log
| Date | What was tested | Result | Notes |
|------|-----------------|--------|-------|
| 2026-10-09 | Firestore and Storage security rules in the Firebase emulator (`cd backend && npm run test:rules`) | 17 of 17 passed | Emulator only (project `demo-rentka`). The same rules files were deployed to `rentka` afterwards on 2026-10-09. |
| 2026-10-09 | Rules tests rerun after adding R04d; rentka-core tests with new userProfile tests | 18 of 18 and 55 of 55 passed | App foundation type-checks and bundles for Android; not yet tested on a phone. |
| 2026-10-10 | rentka-core tests (roles, per-role ratings, ID form, verification decision) and rules tests (roles, role needed to post, rating fields, chat) | 69 of 69 and 26 of 26 passed | Rules and `verifyIdentity` deployed afterwards. An unauthenticated call to the live function returns "Sign in first." Signed-in verification not yet tested on a phone. |
| 2026-10-14 | rentka-core tests after moving the ID checks to the phone: SHA-256 against published vectors and Node crypto (lengths 0 to 130, non-ASCII), request contains no raw ID data, server accepts only a hex hash plus three booleans, decision order | 76 of 76 passed | `verifyIdentity` redeployed; an unauthenticated call still returns "Sign in first." Signed-in path not yet tested on a phone. |

## Security rules tests added 2026-10-10 (emulator)
Changed: R01 now uses an unverified account that has both roles; R04 and R06 cover the four rating fields; R09 and R10 also cover signed-out and both participants.
| Test ID | Scenario | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| R09b | Inbox query by role (`lenderId` / `borrowerId` equal to own uid); query without the filter; another user's query | Allowed; denied; denied | Allowed; denied; denied | Pass |
| R13 | Create profile with roles missing, empty, unknown, mixed with unknown, duplicated, or not a list | Denied | Denied | Pass |
| R13b | Create profile with roles lender, borrower, or both | Allowed | Allowed | Pass |
| R14 | Add the missing role later (borrower adds lender; lender adds borrower) | Allowed | Allowed | Pass |
| R15 | Remove a role, empty the list, swap the role, add an unknown or duplicate role, change another user's roles | Denied | Denied | Pass |
| R16 | Change roles together with `verified` or a rating field in one write | Denied | Denied | Pass |
| R17 | Verified borrower-only account creates an item; verified lender-only account creates a request | Denied | Denied | Pass |
| R18 | Borrower adds the lender role, then creates an item | Allowed | Allowed | Pass |

## Security rules tests (2026-10-09, emulator)
| Test ID | Scenario | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| R01 | Unverified user creates an item or a request | Denied | Denied | Pass |
| R02 | Verified user creates own item (available) and own request (open) | Allowed | Allowed | Pass |
| R03 | Verified user creates an item for another owner, an item with status rented, or a request with status matched | Denied | Denied | Pass |
| R04 | User creates own profile with `verified` or `trustScore` | Denied | Denied | Pass |
| R04b | User creates own profile with `isAdult`, `ratingCount`, `verifiedAt` or `idType` | Denied | Denied | Pass |
| R04c | User creates own profile with allowed fields; same for another uid | Allowed; denied | Allowed; denied | Pass |
| R04d | User creates own profile with every field in the app's `SIGNUP_FIELDS` constant | Allowed | Allowed | Pass |
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
