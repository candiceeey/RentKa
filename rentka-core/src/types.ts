export type Label = { label: string; confidence: number };
export type GeoPoint = { lat: number; lng: number };

export interface ItemDoc {
  id: string;
  category: string;
  subcategory: string;
  characteristics: string[]; // keyword list, e.g. ['cordless', '18v']
  dailyRate: number;
  status: 'available' | 'rented' | 'inactive';
  location: GeoPoint;
  aiLabels: Label[];
}

export interface RequestDoc {
  category: string;
  subcategory: string;
  characteristics: string[];
  dailyBudget: number;
  location: GeoPoint;
  aiLabels: Label[]; // empty when the borrower added no photo
}
