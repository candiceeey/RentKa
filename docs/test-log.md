# Test Log
| Date | What was tested | Result | Notes |
|------|-----------------|--------|-------|
| 2026-10-09 | Firestore and Storage security rules in the Firebase emulator (`cd backend && npm run test:rules`) | 17 of 17 passed | Emulator only (project `demo-rentka`). The same rules files were deployed to `rentka` afterwards on 2026-10-09. |
| 2026-10-09 | Rules tests rerun after adding R04d; rentka-core tests with new userProfile tests | 18 of 18 and 55 of 55 passed | App foundation type-checks and bundles for Android; not yet tested on a phone. |
| 2026-10-10 | rentka-core tests (roles, per-role ratings, ID form, verification decision) and rules tests (roles, role needed to post, rating fields, chat) | 69 of 69 and 26 of 26 passed | Rules and `verifyIdentity` deployed afterwards. An unauthenticated call to the live function returns "Sign in first." Signed-in verification not yet tested on a phone. |
| 2026-10-14 | rentka-core tests after moving the ID checks to the phone: SHA-256 against published vectors and Node crypto (lengths 0 to 130, non-ASCII), request contains no raw ID data, server accepts only a hex hash plus three booleans, decision order | 76 of 76 passed | `verifyIdentity` redeployed; an unauthenticated call still returns "Sign in first." Signed-in path not yet tested on a phone. |
| 2026-10-14 | Registration stage 1: rentka-core tests for address and sex (form validation, OCR parsing, never in the request); rules tests rerun | 80 of 80 and 26 of 26 passed | `verifyIdentity` redeployed with the verified-email requirement. App type-checks and bundles; not yet tested on a phone. |
| 2026-10-15 | 6-digit email code: rentka-core rules (expiry, tries, resend wait), real `sendEmailCode` / `verifyEmailCode` / `verifyIdentity` against the Firestore and Auth emulators with email mocked, rules tests | 86 of 86, 14 of 14, 29 of 29 passed | Not deployed yet (waiting for the Gmail app password secret). No real email sent in tests. |

## Function tests added 2026-10-15 (emulator, email mocked)
| Test ID | Scenario | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| E01 | Send a code | One email with a 6-digit code; stored doc has only codeHash, sentAt, expiresAt (+10 min), tries 0; the code is not in it | As expected | Pass |
| E02 | Second send within 60 s | Refused (resource-exhausted), no second email | As expected | Pass |
| E03 | Send again after 60 s | New code sent, tries reset, old code no longer works, new code verifies | As expected | Pass |
| E04 | Google sign-in or already verified account asks for a code | No email, "alreadyVerified" | As expected | Pass |
| E05 | Email sending fails | Error, nothing stored, immediate retry allowed | As expected | Pass |
| E06 | Signed-out call | Refused (unauthenticated) | As expected | Pass |
| E07 | Right code | Verified; users.emailVerified and emailVerifiedAt set; code deleted | As expected | Pass |
| E08 | Right code after 10 minutes | "expired", email not verified | As expected | Pass |
| E09 | 4 wrong codes, then the right one | Tries left 4, 3, 2, 1, then verified | As expected | Pass |
| E10 | 5 wrong codes, then the right one | "tooManyTries", email not verified | As expected | Pass |
| E11 | Another user's code | Hashes differ per user; the other user's code is wrong | As expected | Pass |
| E12 | No code sent yet; 5-digit code | "noCode"; refused (invalid-argument) | As expected | Pass |
| E13 | ID step before and after email verification | "Verify your email first."; then verified | As expected | Pass |
| E14 | ID step for a Google sign-in account | Verified without an email code | As expected | Pass |

## Security rules tests added 2026-10-15 (emulator)
| Test ID | Scenario | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| R19 | Create own profile with emailVerified or emailVerifiedAt | Denied | Denied | Pass |
| R20 | Update emailVerified or emailVerifiedAt (alone, with fullName, or by merge); update fullName alone | Denied; allowed | Denied; allowed | Pass |
| R21 | Read, update, delete own email code; create one for another user | Denied | Denied | Pass |

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
