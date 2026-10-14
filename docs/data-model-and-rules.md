# RentKa: Data Model, Status Machine, Deposit Logic, Security Rules

Stack: React Native + Expo (dev build), Firebase (Auth, Firestore, Storage, Cloud Functions 2nd gen, FCM). Android only.

---

## 1. Design decisions (from the panel + adviser changes)

1. The ID step happens **on the device**: an editable form (full name, birthdate, ID type, ID number) that the ML Kit scan will pre-fill later. **Raw ID data is never uploaded or stored**: the four fields never leave the phone. The phone runs the checks itself (`validateIdForm`, age >= 18, loose name match with the account) and sends `verifyIdentity` only:
   - `idHash`: SHA-256 (hex) of `"<idType>:<normalized ID number>"`, computed on the phone;
   - `checks`: `{ formValid, isAdult, nameMatches }` (pass/fail);
   - `livenessPassed` (later, from the liveness module).
   The function applies HMAC-SHA256 with a server secret to `idHash`, checks for duplicates and the attempt limit, and stores only `verified`, `isAdult`, `verifiedAt` and the HMAC (plus attempt times for the lockout). No `ids/` path in Storage.
   - Limits to state honestly: the pass/fail results come from the phone, so a modified app could fake them (App Check is the planned safeguard). The SHA-256 of an ID number is not anonymous on its own (ID numbers can be guessed and hashed), so it travels only over HTTPS and is never stored; only the keyed HMAC is stored.
2. Verification is **automatic** (Cloud Function `verifyIdentity`) with only two outcomes: **verified** or **rejected** (with a reason). There is no "flagged" outcome and no manual approval. Admin handles only disputes and moderation.
   - Required for every user at registration, whatever the role. Adding a role later needs no second check.
   - Registration flow: Register (full name, email, contact, password, confirm password, "Sign up as", Terms) or Continue with Google then "Complete your profile" (contact, Sign up as, Terms) -> verify email with a 6-digit code (email/password accounts only; Google accounts skip; `verifyIdentity` requires `users.emailVerified`) -> ID type -> scan ID (ML Kit text recognition) -> face check with motion (ML Kit face detection, blink or head turn) -> editable details auto-filled from the scan (ID number, name, address, sex, birthdate) -> review -> result -> sign out to Login. Scan, face check and Google sign-in come with the stage-2 native rebuild; manual entry is the fallback.
   - Address and sex are only for the on-device form: never sent, never stored, not part of `users`.
   - Until `verified == true` a user cannot post an item, post a request, or accept or start a rental (enforced in the rules and in the functions).
   - Rejections: invalid details; under 18; name on the ID does not match the account name ("Name doesn't match your account", compared loosely: case, accents, spacing, "Last, First" order and a missing middle name are ignored); ID already registered ("This ID is already registered."); more than 5 attempts in 24 hours (temporary lockout, "Try again in X hours", lifts by itself).
   - Planned (not built): an on-device **liveness check** between the form and the result. See `docs/build-status.md`.
3. AI auto-fill: ML Kit labels (>= 0.70) + OCR text become an editable description and editable characteristic chips (brand, model). Matching uses the confirmed category/subcategory/chips (Field) and the raw photo labels (Labels), never the free-text description.
4. Item is **hidden from listings until returned** (`items.status`).
5. Every item has a **unique attribute** (IMEI, serial number, or distinguishing mark).
6. **1 lender per match per item.** One request is accepted by one lender, and one item has one active rental.
7. Rentals are **open-ended**: a start date only, no end date and no rental total. Deposit (daily rate x 7) covers 7 days, with extension by top-up.
8. All rental state changes go through **one callable function** (`rentalAction`). Clients never write status fields directly.
9. **Roles are chosen.** At registration the user picks Lender, Borrower or Both, and `roles` holds only that choice. The missing role can be added later from Profile > Settings; a role is never removed.
10. **Ratings are per role.** Each user has a lender trust score and a borrower trust score. A rating updates the role the rated person had in that rental. The two are never combined or shown together as one score.
11. **Messages are per role.** The inbox shows only chats for the active role (lender mode: rentals where the user is the lender; borrower mode: where they are the borrower).

---

## 2. Firestore collections

### `users/{uid}`
```
fullName, contact, email
roles: ["lender"] | ["borrower"] | ["lender","borrower"]   // only what the user chose; can grow, never shrink
verified: bool            // set by verifyIdentity only
isAdult: bool             // set by verifyIdentity only
emailVerified: bool       // set by verifyEmailCode only
emailVerifiedAt: timestamp  // set by verifyEmailCode only
verifiedAt: timestamp     // set by verifyIdentity only
lenderTrustScore: number      // missing = 3.00; written only by the rating function
lenderRatingCount: number     // missing = 0; written only by the rating function
borrowerTrustScore: number    // missing = 3.00; written only by the rating function
borrowerRatingCount: number   // missing = 0; written only by the rating function
fcmToken: string
createdAt
```
Client may write at sign-up only: `fullName, contact, email, roles, fcmToken, createdAt` (the `SIGNUP_FIELDS` constant in `rentka-core/src/userProfile.ts`).
Client may edit later only: `fullName, contact, fcmToken`, and `roles` by adding a valid value. Everything else is function-written.
Not stored anywhere: ID type, ID number, birthdate, gender, address, avatar.

### `items/{itemId}`
```
ownerId
category, subcategory
characteristics: [string]   // editable chips, lowercase, e.g. ["bosch","gsb 550","cordless"]; Field score uses these
description            // final, user-editable (not used for matching)
photoLabels: [{ label, confidence }]   // raw ML Kit output; NEVER overwritten by edits; Labels score uses this
autofillSuggested: { description, category, subcategory, characteristics }  // what auto-fill proposed; NEVER overwritten; used to compute acceptance rate for Chapter 4
photos: [storagePaths]
dailyRate: number
location: { lat, lng, address }
status: "available" | "reserved" | "rented" | "inactive"
currentRentalId: string | null
uniqueIdType: "IMEI" | "SERIAL" | "MARK"
uniqueIdMasked: "•••••1234"        // public
createdAt
```

### `items/{itemId}/private/identifiers`
```
uniqueIdValue     // full IMEI/serial/mark
```
Readable only by the owner and the borrower of `currentRentalId`.

### `requests/{requestId}`
```
borrowerId
category, subcategory, characteristics: [string]
description, photoLabels, autofillSuggested   // same meaning as on items
refPhoto: storagePath | null
dailyBudget: number
desiredStart: timestamp
location: { lat, lng, address } | null   // null when location permission is denied
status: "open" | "matched" | "closed"
matchedItemId: string | null
createdAt
```
No end date, since rentals are open-ended. Optional `expectedDays` for display only.

### `matches/{matchId}`  (function-written)
```
requestId, itemId, lenderId, borrowerId
score, breakdown: { field, labels, proximity }
status: "suggested" | "chosen" | "closed"
createdAt
```
Matching hard filters (all must pass): `items.status == "available"`, owner verified, owner != borrower, `dailyRate <= dailyBudget`, category equal.
Score = Field x 0.40 + Labels x 0.30 + Proximity x 0.30.
- Field = 0.5 category + 0.3 subcategory + 0.2 characteristic coverage (share of the borrower's requested chips the item has; extra item chips are not penalized; no chips requested = 1).
- Labels: only labels with confidence >= 0.70 and not in the generic list (Product, Material, Room, Tool, ...). Score = share of the borrower's labels found on the item.
- Fallbacks: labels used only if BOTH sides have usable labels. Otherwise Field 0.55 / Proximity 0.45. No location: Field 0.571 / Labels 0.429. Neither: Field only.
- Proximity = max(0, 1 - km/10).
- Ranking: score desc, then the item owner's `lenderTrustScore` desc, then distance asc. Drop scores below 0.40. Show top 5.
- Weights live in one config (`WEIGHTS` in matching.ts) so they can be tuned after user testing.

### `rentals/{rentalId}`
```
itemId, requestId, matchId
lenderId, borrowerId
status: see state machine (section 3)
dailyRate                 // snapshot at accept time
depositCoverDays: 7
depositAmount             // default = dailyRate x 7
depositTotal              // depositAmount + approved top-ups
paymentProof: storagePath
startAt                   // set when status becomes "active"
coveredUntil              // startAt + 7 days, +7 per approved extension
extensions: [{ amount, proofPath, requestedAt, approvedAt }]
conditionBefore: [storagePaths]
conditionAfter: [storagePaths]
returnedAt
settlement: { daysUsed, finalCost, depositTotal, balance, direction }
overdue: bool
createdAt
```

### `rentals/{rentalId}/messages/{msgId}`
`senderId, text, createdAt`

### `deposits/{rentalId}`  (function-written)
```
amount, topUps: [amounts], total
status: "held" | "settled" | "forfeited"
settledAt
refundToBorrower   // if balance > 0
owedByBorrower     // if balance < 0
```

### `reviews/{reviewId}`  (function-written)
`rentalId, fromUid, toUid, ratedRole ("lender" | "borrower"), rating (1-5), comment, createdAt`. Unique per (rentalId, fromUid) so a retry cannot double-count. One overall rating per review; per-category ratings are future work.

### `transactionLogs/{logId}`  (append-only, function-written)
`rentalId, actorUid, action, fromStatus, toStatus, at`

### Server-only collections (no client access)
- `uniqueIds/{hash}`: `{ itemId }`. Blocks the same unit being listed twice. Hash = HMAC of `type + normalized value`.
- `idHashes/{hmac}`: `{ uid, createdAt }`. Blocks duplicate ID registration. Key = HMAC-SHA256(server secret `ID_HMAC_SECRET`, SHA-256 of `"<idType>:<normalized ID number>"` sent by the phone).
- `verifyAttempts/{uid}`: `{ times: [timestamp] }`, the attempts in the last 24 hours, for the automatic lockout.
- `emailCodes/{uid}`: `{ codeHash, sentAt, expiresAt, tries }`. The current 6-digit email code, stored only as HMAC-SHA256(`ID_HMAC_SECRET`, `"uid:code"`). Expires 10 minutes after `sentAt`; dead after 5 wrong tries; deleted when used. A new code (at most one per minute) replaces it.

---

## 3. Rental status machine

```
pending ──accept──> accepted ──handoff──> active ──return──> returned ──both rate──> completed
   │                    │                    │
   └────cancel──────────┴───cancel───────────┴──dispute──> disputed
```

| Action (via `rentalAction`) | Who | From -> To | Side effects |
|---|---|---|---|
| `request` | borrower | (new) -> pending | Create rental + chat. |
| `accept` | lender | pending -> accepted | **Transaction:** item.status = rented, item.currentRentalId set, request.status = matched, other matches for this request and item set to closed, other lenders notified. |
| `submitPaymentProof` | borrower | accepted | Save proof path. Deposit amount recorded. |
| `confirmHandoff` | lender | accepted -> active | Requires payment proof and before photos. Sets startAt, coveredUntil = startAt + 7d, deposit status = held. |
| `requestExtension` | borrower | active | Uploads top-up proof. |
| `approveExtension` | lender | active | coveredUntil += 7d, depositTotal += amount, overdue = false. |
| `confirmReturn` | lender | active -> returned | Requires after photos. **Item becomes available again.** Runs settlement. |
| `rate` | borrower / lender | returned -> completed (when both rated) | Updates the rated person's score **for the role they had in this rental** (`lenderTrustScore`/`lenderRatingCount` or `borrowerTrustScore`/`borrowerRatingCount`) with (old x count + rating) / (count + 1), in a transaction, idempotent. |
| `cancel` | either | pending / accepted -> cancelled | Item and request unlocked, matches reopened. |
| `dispute` | either | active / returned -> disputed | Admin queue. |

If the item is never returned: the admin can mark it returned or disputed, and the item stays hidden.

---

## 4. Deposit and open-time logic

- **Deposit** = `dailyRate x 7` (the 7-day cover). Paid outside the app (GCash/Maya), proof uploaded.
- **Daily rate runs** from `startAt` (handoff), not from booking.
- **Day 6 (scheduled function):** push reminder to borrower: "Return or extend by tomorrow."
- **Past `coveredUntil` with no return or extension:** set `overdue = true`, notify both parties. The lender may open a dispute.
- **Extension:** borrower tops up (default another 7 days of rate), lender approves, `coveredUntil` moves 7 days.
- **Settlement on return:**
  - `daysUsed = max(1, ceil((returnedAt - startAt) / 24h))`  (document this rule in the paper)
  - `finalCost = daysUsed x dailyRate`
  - `balance = depositTotal - finalCost`
  - `balance > 0`: refund to borrower is recorded, `balance < 0`: borrower owes the difference (recorded), `balance == 0`: settled exactly.
- The app **records** amounts and statuses only. Money moves outside the app.

---

## 5. Cloud Functions list

| Function | Trigger | Purpose |
|---|---|---|
| `sendEmailCode` | callable | Emails a random 6-digit code from rentkabxu@gmail.com (nodemailer, Gmail app password in `GMAIL_APP_PASSWORD`). Stores only its HMAC in `emailCodes/{uid}` with a 10-minute expiry. One send per minute ("Wait N seconds"). Skips Google and already verified accounts. |
| `verifyEmailCode` | callable | Checks a typed code in a transaction (constant-time compare). Wrong: one try used, "N tries left". Dead after 5 wrong tries or 10 minutes. Right: deletes the code, sets `users.emailVerified` and `emailVerifiedAt`. The only writer of those fields. |
| `verifyIdentity` | callable | **Deployed.** Refused until `users.emailVerified` is true (Google sign-in accounts excepted). Receives only `{ idHash, checks, livenessPassed? }` (no raw ID data; the phone runs the field, age and name checks). Applies the HMAC, checks duplicates, 24-hour lockout after 5 attempts, sets the `verified` claim. Stores only `verified`, `isAdult`, `verifiedAt` and the HMAC. Outcomes: verified / rejected(reason). Logic: `buildVerificationRequest` (phone) and `parseVerificationRequest` + `decideVerification` (server) in `rentka-core/src/identity.ts`. |
| `onItemCreate` | Firestore onCreate (items) | Reserve `uniqueIds` hash, match against open requests, write matches, notify. |
| `onRequestCreate` | Firestore onCreate (requests) | Match against available items, write matches, notify. |
| `rentalAction` | callable | The state machine above (single switch). |
| `depositReminders` | scheduled (daily) | Day-6 reminder, set overdue. |

Use the **Firebase Emulator Suite** for development. Blaze plan plus a budget alert is required for Storage and Functions.

---

## 6. Firestore Security Rules (starter)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function verified() { return signedIn() && request.auth.token.verified == true; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function only(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }

    // 1 or 2 roles, only lender / borrower, no duplicates.
    function validRoles(roles) {
      return roles is list && roles.size() >= 1 && roles.size() <= 2
        && roles.hasOnly(['lender','borrower'])
        && roles.toSet().size() == roles.size();
    }
    // The signed-in user's own roles, read from their users document.
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny([role]);
    }

    match /users/{uid} {
      allow read: if signedIn();
      // Allowlist: verified, isAdult, verifiedAt, emailVerified, emailVerifiedAt and the four rating fields
      // (lenderTrustScore, lenderRatingCount, borrowerTrustScore, borrowerRatingCount) are function-written.
      allow create: if isOwner(uid)
        && request.resource.data.keys().hasOnly(['fullName','contact','email','roles','fcmToken','createdAt'])
        && validRoles(request.resource.data.roles);
      // roles may only gain a valid value: every role already held must remain.
      allow update: if isOwner(uid) && only(['fullName','contact','fcmToken','roles'])
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['roles'])
            || (validRoles(request.resource.data.roles)
                && request.resource.data.roles.hasAll(resource.data.get('roles', []))));
      allow delete: if false;
    }

    match /items/{itemId} {
      allow read: if verified();
      allow create: if verified() && hasRole('lender')
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.status == 'available';
      allow update: if verified()
        && resource.data.ownerId == request.auth.uid
        && only(['description','dailyRate','photos','location','characteristics']);
      allow delete: if false;

      match /private/{docId} {
        allow read: if signedIn() && (
          get(/databases/$(database)/documents/items/$(itemId)).data.ownerId == request.auth.uid ||
          (get(/databases/$(database)/documents/items/$(itemId)).data.currentRentalId != null &&
           get(/databases/$(database)/documents/rentals/$(get(/databases/$(database)/documents/items/$(itemId)).data.currentRentalId)).data.borrowerId == request.auth.uid)
        );
        allow create: if signedIn() &&
          get(/databases/$(database)/documents/items/$(itemId)).data.ownerId == request.auth.uid;
        allow update, delete: if false;
      }
    }

    match /requests/{requestId} {
      allow read: if verified();
      allow create: if verified() && hasRole('borrower')
        && request.resource.data.borrowerId == request.auth.uid
        && request.resource.data.status == 'open';
      allow update: if verified()
        && resource.data.borrowerId == request.auth.uid
        && only(['description','dailyBudget','desiredStart','location','characteristics']);
      allow delete: if false;
    }

    match /matches/{matchId} {
      allow read: if signedIn() &&
        (resource.data.lenderId == request.auth.uid || resource.data.borrowerId == request.auth.uid);
      allow write: if false;
    }

    match /rentals/{rentalId} {
      allow read: if signedIn() &&
        (resource.data.lenderId == request.auth.uid || resource.data.borrowerId == request.auth.uid);
      allow write: if false;   // all changes go through rentalAction

      match /messages/{msgId} {
        function participant() {
          let r = get(/databases/$(database)/documents/rentals/$(rentalId)).data;
          return signedIn() && (r.lenderId == request.auth.uid || r.borrowerId == request.auth.uid);
        }
        allow read: if participant();
        allow create: if participant() && request.resource.data.senderId == request.auth.uid;
        allow update, delete: if false;
      }
    }

    match /deposits/{id}       { allow read: if signedIn(); allow write: if false; }
    match /reviews/{id}        { allow read: if signedIn(); allow write: if false; }
    match /transactionLogs/{id}{ allow read, write: if false; }  // admin via console/Admin SDK
    match /uniqueIds/{id}      { allow read, write: if false; }
    match /idHashes/{id}       { allow read, write: if false; }
    match /verifyAttempts/{id} { allow read, write: if false; }
    match /emailCodes/{id}     { allow read, write: if false; }  // hashed email codes, functions only
  }
}
```

Tighten the `deposits` and `reviews` reads to participants after the demo works.

---

## 7. Storage Security Rules (starter)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function signedIn() { return request.auth != null; }
    function isImage() { return request.resource.contentType.matches('image/.*'); }
    function under5mb() { return request.resource.size < 5 * 1024 * 1024; }
    function rentalParticipant(rentalId) {
      let r = firestore.get(/databases/(default)/documents/rentals/$(rentalId)).data;
      return signedIn() && (r.lenderId == request.auth.uid || r.borrowerId == request.auth.uid);
    }

    // Item photos: any signed-in user reads, owner uploads
    match /items/{uid}/{itemId}/{file} {
      allow read: if signedIn();
      allow write: if signedIn() && request.auth.uid == uid && isImage() && under5mb();
    }

    // Payment proofs and deposit top-ups: rental participants only
    match /payments/{rentalId}/{file} {
      allow read: if rentalParticipant(rentalId);
      allow write: if rentalParticipant(rentalId) && isImage() && under5mb();
    }

    // Before/after condition photos: rental participants only
    match /condition/{rentalId}/{file} {
      allow read: if rentalParticipant(rentalId);
      allow write: if rentalParticipant(rentalId) && isImage() && under5mb();
    }
  }
}
```

There is intentionally **no `ids/` path**: ID images never reach the cloud.

---

## 8. Test the rules in the emulator (Chapter 4 evidence)

Log each as: Test ID | Scenario | Expected | Actual | Pass/Fail.

- Unverified user cannot create an item or request.
- Borrower-only account cannot create an item; lender-only account cannot create a request.
- Roles on create: missing, empty, unknown or duplicated values are denied; lender, borrower or both are allowed.
- A role can be added later; a role cannot be removed; roles and a protected field cannot change in one write.
- Client cannot set `verified`, `emailVerified`, `emailVerifiedAt`, the four rating fields, or `status`.
- Clients cannot read or write `emailCodes`.
- Email code (function tests): a code expires after 10 minutes; 5 wrong tries kill it; one resend per minute; only the hash is stored.
- Non-participant cannot read a rental, its chat, or its payment proof.
- Borrower cannot read `items/{id}/private/identifiers` before a rental is accepted.
- Two lenders cannot both accept the same request.
- Two borrowers cannot both book the same item (transaction).
- Duplicate IMEI listing is blocked.
- Duplicate ID registration is blocked.
- Overdue flag is set after `coveredUntil`.
- Settlement math: under-use (refund), exact, and over-use (owed).
