import { defineSecret } from 'firebase-functions/params';

/** Keys the ID hash and the email-code hash. Stored only in Firebase Secret Manager. */
export const ID_HMAC_SECRET = defineSecret('ID_HMAC_SECRET');

/** App password of the dedicated Gmail account that sends the email codes. Set by the team, never printed. */
export const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
