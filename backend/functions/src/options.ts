/** Shared by every function. Region matches Firestore (Singapore). maxInstances caps scaling to protect the Blaze bill. */
export const BASE_OPTIONS = { region: 'asia-southeast1', maxInstances: 2 } as const;
