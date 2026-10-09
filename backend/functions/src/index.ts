import { setGlobalOptions } from 'firebase-functions/v2';

// Region matches Firestore (Singapore). maxInstances caps scaling to protect the Blaze bill.
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 2 });

// Functions to add (docs/data-model-and-rules.md, section 5):
// - verifyIdentity   (callable)
// - onItemCreate     (Firestore onCreate items)
// - onRequestCreate  (Firestore onCreate requests)
// - rentalAction     (callable, the rental state machine)
// - depositReminders (scheduled daily)
