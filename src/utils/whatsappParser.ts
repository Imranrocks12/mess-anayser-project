import type { ExtractedBillItem, MealType, FoodItem } from '../types';
import { roundCurrency } from './calculations';

export interface ParseResult {
  rawText: string;
  detectedDate?: string; // YYYY-MM-DD
  detectedPeriodStart?: string;
  detectedPeriodEnd?: string;
  reportedGrandTotal: number;
  reportedBreakfastTotal?: number;
  reportedLunchTotal?: number;
  reportedDinnerTotal?: number;
  extractedItems: ExtractedBillItem[];
  isOverallTotalOnly: boolean;
  arithmeticMismatch: boolean;
  calculatedSum: number;
  discrepancyNote?: string;
  warnings: string[];
}

// Common aliases in Indian Mess bills
const ALIAS_MAP: Record<string, string> = {
  'dall rice': 'Dal rice',
  'dhal rice': 'Dal rice',
  'daal rice': 'Dal rice',
  'dal rice': 'Dal rice',
  'tomato biryani': 'Tomato biriyani',
  'tomato biriyani': 'Tomato biriyani',
  'tomato rice': 'Tomato biriyani',
  'curd rice': 'Curd rice with soya',
  'curd rice with soya': 'Curd rice with soya',
  'meals': 'Meals',
  'meal': 'Meals',
  'lunch meals': 'Meals',
  'roti': 'Roti',
  'rotis': 'Roti',
  'chapati': 'Roti',
  'chappathi': 'Roti',
  'paneer': 'Paneer',
  'paneer butter masala': 'Paneer',
  'paneer gravy': 'Paneer',
  'egg': 'Egg',
  'eggs': 'Egg',
  'egg gravy': 'Egg',
  'boiled egg': 'Egg',
  'idli': 'Idli',
  'idly': 'Idli',
  'dosa': 'Dosa',
  'dosai': 'Dosa',
  'pongal': 'Pongal',
  'semiya': 'Semiya with milk',
  'semiya with milk': 'Semiya with milk',
  'pasta': 'Pasta',
  'poori': 'Poori',
  'channa': 'Channa gravy',
  'channa gravy': 'Channa gravy',
  'puli sapadu': 'Puli sapadu',
  'egg fried rice': 'Egg fried rice',
};

/**
 * Normalize food name using known alias dictionary or fuzzy cleaning
 */
export function normalizeFoodName(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[-_:]/g, ' ').replace(/\s+/g, ' ');
  if (ALIAS_MAP[clean]) {
    return ALIAS_MAP[clean];
  }
  // Title case fallback
  return name.trim().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Attempt to match food name with active menu items
 */
export function matchWithMenuItems(foodName: string, menuItems: FoodItem[]): { matchedId?: string; matchedName?: string } {
  const normalized = normalizeFoodName(foodName).toLowerCase();
  
  // Exact match
  const exact = menuItems.find(m => m.name.toLowerCase() === normalized);
  if (exact) return { matchedId: exact.id, matchedName: exact.name };

  // Substring or alias match
  const partial = menuItems.find(m => 
    m.name.toLowerCase().includes(normalized) || 
    normalized.includes(m.name.toLowerCase())
  );
  if (partial) return { matchedId: partial.id, matchedName: partial.name };

  return {};
}

/**
 * Parse WhatsApp message or plain text mess bill
 */
export function parseWhatsAppBill(text: string, menuItems: FoodItem[] = []): ParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const extractedItems: ExtractedBillItem[] = [];
  const warnings: string[] = [];
  
  let currentMeal: MealType | undefined = undefined;
  let reportedGrandTotal = 0;
  let detectedDate: string | undefined = undefined;
  let reportedBreakfastTotal: number | undefined = undefined;
  let reportedLunchTotal: number | undefined = undefined;
  let reportedDinnerTotal: number | undefined = undefined;

  // Regex patterns
  // Pattern 1: Meals: 6 x 70 = 420  OR  Meals: 6 × ₹70 = ₹420  OR  Meals 6 * 70 = 420
  const itemPattern1 = /^[-*•\d.]*\s*([A-Za-z\s]+?)\s*[:\-]\s*(\d+(?:\.\d+)?)\s*[xX×*@]\s*[₹Rs.]*\s*(\d+(?:\.\d+)?)(?:\s*=\s*[₹Rs.]*\s*(\d+(?:\.\d+)?))?/i;
  
  // Pattern 2: Meals 6 x 70 = 420 (no colon/dash)
  const itemPattern2 = /^[-*•\d.]*\s*([A-Za-z\s]{3,30})\s+(\d+(?:\.\d+)?)\s*[xX×*@]\s*[₹Rs.]*\s*(\d+(?:\.\d+)?)(?:\s*=\s*[₹Rs.]*\s*(\d+(?:\.\d+)?))?/i;

  // Pattern 3: 6 x Meals @ 70 = 420 (quantity first)
  const itemPattern3 = /^[-*•\d.]*\s*(\d+(?:\.\d+)?)\s*[xX×*@]\s*([A-Za-z\s]+?)\s*[:\-@]\s*[₹Rs.]*\s*(\d+(?:\.\d+)?)(?:\s*=\s*[₹Rs.]*\s*(\d+(?:\.\d+)?))?/i;

  // Section Headers
  const bfHeader = /^(?:breakfast|morning|tiffin)\b/i;
  const lnHeader = /^(?:lunch|afternoon|meals)\b/i;
  const dnHeader = /^(?:dinner|night|supper)\b/i;

  // Grand total detection
  const grandTotalPattern = /(?:grand\s*total|overall\s*total|total\s*bill|total\s*amount|bill\s*amount|total)\s*[:=\-]?\s*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i;

  // Date detection: DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
  const datePattern = /\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{2,4})\b/;

  for (const line of lines) {
    // Check for date
    if (!detectedDate) {
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        let p1 = parseInt(dateMatch[1], 10);
        let p2 = parseInt(dateMatch[2], 10);
        let p3 = parseInt(dateMatch[3], 10);
        // If YYYY-MM-DD
        if (p1 > 1000) {
          detectedDate = `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
        } else {
          // DD-MM-YYYY
          if (p3 < 100) p3 += 2000;
          detectedDate = `${p3}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        }
      }
    }

    // Check Meal Section Headers
    if (bfHeader.test(line)) {
      currentMeal = 'breakfast';
      continue;
    }
    if (lnHeader.test(line)) {
      currentMeal = 'lunch';
      continue;
    }
    if (dnHeader.test(line)) {
      currentMeal = 'dinner';
      continue;
    }

    // Check Subtotals
    const subtotalMatch = line.match(/(?:breakfast|lunch|dinner)\s*(?:subtotal|total)\s*[:=\-]?\s*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
    if (subtotalMatch) {
      const val = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      if (line.toLowerCase().includes('breakfast')) reportedBreakfastTotal = val;
      if (line.toLowerCase().includes('lunch')) reportedLunchTotal = val;
      if (line.toLowerCase().includes('dinner')) reportedDinnerTotal = val;
      continue;
    }

    // Check Grand Total
    const gtMatch = line.match(grandTotalPattern);
    if (gtMatch && !line.match(/[xX×*@]/)) { // Make sure it's not a line item like "Total meals: 6 x 70"
      reportedGrandTotal = parseFloat(gtMatch[1].replace(/,/g, ''));
      continue;
    }

    // Attempt Item Matching Pattern 1
    let match = line.match(itemPattern1);
    let rawName = '';
    let qty = 0;
    let price = 0;
    let explicitTotal = 0;

    if (match) {
      rawName = match[1].trim();
      qty = parseFloat(match[2]);
      price = parseFloat(match[3]);
      explicitTotal = match[4] ? parseFloat(match[4]) : 0;
    } else {
      // Attempt Pattern 2
      match = line.match(itemPattern2);
      if (match) {
        rawName = match[1].trim();
        qty = parseFloat(match[2]);
        price = parseFloat(match[3]);
        explicitTotal = match[4] ? parseFloat(match[4]) : 0;
      } else {
        // Attempt Pattern 3 (Qty first)
        match = line.match(itemPattern3);
        if (match) {
          qty = parseFloat(match[1]);
          rawName = match[2].trim();
          price = parseFloat(match[3]);
          explicitTotal = match[4] ? parseFloat(match[4]) : 0;
        }
      }
    }

    if (rawName && qty > 0 && price >= 0) {
      const cleanedName = normalizeFoodName(rawName);
      const calculatedLine = roundCurrency(qty * price);
      
      let needsReview = false;
      if (explicitTotal > 0 && Math.abs(explicitTotal - calculatedLine) > 0.5) {
        warnings.push(`Arithmetic warning on "${rawName}": ${qty} × ₹${price} = ₹${calculatedLine}, but message stated ₹${explicitTotal}`);
        needsReview = true;
      }

      const matchRes = matchWithMenuItems(cleanedName, menuItems);
      
      extractedItems.push({
        id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        foodName: matchRes.matchedName || cleanedName,
        quantity: qty,
        unitPrice: price,
        lineTotal: calculatedLine,
        mealType: currentMeal,
        confidence: matchRes.matchedId ? 0.95 : 0.75,
        matchedFoodItemId: matchRes.matchedId,
        needsReview
      });
    }
  }

  const calculatedSum = roundCurrency(extractedItems.reduce((acc, item) => acc + item.lineTotal, 0));

  // If grand total wasn't explicitly found, but we have items, use calculatedSum
  if (reportedGrandTotal === 0 && calculatedSum > 0) {
    reportedGrandTotal = calculatedSum;
  }

  const isOverallTotalOnly = extractedItems.length === 0 && reportedGrandTotal > 0;
  const arithmeticMismatch = extractedItems.length > 0 && Math.abs(calculatedSum - reportedGrandTotal) > 1;

  let discrepancyNote: string | undefined = undefined;
  if (arithmeticMismatch) {
    discrepancyNote = `Reported bill total is ₹${reportedGrandTotal}, but sum of extracted items is ₹${calculatedSum} (Difference: ₹${roundCurrency(reportedGrandTotal - calculatedSum)})`;
  }

  return {
    rawText: text,
    detectedDate,
    reportedGrandTotal,
    reportedBreakfastTotal,
    reportedLunchTotal,
    reportedDinnerTotal,
    extractedItems,
    isOverallTotalOnly,
    arithmeticMismatch,
    calculatedSum,
    discrepancyNote,
    warnings
  };
}
