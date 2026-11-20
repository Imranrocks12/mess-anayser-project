import type { 
  FoodEntry, 
  Member, 
  MessBill, 
  BillingPeriod, 
  GroupPeriodReport, 
  MemberSummary, 
  DailySummary, 
  FoodSummary,
  ReportStatus 
} from '../types';

/**
 * Currency rounding helper avoiding float drift.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Line total calculation: quantity * unitPrice with safe 2-decimal precision.
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (isNaN(quantity) || isNaN(unitPrice) || quantity <= 0 || unitPrice <= 0) return 0;
  return roundCurrency(quantity * unitPrice);
}

/**
 * Indian Rupee formatting with currency symbol
 */
export function formatCurrency(amount: number, includeDecimals = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const rounded = roundCurrency(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : (rounded % 1 === 0 ? 0 : 2),
    maximumFractionDigits: 2,
  }).format(rounded);
  return formatted;
}

/**
 * Format ISO YYYY-MM-DD to human readable string: e.g. "Mon, 12 Oct 2026"
 */
export function formatDateDisplay(dateStr: string, options?: { short?: boolean; includeDay?: boolean }): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    if (options?.short) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('en-IN', {
      weekday: options?.includeDay !== false ? 'short' : undefined,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format Date object to YYYY-MM-DD
 */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local date in YYYY-MM-DD format based on real device time
 */
export function getTodayDateString(): string {
  return toIsoDate(new Date());
}

/**
 * Safely shift a date string by N days in local time without timezone drift
 */
export function shiftDateDays(dateStr: string, days: number): string {
  if (!dateStr) return getTodayDateString();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day + days);
  return toIsoDate(d);
}

/**
 * Returns Monday to Sunday for the given date's week
 */
export function getWeekRange(dateInput: Date | string): { startDate: string; endDate: string } {
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : new Date(dateInput);
  const day = d.getDay();
  // In JS: 0 is Sunday, 1 is Monday... 6 is Saturday
  // We want Monday as start of week (day 1), Sunday as end (day 7)
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: toIsoDate(monday),
    endDate: toIsoDate(sunday)
  };
}

/**
 * Returns start and end of month for given date
 */
export function getMonthRange(dateInput: Date | string): { startDate: string; endDate: string } {
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00') : new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  };
}

/**
 * Returns array of YYYY-MM-DD strings between start and end inclusive
 */
export function getDaysInRange(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  const current = new Date(startIso + 'T00:00:00');
  const end = new Date(endIso + 'T00:00:00');

  while (current <= end) {
    days.push(toIsoDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Generate a complete period summary for the group
 */
export function generatePeriodReport(
  startDate: string,
  endDate: string,
  reportingType: 'weekly' | 'monthly' | 'custom',
  members: Member[],
  entries: FoodEntry[],
  messBills: MessBill[],
  existingBillingPeriods: BillingPeriod[]
): GroupPeriodReport {
  const days = getDaysInRange(startDate, endDate);
  
  // Filter entries within date range
  const periodEntries = entries.filter(e => e.date >= startDate && e.date <= endDate);

  // Filter bills within date range
  const periodBills = messBills.filter(b => 
    (b.periodStart >= startDate && b.periodStart <= endDate) ||
    (b.periodEnd >= startDate && b.periodEnd <= endDate) ||
    (b.periodStart <= startDate && b.periodEnd >= endDate)
  );

  const reportedMessBillTotal = roundCurrency(
    periodBills.reduce((sum, b) => sum + (b.reportedGrandTotal || 0), 0)
  );

  // Group Meal Totals
  let breakfastTotal = 0;
  let lunchTotal = 0;
  let dinnerTotal = 0;

  periodEntries.forEach(entry => {
    // Only count completed entries or in_progress entries with lineTotal
    if (entry.status !== 'confirmed_no_food') {
      const lt = entry.lineTotal || 0;
      if (entry.mealType === 'breakfast') breakfastTotal += lt;
      else if (entry.mealType === 'lunch') lunchTotal += lt;
      else if (entry.mealType === 'dinner') dinnerTotal += lt;
    }
  });

  breakfastTotal = roundCurrency(breakfastTotal);
  lunchTotal = roundCurrency(lunchTotal);
  dinnerTotal = roundCurrency(dinnerTotal);
  const calculatedGrandTotal = roundCurrency(breakfastTotal + lunchTotal + dinnerTotal);

  // Member Summaries
  const memberSummaries: MemberSummary[] = members.map(member => {
    const memberEntries = periodEntries.filter(e => e.memberId === member.id);
    let mBf = 0;
    let mLn = 0;
    let mDn = 0;
    let recordedMeals = 0;
    let skippedMeals = 0;

    const itemMap = new Map<string, { quantity: number; amount: number }>();

    memberEntries.forEach(e => {
      if (e.status === 'confirmed_no_food') {
        skippedMeals += 1;
        return;
      }
      recordedMeals += 1;
      const amt = e.lineTotal || 0;
      if (e.mealType === 'breakfast') mBf += amt;
      else if (e.mealType === 'lunch') mLn += amt;
      else if (e.mealType === 'dinner') mDn += amt;

      const existing = itemMap.get(e.foodNameSnapshot) || { quantity: 0, amount: 0 };
      itemMap.set(e.foodNameSnapshot, {
        quantity: roundCurrency(existing.quantity + e.quantity),
        amount: roundCurrency(existing.amount + amt)
      });
    });

    const itemBreakdown = Array.from(itemMap.entries()).map(([foodName, data]) => ({
      foodName,
      quantity: data.quantity,
      amount: data.amount
    })).sort((a, b) => b.amount - a.amount);

    mBf = roundCurrency(mBf);
    mLn = roundCurrency(mLn);
    mDn = roundCurrency(mDn);
    const mGrand = roundCurrency(mBf + mLn + mDn);

    return {
      memberId: member.id,
      memberName: member.name,
      breakfastTotal: mBf,
      lunchTotal: mLn,
      dinnerTotal: mDn,
      grandTotal: mGrand,
      recordedMealsCount: recordedMeals,
      confirmedSkippedCount: skippedMeals,
      itemBreakdown
    };
  });

  // Daily Summaries
  let completedDaysCount = 0;
  let incompleteDaysCount = 0;

  const dailySummaries: DailySummary[] = days.map(date => {
    const dayEntries = periodEntries.filter(e => e.date === date);
    let dBf = 0;
    let dLn = 0;
    let dDn = 0;

    dayEntries.forEach(e => {
      if (e.status !== 'confirmed_no_food') {
        const lt = e.lineTotal || 0;
        if (e.mealType === 'breakfast') dBf += lt;
        else if (e.mealType === 'lunch') dLn += lt;
        else if (e.mealType === 'dinner') dDn += lt;
      }
    });

    const uniqueMembers = new Set(dayEntries.map(e => e.memberId));
    const activeMembersCount = members.filter(m => m.active).length;

    let completionStatus: 'complete' | 'partial' | 'empty' = 'empty';
    if (dayEntries.length === 0) {
      completionStatus = 'empty';
      incompleteDaysCount++;
    } else if (uniqueMembers.size >= activeMembersCount && dayEntries.some(e => e.mealType === 'lunch') && dayEntries.some(e => e.mealType === 'dinner')) {
      completionStatus = 'complete';
      completedDaysCount++;
    } else {
      completionStatus = 'partial';
      incompleteDaysCount++;
    }

    return {
      date,
      breakfastTotal: roundCurrency(dBf),
      lunchTotal: roundCurrency(dLn),
      dinnerTotal: roundCurrency(dDn),
      dailyTotal: roundCurrency(dBf + dLn + dDn),
      completionStatus,
      membersRecorded: uniqueMembers.size
    };
  });

  // Food Summaries
  const foodMap = new Map<string, {
    foodItemId: string;
    foodName: string;
    category: string;
    totalQuantity: number;
    unitPrice: number;
    totalCost: number;
    consumers: Set<string>;
    bfQty: number;
    lnQty: number;
    dnQty: number;
  }>();

  periodEntries.forEach(e => {
    if (e.status === 'confirmed_no_food') return;
    const key = e.foodNameSnapshot;
    const existing = foodMap.get(key) || {
      foodItemId: e.foodItemId,
      foodName: e.foodNameSnapshot,
      category: e.mealType,
      totalQuantity: 0,
      unitPrice: e.unitPrice,
      totalCost: 0,
      consumers: new Set<string>(),
      bfQty: 0,
      lnQty: 0,
      dnQty: 0,
    };

    existing.totalQuantity = roundCurrency(existing.totalQuantity + e.quantity);
    existing.totalCost = roundCurrency(existing.totalCost + (e.lineTotal || 0));
    existing.consumers.add(e.memberId);
    if (e.mealType === 'breakfast') existing.bfQty += e.quantity;
    if (e.mealType === 'lunch') existing.lnQty += e.quantity;
    if (e.mealType === 'dinner') existing.dnQty += e.quantity;

    foodMap.set(key, existing);
  });

  const foodSummaries: FoodSummary[] = Array.from(foodMap.values()).map(f => ({
    foodItemId: f.foodItemId,
    foodName: f.foodName,
    category: f.category,
    totalQuantity: f.totalQuantity,
    unitPrice: f.unitPrice,
    totalCost: f.totalCost,
    uniqueConsumersCount: f.consumers.size,
    mealBreakdown: {
      breakfast: f.bfQty,
      lunch: f.lnQty,
      dinner: f.dnQty
    }
  })).sort((a, b) => b.totalCost - a.totalCost);

  // Discrepancy: Reported Mess Bill - Recorded Total
  const discrepancy = roundCurrency(reportedMessBillTotal - calculatedGrandTotal);

  // Determine status from existing billing periods or calculate
  const matchingPeriod = existingBillingPeriods.find(bp => bp.startDate === startDate && bp.endDate === endDate);
  let status: ReportStatus = matchingPeriod ? matchingPeriod.status : 'draft';
  if (!matchingPeriod) {
    if (reportedMessBillTotal > 0) {
      status = Math.abs(discrepancy) < 0.01 ? 'reconciled' : 'needs_review';
    } else {
      status = 'draft';
    }
  }

  // Cross-verification assertion: Sum of member totals must equal calculated grand total
  const sumOfMembers = roundCurrency(memberSummaries.reduce((sum, m) => sum + m.grandTotal, 0));
  if (Math.abs(sumOfMembers - calculatedGrandTotal) > 0.01) {
    console.warn(`Internal math drift detected: sumOfMembers (${sumOfMembers}) !== calculatedGrandTotal (${calculatedGrandTotal})`);
  }

  return {
    startDate,
    endDate,
    reportingType,
    status,
    activeMembersCount: members.filter(m => m.active).length,
    completedDaysCount,
    incompleteDaysCount,
    calculatedBreakfastTotal: breakfastTotal,
    calculatedLunchTotal: lunchTotal,
    calculatedDinnerTotal: dinnerTotal,
    calculatedGrandTotal,
    reportedMessBillTotal,
    discrepancy,
    memberSummaries,
    dailySummaries,
    foodSummaries,
    messBills: periodBills
  };
}
