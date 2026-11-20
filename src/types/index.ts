export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'extras';

export type EntryStatus = 'not_recorded' | 'in_progress' | 'confirmed_no_food' | 'completed';

export type ReportStatus = 'draft' | 'needs_review' | 'reconciled' | 'finalized';

export type BillSourceType = 'whatsapp' | 'manual' | 'pdf' | 'image_ocr';

export interface Member {
  id: string;
  name: string;
  active: boolean;
  joinedAt: string;
  leftAt?: string;
  notes?: string;
}

export interface PriceHistoryEntry {
  id: string;
  foodItemId: string;
  price: number;
  validFrom: string; // ISO date
  validTo?: string; // ISO date
  createdAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  defaultUnit: string;
  active: boolean;
  currentPrice: number;
  priceHistory: PriceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  billingPeriodId?: string;
  mealType: MealType;
  memberId: string;
  foodItemId: string;
  foodNameSnapshot: string;
  quantity: number;
  unitPrice: number; // Historical unit price snapshot
  lineTotal: number; // Safe rounded quantity * unitPrice
  status: EntryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ExtractedBillItem {
  id: string;
  foodName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  mealType?: MealType;
  confidence?: number;
  matchedFoodItemId?: string;
  needsReview?: boolean;
}

export interface MessBill {
  id: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  sourceType: BillSourceType;
  originalMessage: string;
  reportedBreakfastTotal?: number;
  reportedLunchTotal?: number;
  reportedDinnerTotal?: number;
  reportedGrandTotal: number;
  attachmentName?: string;
  importStatus: 'draft' | 'verified';
  reconciliationStatus: ReportStatus;
  items?: ExtractedBillItem[];
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  entityType: 'foodEntry' | 'messBill' | 'member' | 'foodItem' | 'billingPeriod';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'reconcile' | 'finalize';
  beforeValues?: Record<string, any>;
  afterValues?: Record<string, any>;
  reason?: string;
  timestamp: string;
  performedBy: string;
}

export interface BillingPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reportingType: 'weekly' | 'monthly' | 'custom';
  calculatedBreakfastTotal: number;
  calculatedLunchTotal: number;
  calculatedDinnerTotal: number;
  calculatedGrandTotal: number;
  reportedMessBillTotal: number;
  difference: number;
  status: ReportStatus;
  finalizedAt?: string;
  finalizedBy?: string;
  notes?: string;
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  breakfastTotal: number;
  lunchTotal: number;
  dinnerTotal: number;
  grandTotal: number;
  recordedMealsCount: number;
  confirmedSkippedCount: number;
  itemBreakdown: Array<{
    foodName: string;
    quantity: number;
    amount: number;
  }>;
}

export interface DailySummary {
  date: string;
  breakfastTotal: number;
  lunchTotal: number;
  dinnerTotal: number;
  dailyTotal: number;
  completionStatus: 'complete' | 'partial' | 'empty';
  membersRecorded: number;
}

export interface FoodSummary {
  foodItemId: string;
  foodName: string;
  category: string;
  totalQuantity: number;
  unitPrice: number;
  totalCost: number;
  uniqueConsumersCount: number;
  mealBreakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

export interface GroupPeriodReport {
  startDate: string;
  endDate: string;
  reportingType: 'weekly' | 'monthly' | 'custom';
  status: ReportStatus;
  activeMembersCount: number;
  completedDaysCount: number;
  incompleteDaysCount: number;
  calculatedBreakfastTotal: number;
  calculatedLunchTotal: number;
  calculatedDinnerTotal: number;
  calculatedGrandTotal: number;
  reportedMessBillTotal: number;
  discrepancy: number; // reportedMessBillTotal - calculatedGrandTotal
  memberSummaries: MemberSummary[];
  dailySummaries: DailySummary[];
  foodSummaries: FoodSummary[];
  messBills: MessBill[];
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
