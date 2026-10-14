import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { sendEmailCode, verifyEmailCode } from './emailCode';
export { verifyIdentity } from './verifyIdentity';

// Functions still to add (docs/data-model-and-rules.md, section 5):
// - onItemCreate     (Firestore onCreate items)
// - onRequestCreate  (Firestore onCreate requests)
// - rentalAction     (callable, the rental state machine)
// - depositReminders (scheduled daily)
