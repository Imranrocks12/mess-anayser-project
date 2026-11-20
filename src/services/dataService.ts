import type {
  Member,
  FoodItem,
  FoodCategory,
  FoodEntry,
  MessBill,
  ExtractedBillItem,
  AuditLog,
  BillingPeriod,
  MealType,
  EntryStatus,
  ReportStatus
} from '../types';
import { roundCurrency, calculateLineTotal } from '../utils/calculations';
import { getStoredFirebaseConfig, uploadDataToCloud } from './firebase';

// Storage keys
const STORAGE_KEYS = {
  MEMBERS: 'messmate_members_v1',
  FOOD_ITEMS: 'messmate_food_items_v1',
  FOOD_ENTRIES: 'messmate_food_entries_v1',
  MESS_BILLS: 'messmate_mess_bills_v1',
  BILLING_PERIODS: 'messmate_billing_periods_v1',
  AUDIT_LOGS: 'messmate_audit_logs_v1',
  FIREBASE_CONFIG: 'messmate_firebase_config_v1',
};

// Default initial datasets (Empty for manual user entry)
const INITIAL_MEMBERS: Member[] = [];
const INITIAL_FOOD_ITEMS: FoodItem[] = [];

// Sample demonstration datasets for testing
const SAMPLE_MEMBERS: Member[] = [
  { id: 'mem_1', name: 'Imran (Admin)', active: true, joinedAt: '2026-09-01', notes: 'Administrator' },
  { id: 'mem_2', name: 'Afik', active: true, joinedAt: '2026-09-01' },
  { id: 'mem_3', name: 'Bilal', active: true, joinedAt: '2026-09-01' },
  { id: 'mem_4', name: 'Dinesh', active: true, joinedAt: '2026-09-01' },
  { id: 'mem_5', name: 'Karthik', active: true, joinedAt: '2026-09-01' },
  { id: 'mem_6', name: 'Naveen', active: true, joinedAt: '2026-09-01' },
  { id: 'mem_7', name: 'Salman', active: true, joinedAt: '2026-09-01' },
];

const SAMPLE_FOOD_ITEMS: FoodItem[] = [
  // Breakfast
  {
    id: 'food_idli',
    name: 'Idli',
    category: 'breakfast',
    defaultUnit: 'piece',
    active: true,
    currentPrice: 10,
    priceHistory: [{ id: 'ph_1', foodItemId: 'food_idli', price: 10, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_dosa',
    name: 'Dosa',
    category: 'breakfast',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 30,
    priceHistory: [{ id: 'ph_2', foodItemId: 'food_dosa', price: 30, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_pongal',
    name: 'Pongal',
    category: 'breakfast',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 35,
    priceHistory: [{ id: 'ph_3', foodItemId: 'food_pongal', price: 35, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_poori',
    name: 'Poori',
    category: 'breakfast',
    defaultUnit: 'set',
    active: true,
    currentPrice: 35,
    priceHistory: [{ id: 'ph_4', foodItemId: 'food_poori', price: 35, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  // Lunch
  {
    id: 'food_meals',
    name: 'Meals',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 70,
    priceHistory: [{ id: 'ph_5', foodItemId: 'food_meals', price: 70, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_curd_rice',
    name: 'Curd rice with soya',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 50,
    priceHistory: [{ id: 'ph_6', foodItemId: 'food_curd_rice', price: 50, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_tomato_biriyani',
    name: 'Tomato biriyani',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 60,
    priceHistory: [{ id: 'ph_7', foodItemId: 'food_tomato_biriyani', price: 60, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_dal_rice',
    name: 'Dal rice',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 50,
    priceHistory: [{ id: 'ph_8', foodItemId: 'food_dal_rice', price: 50, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_puli_sapadu',
    name: 'Puli sapadu',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 50,
    priceHistory: [{ id: 'ph_9', foodItemId: 'food_puli_sapadu', price: 50, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_egg_fried_rice',
    name: 'Egg fried rice',
    category: 'lunch',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 70,
    priceHistory: [{ id: 'ph_10', foodItemId: 'food_egg_fried_rice', price: 70, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  // Dinner
  {
    id: 'food_roti',
    name: 'Roti',
    category: 'dinner',
    defaultUnit: 'piece',
    active: true,
    currentPrice: 15,
    priceHistory: [{ id: 'ph_11', foodItemId: 'food_roti', price: 15, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_paneer',
    name: 'Paneer',
    category: 'dinner',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 30,
    priceHistory: [{ id: 'ph_12', foodItemId: 'food_paneer', price: 30, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_semiya',
    name: 'Semiya with milk',
    category: 'dinner',
    defaultUnit: 'bowl',
    active: true,
    currentPrice: 30,
    priceHistory: [{ id: 'ph_13', foodItemId: 'food_semiya', price: 30, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_pasta',
    name: 'Pasta',
    category: 'dinner',
    defaultUnit: 'plate',
    active: true,
    currentPrice: 40,
    priceHistory: [{ id: 'ph_14', foodItemId: 'food_pasta', price: 40, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  {
    id: 'food_channa_gravy',
    name: 'Channa gravy',
    category: 'dinner',
    defaultUnit: 'cup',
    active: true,
    currentPrice: 25,
    priceHistory: [{ id: 'ph_15', foodItemId: 'food_channa_gravy', price: 25, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
  // Extras
  {
    id: 'food_egg',
    name: 'Egg',
    category: 'extras',
    defaultUnit: 'piece',
    active: true,
    currentPrice: 15,
    priceHistory: [{ id: 'ph_16', foodItemId: 'food_egg', price: 15, validFrom: '2026-09-01', createdAt: '2026-09-01' }],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  },
];

// Seed realistic entries for the week of 2026-10-12
function generateSampleEntries(): FoodEntry[] {
  const entries: FoodEntry[] = [];
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];

  dates.forEach((d) => {
    // 2026-10-12
    // Breakfast: Idli (mem_1, mem_2, mem_3, mem_4, mem_5), Dosa (mem_6), Salman skips (confirmed_no_food)
    entries.push({
      id: `entry_${d}_bf_1`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_1',
      foodItemId: 'food_idli',
      foodNameSnapshot: 'Idli',
      quantity: 3,
      unitPrice: 10,
      lineTotal: 30,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_2`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_2',
      foodItemId: 'food_idli',
      foodNameSnapshot: 'Idli',
      quantity: 2,
      unitPrice: 10,
      lineTotal: 20,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_3`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_3',
      foodItemId: 'food_idli',
      foodNameSnapshot: 'Idli',
      quantity: 2,
      unitPrice: 10,
      lineTotal: 20,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_4`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_4',
      foodItemId: 'food_dosa',
      foodNameSnapshot: 'Dosa',
      quantity: 1,
      unitPrice: 30,
      lineTotal: 30,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_5`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_5',
      foodItemId: 'food_dosa',
      foodNameSnapshot: 'Dosa',
      quantity: 1,
      unitPrice: 30,
      lineTotal: 30,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_6`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_6',
      foodItemId: 'food_pongal',
      foodNameSnapshot: 'Pongal',
      quantity: 1,
      unitPrice: 35,
      lineTotal: 35,
      status: 'completed',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_bf_7`,
      date: d,
      mealType: 'breakfast',
      memberId: 'mem_7',
      foodItemId: 'food_idli',
      foodNameSnapshot: 'Idli (Skipped)',
      quantity: 0,
      unitPrice: 10,
      lineTotal: 0,
      status: 'confirmed_no_food',
      notes: 'Fasting / Skipped breakfast',
      createdAt: `${d}T08:30:00Z`,
      updatedAt: `${d}T08:30:00Z`,
      createdBy: 'Imran'
    });

    // Lunch: Meals + Eggs for multiple members
    entries.push({
      id: `entry_${d}_ln_1`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_1',
      foodItemId: 'food_meals',
      foodNameSnapshot: 'Meals',
      quantity: 1,
      unitPrice: 70,
      lineTotal: 70,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_1_egg`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_1',
      foodItemId: 'food_egg',
      foodNameSnapshot: 'Egg',
      quantity: 2,
      unitPrice: 15,
      lineTotal: 30,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_2`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_2',
      foodItemId: 'food_meals',
      foodNameSnapshot: 'Meals',
      quantity: 1,
      unitPrice: 70,
      lineTotal: 70,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_3`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_3',
      foodItemId: 'food_tomato_biriyani',
      foodNameSnapshot: 'Tomato biriyani',
      quantity: 1,
      unitPrice: 60,
      lineTotal: 60,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_4`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_4',
      foodItemId: 'food_meals',
      foodNameSnapshot: 'Meals',
      quantity: 1,
      unitPrice: 70,
      lineTotal: 70,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_5`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_5',
      foodItemId: 'food_meals',
      foodNameSnapshot: 'Meals',
      quantity: 1,
      unitPrice: 70,
      lineTotal: 70,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_5_egg`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_5',
      foodItemId: 'food_egg',
      foodNameSnapshot: 'Egg',
      quantity: 1,
      unitPrice: 15,
      lineTotal: 15,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_6`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_6',
      foodItemId: 'food_meals',
      foodNameSnapshot: 'Meals',
      quantity: 1,
      unitPrice: 70,
      lineTotal: 70,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });
    entries.push({
      id: `entry_${d}_ln_7`,
      date: d,
      mealType: 'lunch',
      memberId: 'mem_7',
      foodItemId: 'food_tomato_biriyani',
      foodNameSnapshot: 'Tomato biriyani',
      quantity: 1,
      unitPrice: 60,
      lineTotal: 60,
      status: 'completed',
      createdAt: `${d}T13:30:00Z`,
      updatedAt: `${d}T13:30:00Z`,
      createdBy: 'Imran'
    });

    // Dinner: Roti + Paneer
    const rotiMembers = ['mem_1', 'mem_2', 'mem_3', 'mem_4', 'mem_5', 'mem_6', 'mem_7'];
    rotiMembers.forEach((mId, idx) => {
      const rotiQty = idx % 2 === 0 ? 3 : 4;
      entries.push({
        id: `entry_${d}_dn_roti_${mId}`,
        date: d,
        mealType: 'dinner',
        memberId: mId,
        foodItemId: 'food_roti',
        foodNameSnapshot: 'Roti',
        quantity: rotiQty,
        unitPrice: 15,
        lineTotal: calculateLineTotal(rotiQty, 15),
        status: 'completed',
        createdAt: `${d}T20:30:00Z`,
        updatedAt: `${d}T20:30:00Z`,
        createdBy: 'Imran'
      });
      // Paneer for some members
      if (idx < 5) {
        entries.push({
          id: `entry_${d}_dn_paneer_${mId}`,
          date: d,
          mealType: 'dinner',
          memberId: mId,
          foodItemId: 'food_paneer',
          foodNameSnapshot: 'Paneer',
          quantity: 1,
          unitPrice: 30,
          lineTotal: 30,
          status: 'completed',
          createdAt: `${d}T20:30:00Z`,
          updatedAt: `${d}T20:30:00Z`,
          createdBy: 'Imran'
        });
      }
    });
  });

  return entries;
}

const INITIAL_MESS_BILLS: MessBill[] = [];
const INITIAL_BILLING_PERIODS: BillingPeriod[] = [];
const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Sample Mess Bill for testing
const SAMPLE_MESS_BILLS: MessBill[] = [
  {
    id: 'bill_oct_12_week',
    periodStart: '2026-10-12',
    periodEnd: '2026-10-18',
    sourceType: 'whatsapp',
    originalMessage: `Lunch food:
- Meals: 25 × ₹70 = ₹1750
- Tomato biriyani: 10 × ₹60 = ₹600
- Egg: 15 × ₹15 = ₹225

Dinner food:
- Roti: 120 × ₹15 = ₹1800
- Paneer: 25 × ₹30 = ₹750

Breakfast food:
- Idli: 35 × ₹10 = ₹350
- Dosa: 10 × ₹30 = ₹300
- Pongal: 5 × ₹35 = ₹175

Grand total: ₹5,950`,
    reportedBreakfastTotal: 825,
    reportedLunchTotal: 2575,
    reportedDinnerTotal: 2550,
    reportedGrandTotal: 5950,
    importStatus: 'verified',
    reconciliationStatus: 'reconciled',
    items: [
      { id: 'item_1', foodName: 'Meals', quantity: 25, unitPrice: 70, lineTotal: 1750, mealType: 'lunch' },
      { id: 'item_2', foodName: 'Tomato biriyani', quantity: 10, unitPrice: 60, lineTotal: 600, mealType: 'lunch' },
      { id: 'item_3', foodName: 'Egg', quantity: 15, unitPrice: 15, lineTotal: 225, mealType: 'lunch' },
      { id: 'item_4', foodName: 'Roti', quantity: 120, unitPrice: 15, lineTotal: 1800, mealType: 'dinner' },
      { id: 'item_5', foodName: 'Paneer', quantity: 25, unitPrice: 30, lineTotal: 750, mealType: 'dinner' },
      { id: 'item_6', foodName: 'Idli', quantity: 35, unitPrice: 10, lineTotal: 350, mealType: 'breakfast' },
      { id: 'item_7', foodName: 'Dosa', quantity: 10, unitPrice: 30, lineTotal: 300, mealType: 'breakfast' },
      { id: 'item_8', foodName: 'Pongal', quantity: 5, unitPrice: 35, lineTotal: 175, mealType: 'breakfast' },
    ],
    notes: 'Imported from in-charge WhatsApp message on Sunday night.',
    createdAt: '2026-10-18T21:00:00Z',
    createdBy: 'Imran'
  }
];

const SAMPLE_BILLING_PERIODS: BillingPeriod[] = [
  {
    id: 'bp_2026_w42',
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    reportingType: 'weekly',
    calculatedBreakfastTotal: 825,
    calculatedLunchTotal: 2575,
    calculatedDinnerTotal: 2550,
    calculatedGrandTotal: 5950,
    reportedMessBillTotal: 5950,
    difference: 0,
    status: 'reconciled',
    finalizedAt: '2026-10-18T22:00:00Z',
    finalizedBy: 'Imran',
    notes: 'Weekly reconciliation verified without discrepancies.'
  }
];

const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_1',
    entityType: 'messBill',
    entityId: 'bill_oct_12_week',
    action: 'create',
    timestamp: '2026-10-18T21:05:00Z',
    performedBy: 'Imran',
    reason: 'Imported WhatsApp bill for week 12-18 Oct'
  },
  {
    id: 'audit_2',
    entityType: 'billingPeriod',
    entityId: 'bp_2026_w42',
    action: 'reconcile',
    timestamp: '2026-10-18T22:00:00Z',
    performedBy: 'Imran',
    reason: 'Verified matched recorded totals against reported bill'
  }
];

class DataService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private autoSyncTimeout: any = null;

  public triggerAutoCloudSync() {
    if (this.autoSyncTimeout) {
      clearTimeout(this.autoSyncTimeout);
    }
    this.autoSyncTimeout = setTimeout(async () => {
      try {
        const config = getStoredFirebaseConfig();
        if (config && config.apiKey && config.projectId) {
          const members = this.getMembers();
          const entries = this.getFoodEntries();
          const bills = this.getMessBills();
          // Safety guard: never overwrite cloud database if local data is completely empty
          if (members.length === 0 && entries.length === 0 && bills.length === 0) {
            return;
          }
          const backupJson = this.exportBackupJson();
          await uploadDataToCloud(JSON.parse(backupJson));
          console.log('[MessMate Cloud] Changes automatically synced to Firebase Firestore');
        }
      } catch (e) {
        console.warn('[MessMate Cloud] Auto-sync to Firebase failed:', e);
      }
    }, 1500);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in DataService listener', e);
      }
    });
    this.triggerAutoCloudSync();
  }

  private ensureInitialized() {
    // Keep local data safe; do not wipe on fresh startup
  }

  // --------------------------------------------------------------------------
  // MEMBERS
  // --------------------------------------------------------------------------
  public getMembers(): Member[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return data ? JSON.parse(data) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  }

  public saveMember(name: string, notes?: string): Member {
    const members = this.getMembers();
    const newMember: Member = {
      id: `mem_${Date.now()}`,
      name: name.trim(),
      active: true,
      joinedAt: new Date().toISOString().split('T')[0],
      notes,
    };
    members.push(newMember);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this.logAction('member', newMember.id, 'create', undefined, newMember, `Added member ${newMember.name}`);
    this.notify();
    return newMember;
  }

  public updateMember(id: string, updates: Partial<Member>): Member | null {
    const members = this.getMembers();
    const idx = members.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    const before = { ...members[idx] };
    members[idx] = { ...members[idx], ...updates };
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this.logAction('member', id, 'update', before, members[idx], `Updated member ${members[idx].name}`);
    this.notify();
    return members[idx];
  }

  public toggleMemberStatus(id: string): Member | null {
    const member = this.getMembers().find((m) => m.id === id);
    if (!member) return null;
    const nowActive = !member.active;
    return this.updateMember(id, {
      active: nowActive,
      leftAt: nowActive ? undefined : new Date().toISOString().split('T')[0],
    });
  }

  public deleteMember(id: string): boolean {
    const members = this.getMembers();
    const idx = members.findIndex((m) => m.id === id);
    if (idx === -1) return false;

    const before = members[idx];
    members.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this.logAction('member', id, 'delete', before, undefined, `Deleted member ${before.name}`);
    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // FOOD ITEMS & PRICING
  // --------------------------------------------------------------------------
  public getFoodItems(): FoodItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOOD_ITEMS);
      return data ? JSON.parse(data) : INITIAL_FOOD_ITEMS;
    } catch {
      return INITIAL_FOOD_ITEMS;
    }
  }

  public saveFoodItem(item: Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'>): FoodItem {
    const items = this.getFoodItems();
    const now = new Date().toISOString();
    const id = `food_${Date.now()}`;
    const newItem: FoodItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
      priceHistory: [
        {
          id: `ph_${Date.now()}`,
          foodItemId: id,
          price: item.currentPrice,
          validFrom: now.split('T')[0],
          createdAt: now,
        },
      ],
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
    this.logAction('foodItem', id, 'create', undefined, newItem, `Added food item ${newItem.name}`);
    this.notify();
    return newItem;
  }

  public updateFoodItem(id: string, updates: Partial<FoodItem>): FoodItem | null {
    const items = this.getFoodItems();
    const idx = items.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const before = { ...items[idx] };
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
    this.logAction('foodItem', id, 'update', before, items[idx], `Updated food item ${items[idx].name}`);
    this.notify();
    return items[idx];
  }

  /**
   * Updates price while preserving historical price records and effective dates
   */
  public updateFoodItemPrice(id: string, newPrice: number, effectiveFromDate?: string): FoodItem | null {
    const items = this.getFoodItems();
    const idx = items.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const item = items[idx];
    const before = { ...item };
    const validFrom = effectiveFromDate || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Close out previous active price history
    const updatedHistory = item.priceHistory.map((ph) => {
      if (!ph.validTo) {
        return { ...ph, validTo: validFrom };
      }
      return ph;
    });

    updatedHistory.push({
      id: `ph_${Date.now()}`,
      foodItemId: id,
      price: newPrice,
      validFrom,
      createdAt: now,
    });

    items[idx] = {
      ...item,
      currentPrice: newPrice,
      priceHistory: updatedHistory,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
    this.logAction(
      'foodItem',
      id,
      'update',
      before,
      items[idx],
      `Changed price of ${item.name} from ₹${before.currentPrice} to ₹${newPrice} effective from ${validFrom}`
    );
    this.notify();
    return items[idx];
  }

  public deleteFoodItem(id: string): boolean {
    const items = this.getFoodItems();
    const idx = items.findIndex((f) => f.id === id);
    if (idx === -1) return false;

    const before = items[idx];
    items.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
    this.logAction('foodItem', id, 'delete', before, undefined, `Deleted food item ${before?.name || id}`);
    this.notify();
    return true;
  }

  /**
   * Clears all food items for starting a fresh week
   */
  public clearAllFoodItems(reason?: string): void {
    const before = this.getFoodItems();
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify([]));
    this.logAction('foodItem', 'all', 'delete', before, undefined, reason || 'Cleared all menu items for new week');
    this.notify();
  }

  /**
   * Clears all daily food entries
   */
  public clearFoodEntries(reason?: string): void {
    const before = this.getFoodEntries();
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify([]));
    this.logAction('foodEntry', 'all', 'delete', before, undefined, reason || 'Cleared all food entries');
    this.notify();
  }

  /**
   * Automatically adds/updates food items, categories, and prices from mess bill line items
   */
  public syncFoodItemsFromMessBill(items: ExtractedBillItem[]): number {
    if (!items || !Array.isArray(items) || items.length === 0) return 0;

    try {
      const currentFoodItems = this.getFoodItems();
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      let addedOrUpdatedCount = 0;

      items.forEach((item, idx) => {
        const cleanName = (item.foodName || '').trim();
        if (!cleanName) return;

        const unitPrice =
          item.unitPrice && item.unitPrice > 0
            ? item.unitPrice
            : item.quantity && item.quantity > 0
            ? Math.round(item.lineTotal / item.quantity)
            : 0;
        const category: FoodCategory = (item.mealType as FoodCategory) || 'lunch';

        const existingIdx = currentFoodItems.findIndex(
          (f) => (f.name || '').toLowerCase().trim() === cleanName.toLowerCase()
        );

        if (existingIdx === -1) {
          const foodId = `food_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
          const newItem: FoodItem = {
            id: foodId,
            name: cleanName,
            category,
            defaultUnit: 'plate',
            active: true,
            currentPrice: unitPrice,
            priceHistory: [
              {
                id: `ph_${Date.now()}_${idx}`,
                foodItemId: foodId,
                price: unitPrice,
                validFrom: today,
                createdAt: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
          currentFoodItems.push(newItem);
          addedOrUpdatedCount++;
        } else {
          const existing = currentFoodItems[existingIdx];
          let hasChange = false;
          if (!existing.active) {
            existing.active = true;
            hasChange = true;
          }
          if (unitPrice > 0 && existing.currentPrice !== unitPrice) {
            existing.currentPrice = unitPrice;
            existing.priceHistory = existing.priceHistory || [];
            existing.priceHistory.push({
              id: `ph_${Date.now()}_${idx}`,
              foodItemId: existing.id,
              price: unitPrice,
              validFrom: today,
              createdAt: now,
            });
            hasChange = true;
          }
          if (hasChange) {
            existing.updatedAt = now;
            addedOrUpdatedCount++;
          }
        }
      });

      if (addedOrUpdatedCount > 0) {
        localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(currentFoodItems));
        this.logAction(
          'foodItem',
          'bulk',
          'create',
          undefined,
          undefined,
          `Auto-synced ${addedOrUpdatedCount} food items from mess bill import`
        );
        this.notify();
      }

      return addedOrUpdatedCount;
    } catch (e) {
      console.error('Error in syncFoodItemsFromMessBill', e);
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // DAILY FOOD ENTRIES
  // --------------------------------------------------------------------------
  public getFoodEntries(filterDate?: string): FoodEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOOD_ENTRIES);
      const entries: FoodEntry[] = data ? JSON.parse(data) : [];
      if (filterDate) {
        return entries.filter((e) => e.date === filterDate);
      }
      return entries;
    } catch {
      return [];
    }
  }

  public saveFoodEntry(entry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt' | 'lineTotal'>): FoodEntry {
    const entries = this.getFoodEntries();
    const now = new Date().toISOString();
    const lineTotal = entry.status === 'confirmed_no_food' ? 0 : calculateLineTotal(entry.quantity, entry.unitPrice);

    const newEntry: FoodEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lineTotal,
      createdAt: now,
      updatedAt: now,
    };

    entries.push(newEntry);
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(entries));
    this.logAction('foodEntry', newEntry.id, 'create', undefined, newEntry, `Recorded ${newEntry.foodNameSnapshot} for ${entry.memberId}`);
    this.notify();
    return newEntry;
  }

  public updateFoodEntry(id: string, updates: Partial<FoodEntry>, editReason?: string): FoodEntry | null {
    const entries = this.getFoodEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const before = { ...entries[idx] };
    const merged = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() };
    
    // Recalculate line total safely
    if (merged.status === 'confirmed_no_food') {
      merged.lineTotal = 0;
      merged.quantity = 0;
    } else {
      merged.lineTotal = calculateLineTotal(merged.quantity, merged.unitPrice);
    }

    entries[idx] = merged;
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(entries));
    this.logAction('foodEntry', id, 'update', before, merged, editReason || 'Edited food entry');
    this.notify();
    return merged;
  }

  public deleteFoodEntry(id: string, reason?: string): boolean {
    const entries = this.getFoodEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const before = entries[idx];
    entries.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(entries));
    this.logAction('foodEntry', id, 'delete', before, undefined, reason || 'Deleted food entry');
    this.notify();
    return true;
  }

  /**
   * Set confirmed skipped meal (₹0) for a member
   */
  public markMemberSkippedMeal(date: string, mealType: MealType, memberId: string, memberName: string): FoodEntry {
    // Check if an entry already exists for this member and meal
    const entries = this.getFoodEntries(date);
    const existing = entries.find((e) => e.memberId === memberId && e.mealType === mealType);

    if (existing) {
      return this.updateFoodEntry(existing.id, {
        status: 'confirmed_no_food',
        quantity: 0,
        lineTotal: 0,
        notes: 'Confirmed skipped meal',
      }, 'Marked as skipped meal')!;
    }

    return this.saveFoodEntry({
      date,
      mealType,
      memberId,
      foodItemId: 'skipped',
      foodNameSnapshot: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} (Skipped)`,
      quantity: 0,
      unitPrice: 0,
      status: 'confirmed_no_food',
      notes: 'Confirmed skipped meal',
      createdBy: 'Admin',
    });
  }

  /**
   * Copies previous day's food structure as DRAFT into target date.
   * Admin reviews and confirms before final submission.
   */
  public copyPreviousDayDraft(sourceDate: string, targetDate: string, mealType?: MealType): FoodEntry[] {
    const sourceEntries = this.getFoodEntries(sourceDate).filter((e) =>
      mealType ? e.mealType === mealType : true
    );
    const existingTarget = this.getFoodEntries(targetDate);
    const now = new Date().toISOString();
    const copied: FoodEntry[] = [];

    sourceEntries.forEach((src) => {
      // Prevent duplicate if already exists for same member + food + meal
      const duplicate = existingTarget.some(
        (t) =>
          t.mealType === src.mealType &&
          t.memberId === src.memberId &&
          t.foodItemId === src.foodItemId
      );

      if (!duplicate) {
        copied.push({
          ...src,
          id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: targetDate,
          status: 'in_progress', // Set as in_progress for admin review!
          notes: `Copied draft from ${sourceDate}`,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    if (copied.length > 0) {
      const allEntries = this.getFoodEntries();
      const combined = [...allEntries, ...copied];
      localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(combined));
      this.logAction(
        'foodEntry',
        targetDate,
        'create',
        undefined,
        { copiedCount: copied.length },
        `Copied ${copied.length} draft entries from ${sourceDate} to ${targetDate}`
      );
      this.notify();
    }

    return copied;
  }

  // --------------------------------------------------------------------------
  // MESS BILLS & IMPORTS
  // --------------------------------------------------------------------------
  public getMessBills(): MessBill[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESS_BILLS);
      return data ? JSON.parse(data) : INITIAL_MESS_BILLS;
    } catch {
      return INITIAL_MESS_BILLS;
    }
  }

  public saveMessBill(bill: Omit<MessBill, 'id' | 'createdAt'>): MessBill {
    const bills = this.getMessBills();
    const id = `bill_${Date.now()}`;
    const newBill: MessBill = {
      ...bill,
      id,
      createdAt: new Date().toISOString(),
    };
    bills.push(newBill);
    localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify(bills));

    // Automatically upsert Billing Period so reported mess bill section reflects immediately!
    try {
      const periodId = `bp_${newBill.periodStart}_${newBill.periodEnd}`;
      const periods = this.getBillingPeriods();
      const existingBp = periods.find(p => p.id === periodId || (p.startDate === newBill.periodStart && p.endDate === newBill.periodEnd));
      if (existingBp) {
        this.saveBillingPeriod({
          ...existingBp,
          reportedMessBillTotal: newBill.reportedGrandTotal,
          difference: roundCurrency(newBill.reportedGrandTotal - (existingBp.calculatedGrandTotal || 0)),
        });
      } else {
        this.saveBillingPeriod({
          id: periodId,
          startDate: newBill.periodStart,
          endDate: newBill.periodEnd,
          reportingType: 'custom',
          calculatedBreakfastTotal: 0,
          calculatedLunchTotal: 0,
          calculatedDinnerTotal: 0,
          calculatedGrandTotal: 0,
          reportedMessBillTotal: newBill.reportedGrandTotal,
          difference: newBill.reportedGrandTotal,
          status: 'draft',
          notes: newBill.notes || 'Imported Mess Bill',
        });
      }
    } catch (bpErr) {
      console.warn('Could not sync billing period for new bill', bpErr);
    }

    // Automatically add extracted food items, categories, and prices to Menu & Prices
    try {
      if (newBill.items && newBill.items.length > 0) {
        this.syncFoodItemsFromMessBill(newBill.items);
      }
    } catch (itemErr) {
      console.warn('Could not auto-sync food items for new bill', itemErr);
    }

    this.logAction('messBill', id, 'create', undefined, newBill, `Saved mess bill for period ${bill.periodStart} to ${bill.periodEnd}`);
    this.notify();
    return newBill;
  }

  public updateMessBill(id: string, updates: Partial<MessBill>): MessBill | null {
    const bills = this.getMessBills();
    const idx = bills.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    const before = { ...bills[idx] };
    bills[idx] = { ...bills[idx], ...updates };
    localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify(bills));

    const updated = bills[idx];

    // Automatically sync updated food items to Menu & Prices
    try {
      if (updated.items && updated.items.length > 0) {
        this.syncFoodItemsFromMessBill(updated.items);
      }
    } catch (itemErr) {
      console.warn('Could not auto-sync food items for updated bill', itemErr);
    }

    // Synchronize matching billing period
    try {
      const periods = this.getBillingPeriods();
      const bp = periods.find(p => (p.startDate === updated.periodStart && p.endDate === updated.periodEnd) || (p.startDate === before.periodStart && p.endDate === before.periodEnd));
      if (bp) {
        this.saveBillingPeriod({
          ...bp,
          startDate: updated.periodStart,
          endDate: updated.periodEnd,
          reportedMessBillTotal: updated.reportedGrandTotal,
          difference: roundCurrency(updated.reportedGrandTotal - (bp.calculatedGrandTotal || 0)),
        });
      }
    } catch (bpErr) {
      console.warn('Could not sync billing period for updated bill', bpErr);
    }

    this.logAction('messBill', id, 'update', before, bills[idx], `Updated mess bill for period ${bills[idx].periodStart} to ${bills[idx].periodEnd}`);
    this.notify();
    return bills[idx];
  }

  public deleteMessBill(id: string): boolean {
    const bills = this.getMessBills();
    const idx = bills.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    const before = bills[idx];
    bills.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify(bills));

    // Clear reportedMessBillTotal from matching billing period
    const periods = this.getBillingPeriods();
    const bp = periods.find(p => p.startDate === before.periodStart && p.endDate === before.periodEnd);
    if (bp) {
      this.saveBillingPeriod({
        ...bp,
        reportedMessBillTotal: 0,
        difference: roundCurrency(-bp.calculatedGrandTotal),
      });
    }

    this.logAction('messBill', id, 'delete', before, undefined, `Deleted mess bill for ${before.periodStart} to ${before.periodEnd}`);
    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // BILLING PERIODS & RECONCILIATION
  // --------------------------------------------------------------------------
  public getBillingPeriods(): BillingPeriod[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BILLING_PERIODS);
      return data ? JSON.parse(data) : INITIAL_BILLING_PERIODS;
    } catch {
      return INITIAL_BILLING_PERIODS;
    }
  }

  public saveBillingPeriod(period: BillingPeriod): BillingPeriod {
    const periods = this.getBillingPeriods();
    const idx = periods.findIndex((p) => p.id === period.id);
    if (idx >= 0) {
      periods[idx] = period;
    } else {
      periods.push(period);
    }
    localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(periods));
    this.logAction('billingPeriod', period.id, 'reconcile', undefined, period, `Saved billing period reconciliation (${period.status})`);
    this.notify();
    return period;
  }

  public finalizeBillingPeriod(periodId: string, adminName: string): BillingPeriod | null {
    const periods = this.getBillingPeriods();
    const idx = periods.findIndex((p) => p.id === periodId);
    if (idx === -1) return null;

    const before = { ...periods[idx] };
    periods[idx].status = 'finalized';
    periods[idx].finalizedAt = new Date().toISOString();
    periods[idx].finalizedBy = adminName;

    localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(periods));
    this.logAction('billingPeriod', periodId, 'finalize', before, periods[idx], `Finalized billing period ${periodId} by ${adminName}`);
    this.notify();
    return periods[idx];
  }

  public reopenBillingPeriod(periodId: string, reason: string): BillingPeriod | null {
    const periods = this.getBillingPeriods();
    const idx = periods.findIndex((p) => p.id === periodId);
    if (idx === -1) return null;

    const before = { ...periods[idx] };
    periods[idx].status = 'needs_review';
    periods[idx].finalizedAt = undefined;

    localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(periods));
    this.logAction('billingPeriod', periodId, 'update', before, periods[idx], `Reopened finalized billing period. Reason: ${reason}`);
    this.notify();
    return periods[idx];
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------
  public getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  public logAction(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    beforeValues?: any,
    afterValues?: any,
    reason?: string
  ): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entityType,
      entityId,
      action,
      beforeValues,
      afterValues,
      reason,
      timestamp: new Date().toISOString(),
      performedBy: 'Imran (Admin)',
    };
    logs.unshift(newLog); // latest first
    // keep max 500 logs
    if (logs.length > 500) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    return newLog;
  }

  // --------------------------------------------------------------------------
  // RESET, BACKUP & RESTORE
  // --------------------------------------------------------------------------
  public resetToSampleData(): void {
    const sampleEntries = generateSampleEntries();
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(SAMPLE_MEMBERS));
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(SAMPLE_FOOD_ITEMS));
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(sampleEntries));
    localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify(SAMPLE_MESS_BILLS));
    localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(SAMPLE_BILLING_PERIODS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SAMPLE_AUDIT_LOGS));
    this.notify();
  }

  public clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    this.notify();
  }

  public exportBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      members: this.getMembers(),
      foodItems: this.getFoodItems(),
      foodEntries: this.getFoodEntries(),
      messBills: this.getMessBills(),
      billingPeriods: this.getBillingPeriods(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.members || !data.foodItems) {
        throw new Error('Invalid MessMate backup JSON format');
      }
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(data.members));
      localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(data.foodItems));
      localStorage.setItem(STORAGE_KEYS.FOOD_ENTRIES, JSON.stringify(data.foodEntries || []));
      localStorage.setItem(STORAGE_KEYS.MESS_BILLS, JSON.stringify(data.messBills || []));
      localStorage.setItem(STORAGE_KEYS.BILLING_PERIODS, JSON.stringify(data.billingPeriods || []));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs || []));
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON', e);
      return false;
    }
  }
}

export const dataService = new DataService();
