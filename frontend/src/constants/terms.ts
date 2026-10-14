/**
 * RentKa Terms and Conditions and Privacy Notice, shown on the Terms screen and agreed to at registration.
 * Edit the wording here only. Change LAST_UPDATED whenever the text changes.
 */

export type TermsSection = {
  title: string;
  /** Plain paragraphs, shown before any bullets. */
  paragraphs?: string[];
  bullets?: string[];
};

export const TERMS_TITLE = 'RENTKA TERMS AND CONDITIONS AND PRIVACY NOTICE';

export const TERMS_LAST_UPDATED = 'October 14, 2026';

export const TERMS_CONTACT = 'rentkabxu@gmail.com';

export const TERMS_INTRO =
  'RentKa is a mobile application designed to help people in Butuan City lend and rent items. It is a capstone project developed by two students from the BSIT Program of the College of Computing and Information Sciences (CCIS) at Caraga State University (CSU) for academic testing and evaluation. By checking this box, you acknowledge and agree to the following terms and conditions.';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. WHAT RENTKA DOES',
    paragraphs: [
      'RentKa connects lenders and borrowers, suggests matching items, and records rental details such as the daily rate, deposit amount, dates and statuses. RentKa is a platform only. It is not a party to any rental between users.',
    ],
  },
  {
    title: '2. YOUR ACCOUNT',
    bullets: [
      'You must be at least 18 years old.',
      'Give accurate information and keep your login private.',
      'One person, one account. You may choose to be a lender, a borrower or both.',
      'You must complete ID verification before you can post items or requests.',
    ],
  },
  {
    title: '3. ID VERIFICATION AND YOUR PRIVACY',
    bullets: [
      'RentKa does not store your ID photo, ID number or birthdate.',
      'These details are used only for a one-time check of your age, ID format and name during verification.',
      'What we keep: your verified status, whether you are an adult, the time of verification, and a coded value (a hash) that cannot be turned back into your ID. It is used only to stop one ID from being registered to several accounts.',
      "RentKa does not compare your face to your ID. Verification confirms that your details look valid. It does not guarantee that you are who you say you are, so always check the other person's ID in person at handoff.",
    ],
  },
  {
    title: '4. OTHER INFORMATION WE STORE',
    paragraphs: [
      'Your name, email, mobile number, roles, ratings, item and request details, item photos, payment proof and condition photos, chat messages, and the location you give for matching. We use it only to run the app, show matches, handle rentals and disputes, and for the study. Item photos are analyzed on your phone to suggest a description. You can edit everything it suggests.',
    ],
  },
  {
    title: '5. LISTING AND RENTING',
    bullets: [
      'Lenders must own the item or have the right to lend it, describe it honestly, and provide its unique identifier (such as an IMEI or serial number).',
      'Prohibited items: anything illegal, stolen, dangerous or unsafe to lend.',
      'An item is hidden from listings while it is reserved or rented, until it is returned.',
    ],
  },
  {
    title: '6. DEPOSIT, PAYMENT AND RETURN',
    bullets: [
      'Payment is made directly between users, outside RentKa. RentKa only records amounts and statuses.',
      'The deposit is the daily rate x 7 and covers up to 7 days. The rental can be open-ended. The final cost is days used x the daily rate, applied against the deposit. Any remaining balance is returned to the borrower, and any amount owed is settled between the users.',
      'Borrowers return the item in the condition received, apart from normal use. Both users should take photos at handoff and return.',
      'Meet in a safe, public place when possible.',
    ],
  },
  {
    title: '7. RATINGS AND CONDUCT',
    bullets: [
      'After a rental, each user can rate the other. Ratings are kept separately for your lender and borrower roles.',
      'Do not harass, deceive or misuse other users or the app. Accounts may be limited or removed for abuse.',
    ],
  },
  {
    title: '8. DISPUTES',
    paragraphs: [
      'Report problems through the app. RentKa may review the records (photos, chats, statuses) to help, but cannot guarantee a result or recover payments or items.',
    ],
  },
  {
    title: '9. NO WARRANTY AND LIMITATION',
    paragraphs: [
      'RentKa is a prototype provided as is. The team is not responsible for losses, damage, theft or disputes between users, or for app downtime, to the extent allowed by law.',
    ],
  },
  {
    title: '10. DATA PRIVACY RIGHTS',
    paragraphs: [
      `We handle your data in line with the Data Privacy Act of 2012 (RA 10173). You may ask to see, correct or delete your data, or withdraw from the study, by contacting ${TERMS_CONTACT}. Data may be used in anonymized form in the study's results.`,
    ],
  },
  {
    title: '11. CHANGES',
    paragraphs: ['We may update these terms. Continued use means you accept the changes.'],
  },
];
