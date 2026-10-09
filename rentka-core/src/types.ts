export type Label = { label: string; confidence: number };
export type GeoPoint = { lat: number; lng: number };

/** What auto-fill proposed from the photo. Saved untouched so edits can be measured later. */
export interface AutofillSuggested {
  description: string;
  category?: string;
  subcategory?: string;
  characteristics: string[];
}

export interface ItemDoc {
  id: string;
  ownerId: string;
  ownerVerified: boolean;
  trustScore: number; // 0..5, used only as a ranking tiebreaker
  // Confirmed by the lender (after any edits). Field score uses these.
  category: string;
  subcategory: string;
  characteristics: string[]; // editable chips, e.g. ['bosch', 'gsb 550', 'cordless']
  description: string;
  dailyRate: number;
  status: 'available' | 'reserved' | 'rented' | 'inactive';
  location: GeoPoint;
  // Raw ML Kit output. Never overwritten by edits. Label score uses this.
  photoLabels: Label[];
  // What auto-fill originally proposed. Never overwritten by edits.
  autofillSuggested?: AutofillSuggested;
}

export interface RequestDoc {
  requesterId: string;
  category: string;
  subcategory: string;
  characteristics: string[];
  description?: string;
  dailyBudget: number;
  location?: GeoPoint; // undefined when location permission is denied
  photoLabels: Label[]; // empty when the borrower added no photo
  autofillSuggested?: AutofillSuggested;
}
