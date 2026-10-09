# RentKa: Data Model, Status Machine, Deposit Logic, Security Rules

Stack: React Native + Expo (dev build), Firebase (Auth, Firestore, Storage, Cloud Functions 2nd gen, FCM). Android only.

---

## 1. Design decisions (from the panel + adviser changes)

1. ID scan, OCR pre-fill, and selfie happen **on the device**. Parsed ID data is kept **only in local secure storage**. The cloud receives only `verified`, `isAdult`, a timestamp, and an HMAC hash for duplicate detection. No `ids/` path in Storage.
2. Verification is **automatic** (Cloud Function `verifyIdentity`). Admin only handles flagged cases, disputes, and moderation.
3. AI auto-fill: ML Kit labels (>= 0.70) + OCR text become an editable description and editable characteristic chips (brand, model). Matching uses the confirmed category/subcategory/chips (Field) and the raw photo labels (Labels), never the free-text description.
4. Item is **hidden from listings until returned** (`items.status`).
5. Every item has a **unique attribute** (IMEI, serial number, or distinguishing mark).
6. **1 lender per match per item.** One request is accepted by one lender, and one item has one active rental.
7. Rentals are **open-ended**. Deposit covers 7 days, with extension by top-up.
8. All rental state changes go through **one callable function** (`rentalAction`). Clients never write status fields directly.

---

## 2. Firestore collections

### `users/{uid}`
```
fullName, contact, email
roles: ["lender","borrower"]
verified: bool            // set by verifyIdentity only
isAdult: bool
verifiedAt: timestamp
idType: "PhilSys" | "DriversLicense" | "StudentID" | ...
trustScore: number        // starts 3.00, function-written only
ratingCount: number       // function-written only
fcmToken: string
createdAt
```
Client may edit only: `fullName, contact, fcmToken`. Everything else is function-written.

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
- Ranking: score desc, then lender trustScore desc, then distance asc. Drop scores below 0.40. Show top 5.
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
`rentalId, fromUid, toUid, rating (1-5), comment, createdAt`. Unique per (rentalId, fromUid) so a retry cannot double-count.

### `transactionLogs/{logId}`  (append-only, function-written)
`rentalId, actorUid, action, fromStatus, toStatus, at`

### Server-only collections (no client access)
- `uniqueIds/{hash}`: `{ itemId }`. Blocks the same unit being listed twice. Hash = HMAC of `type + normalized value`.
- `idHashes/{hash}`: `{ uid }`. Blocks duplicate ID registration. Hash = HMAC of ID number with a server secret.
- `verifyAttempts/{uid}`: rate limiting for verification.

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
| `rate` | borrower / lender | returned -> completed (when both rated) | Trust score update in a transaction, idempotent. |
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
| `verifyIdentity` | callable | Validate fields, age >= 18, HMAC duplicate check, rate limit, set `verified` claim. Outcomes: verified / rejected(reason) / flagged. |
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

    match /users/{uid} {
      allow read: if signedIn();
      // Allowlist: verified, isAdult, verifiedAt, idType, trustScore, ratingCount are function-written.
      allow create: if isOwner(uid)
        && request.resource.data.keys().hasOnly(['fullName','contact','email','roles','fcmToken','createdAt']);
      allow update: if isOwner(uid) && only(['fullName','contact','fcmToken']);
      allow delete: if false;
    }

    match /items/{itemId} {
      allow read: if verified();
      allow create: if verified()
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
      allow create: if verified()
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
- Client cannot set `verified`, `trustScore`, or `status`.
- Non-participant cannot read a rental, its chat, or its payment proof.
- Borrower cannot read `items/{id}/private/identifiers` before a rental is accepted.
- Two lenders cannot both accept the same request.
- Two borrowers cannot both book the same item (transaction).
- Duplicate IMEI listing is blocked.
- Duplicate ID registration is blocked.
- Overdue flag is set after `coveredUntil`.
- Settlement math: under-use (refund), exact, and over-use (owed).
