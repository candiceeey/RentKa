import { createTransport } from 'nodemailer';

import { EMAIL_CODE_TTL_MINUTES } from './core/emailCode';
import { GMAIL_APP_PASSWORD } from './secrets';

/** The dedicated Gmail account that sends RentKa email codes. */
export const SENDER_ADDRESS = 'rentkabxu@gmail.com';

/** Sends the 6-digit code. The email contains only the code and how long it is valid. */
export async function sendCodeEmail(to: string, code: string): Promise<void> {
  const transport = createTransport({
    service: 'gmail',
    auth: { user: SENDER_ADDRESS, pass: GMAIL_APP_PASSWORD.value() },
  });
  await transport.sendMail({
    from: `RentKa <${SENDER_ADDRESS}>`,
    to,
    subject: `Your RentKa code: ${code}`,
    text:
      `Your RentKa verification code is ${code}.\n\n` +
      `It expires in ${EMAIL_CODE_TTL_MINUTES} minutes. If you did not create a RentKa account, ignore this email.`,
  });
}
