import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GroupPeriodReport, FoodEntry, Member, MessBill } from '../types';
import { formatDateDisplay } from './calculations';

const primaryDark = [30, 41, 59] as [number, number, number]; // Slate 800
const slateMuted = [100, 116, 139] as [number, number, number]; // Slate 500
const borderLight = [226, 232, 240] as [number, number, number];

// ============================================================================
// 1. INDIVIDUAL MESS BILL EXPORT PDF
// ============================================================================
export async function exportMessBillPdf(
  bill: MessBill,
  action: 'download' | 'share' = 'download'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const addBillFooter = (pageNumber: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const footerText = `MessMate Smart Tracker • Mess In-Charge Bill (${bill.periodStart} to ${bill.periodEnd}) • Generated on ${new Date().toLocaleDateString('en-IN')}`;
    doc.text(footerText, margin, pageHeight - 8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('MESSMATE', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('In-Charge Mess Bill Statement (Imported Record)', margin, 25);

  // Status Badge
  const statusStr = (bill.reconciliationStatus || 'verified').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (bill.reconciliationStatus === 'reconciled') {
    doc.setTextColor(22, 101, 52); // green
  } else if (bill.reconciliationStatus === 'finalized') {
    doc.setTextColor(30, 58, 138); // blue
  } else {
    doc.setTextColor(180, 83, 9); // amber
  }
  doc.text(`STATUS: ${statusStr}`, pageWidth - margin, 20, { align: 'right' });

  // Period & Source Info Box
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 30, pageWidth - 2 * margin, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(
    `Billing Period: ${formatDateDisplay(bill.periodStart)} to ${formatDateDisplay(bill.periodEnd)}`,
    margin + 4,
    38
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    `Source: ${bill.sourceType.toUpperCase()} | Imported By: ${bill.createdBy} | Created: ${formatDateDisplay(bill.createdAt.split('T')[0])}`,
    margin + 4,
    44
  );

  // KPI Cards
  const cardY = 53;
  const cardW = (pageWidth - 2 * margin - 8) / 3;
  const cardH = 22;

  // Card 1: Reported Grand Total
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('REPORTED GRAND TOTAL', margin + 4, cardY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Rs. ${bill.reportedGrandTotal.toFixed(2)}`, margin + 4, cardY + 16);

  // Card 2: Meal Category Breakdown
  const card2X = margin + cardW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(card2X, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('MEAL SUB-TOTALS', card2X + 4, cardY + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Bf: Rs. ${(bill.reportedBreakfastTotal || 0).toFixed(0)}  |  Ln: Rs. ${(bill.reportedLunchTotal || 0).toFixed(0)}`, card2X + 4, cardY + 12);
  doc.text(`Dn: Rs. ${(bill.reportedDinnerTotal || 0).toFixed(0)}`, card2X + 4, cardY + 18);

  // Card 3: Items Count
  const card3X = card2X + cardW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(card3X, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('EXTRACTED LINE ITEMS', card3X + 4, cardY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`${bill.items?.length || 0} items extracted`, card3X + 4, cardY + 16);

  let currentY = 82;

  // Items Table
  if (bill.items && bill.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('Itemized Mess In-Charge Bill Breakdown', margin, currentY);

    const tableRows = bill.items.map((item, idx) => [
      String(idx + 1),
      item.foodName,
      (item.mealType || 'General').toUpperCase(),
      String(item.quantity),
      `Rs. ${item.unitPrice.toFixed(2)}`,
      `Rs. ${item.lineTotal.toFixed(2)}`,
    ]);

    const lineSum = bill.items.reduce((s, i) => s + (i.lineTotal || 0), 0);
    tableRows.push([
      '',
      'TOTAL EXTRACTED SUM',
      '',
      String(bill.items.reduce((s, i) => s + (i.quantity || 0), 0)),
      '',
      `Rs. ${lineSum.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['#', 'Food Item Name', 'Meal Category', 'Quantity', 'Unit Rate', 'Line Total']],
      body: tableRows,
      theme: 'plain',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      footStyles: {
        fontStyle: 'bold',
        fillColor: [241, 245, 249],
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('No itemized food lines recorded. Only lump-sum grand total was reported.', margin, currentY);
    currentY += 10;
  }

  // Notes Box
  if (bill.notes && currentY < pageHeight - 35) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('Notes / Administrator Context:', margin + 4, currentY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(bill.notes, margin + 4, currentY + 11.5);
  }

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBillFooter(i, totalPages);
  }

  const filename = `MessMate_MessBill_${bill.periodStart}_to_${bill.periodEnd}.pdf`;

  if (action === 'share' && navigator.canShare) {
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Mess Bill (${bill.periodStart} - ${bill.periodEnd})`,
          text: `In-charge mess bill for ${formatDateDisplay(bill.periodStart)} to ${formatDateDisplay(bill.periodEnd)}. Total: Rs. ${bill.reportedGrandTotal.toFixed(2)}`,
        });
        return;
      }
    } catch (shareErr) {
      console.warn('Native share failed or dismissed, falling back to download', shareErr);
    }
  }

  doc.save(filename);
}

// ============================================================================
// 2. COMBINED RECONCILIATION & AUDIT REPORT PDF
// ============================================================================
export async function exportCombinedReportPdf(
  report: GroupPeriodReport,
  allEntries: FoodEntry[],
  members: Member[],
  action: 'download' | 'share' = 'download'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Helper for adding footer on all pages
  const addFooter = (pageNumber: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    const footerText = `MessMate Smart Tracker • Billing Period: ${report.startDate} to ${report.endDate} • Generated on ${new Date().toLocaleDateString('en-IN')}`;
    doc.text(footerText, margin, pageHeight - 8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Compile Cross-Verification items (food entries vs mess bills)
  const reportedItemsMap = new Map<string, { foodName: string; quantity: number; lineTotal: number; mealType?: string }>();
  if (report.messBills) {
    report.messBills.forEach((b) => {
      b.items?.forEach((item) => {
        const key = item.foodName.toLowerCase().trim();
        const existing = reportedItemsMap.get(key) || { foodName: item.foodName.trim(), quantity: 0, lineTotal: 0, mealType: item.mealType };
        existing.quantity += item.quantity;
        existing.lineTotal += item.lineTotal;
        reportedItemsMap.set(key, existing);
      });
    });
  }

  const allFoodNames = new Set<string>();
  report.foodSummaries.forEach((f) => allFoodNames.add(f.foodName.toLowerCase().trim()));
  reportedItemsMap.forEach((_, key) => allFoodNames.add(key));

  interface CrossVerifItem {
    foodName: string;
    category: string;
    recordedQty: number;
    reportedQty: number;
    qtyDiff: number;
    recordedCost: number;
    reportedCost: number;
    status: 'MATCHED' | 'MISMATCH' | 'NA_NOT_IN_BILL' | 'NA_NOT_IN_LEDGER';
    statusText: string;
  }

  const crossVerifList: CrossVerifItem[] = Array.from(allFoodNames).map((key) => {
    const ledgerItem = report.foodSummaries.find((f) => f.foodName.toLowerCase().trim() === key);
    const billItem = reportedItemsMap.get(key);

    const foodName = ledgerItem ? ledgerItem.foodName : (billItem ? billItem.foodName : key);
    const category = (ledgerItem?.category || billItem?.mealType || 'General').toUpperCase();
    const recordedQty = ledgerItem ? ledgerItem.totalQuantity : 0;
    const reportedQty = billItem ? billItem.quantity : 0;
    const qtyDiff = reportedQty - recordedQty;
    const recordedCost = ledgerItem ? ledgerItem.totalCost : 0;
    const reportedCost = billItem ? billItem.lineTotal : 0;

    let status: 'MATCHED' | 'MISMATCH' | 'NA_NOT_IN_BILL' | 'NA_NOT_IN_LEDGER' = 'MATCHED';
    let statusText = '✓ Matched';

    if (!billItem || reportedQty === 0) {
      status = 'NA_NOT_IN_BILL';
      statusText = 'N/A: Not in mess bill';
    } else if (!ledgerItem || recordedQty === 0) {
      status = 'NA_NOT_IN_LEDGER';
      statusText = 'N/A: Not in daily ledger';
    } else if (Math.abs(qtyDiff) > 0.01) {
      status = 'MISMATCH';
      statusText = `⚠️ MISMATCH (Diff: ${qtyDiff > 0 ? '+' : ''}${qtyDiff})`;
    } else {
      status = 'MATCHED';
      statusText = '✓ Matched';
    }

    return {
      foodName,
      category,
      recordedQty,
      reportedQty,
      qtyDiff,
      recordedCost,
      reportedCost,
      status,
      statusText,
    };
  });

  // Sort so mismatches & N/A items appear at the very top
  crossVerifList.sort((a, b) => {
    const score = (s: string) => (s === 'MISMATCH' ? 0 : s.startsWith('NA') ? 1 : 2);
    return score(a.status) - score(b.status);
  });

  const mismatchCount = crossVerifList.filter((r) => r.status === 'MISMATCH').length;
  const naCount = crossVerifList.filter((r) => r.status.startsWith('NA')).length;

  // ==========================================================================
  // PAGE 1: OVERALL BILL & IMPORTED MESS BILL SUMMARY
  // ==========================================================================

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('MESSMATE', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Smart Mess Billing & Reconciliation Statement', margin, 25);

  // Status Badge
  const statusStr = report.status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (report.status === 'reconciled') {
    doc.setTextColor(22, 101, 52); // green 800
  } else if (report.status === 'finalized') {
    doc.setTextColor(30, 58, 138); // blue 900
  } else {
    doc.setTextColor(180, 83, 9); // amber 700
  }
  doc.text(`STATUS: ${statusStr}`, pageWidth - margin, 20, { align: 'right' });

  // Period Info Box
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 30, pageWidth - 2 * margin, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Billing Period: ${formatDateDisplay(report.startDate)} to ${formatDateDisplay(report.endDate)}`, margin + 4, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    `Group Members: ${report.activeMembersCount} active | Days Recorded: ${report.completedDaysCount} completed (${report.incompleteDaysCount} partial/pending)`,
    margin + 4,
    44
  );

  // Financial KPI Cards (3 columns)
  const cardY = 52;
  const cardW = (pageWidth - 2 * margin - 8) / 3;
  const cardH = 22;

  // Card 1: Recorded Consumption
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('TOTAL CONSUMPTION', margin + 4, cardY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Rs. ${report.calculatedGrandTotal.toFixed(2)}`, margin + 4, cardY + 16);

  // Card 2: Reported Mess Bill
  const card2X = margin + cardW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(card2X, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('REPORTED MESS BILL', card2X + 4, cardY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Rs. ${report.reportedMessBillTotal.toFixed(2)}`, card2X + 4, cardY + 16);

  // Card 3: Discrepancy
  const card3X = card2X + cardW + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(card3X, cardY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('DISCREPANCY (DIFF)', card3X + 4, cardY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  if (Math.abs(report.discrepancy) < 0.01) {
    doc.setTextColor(22, 101, 52); // green
    doc.text('Rs. 0.00 (Balanced)', card3X + 4, cardY + 16);
  } else {
    doc.setTextColor(220, 38, 38); // red
    doc.text(`Rs. ${report.discrepancy > 0 ? '+' : ''}${report.discrepancy.toFixed(2)}`, card3X + 4, cardY + 16);
  }

  let currentY = 80;

  // ==========================================================================
  // SECTION 1: IMPORTED MESS BILL DETAILS ON FIRST PAGE (Requirement 2)
  // ==========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('1. Imported In-Charge Mess Bill Details', margin, currentY);

  const messBillsRows = (report.messBills && report.messBills.length > 0)
    ? report.messBills.map((b) => [
        `${formatDateDisplay(b.periodStart, { short: true })} to ${formatDateDisplay(b.periodEnd, { short: true })}`,
        b.sourceType.toUpperCase(),
        b.reportedBreakfastTotal ? `Rs. ${b.reportedBreakfastTotal.toFixed(0)}` : '-',
        b.reportedLunchTotal ? `Rs. ${b.reportedLunchTotal.toFixed(0)}` : '-',
        b.reportedDinnerTotal ? `Rs. ${b.reportedDinnerTotal.toFixed(0)}` : '-',
        `Rs. ${b.reportedGrandTotal.toFixed(2)}`,
        `${b.items?.length || 0} items`,
        (b.reconciliationStatus || 'verified').toUpperCase(),
      ])
    : [
        [
          `${formatDateDisplay(report.startDate, { short: true })} to ${formatDateDisplay(report.endDate, { short: true })}`,
          'MANUAL',
          '-',
          '-',
          '-',
          `Rs. ${report.reportedMessBillTotal.toFixed(2)}`,
          '0 items',
          'VERIFIED',
        ],
      ];

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Bill Period', 'Source', 'Breakfast', 'Lunch', 'Dinner', 'Grand Total', 'Extracted Items', 'Status']],
    body: messBillsRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Cross-verification summary callout on Page 1
  if (mismatchCount > 0 || naCount > 0) {
    const mismatchedItems = crossVerifList.filter(
      (r) => r.status === 'MISMATCH' || r.status.startsWith('NA')
    );

    const boxWidth = pageWidth - 2 * margin;
    const innerWidth = boxWidth - 8;

    const errorDetails: string[] = [];
    mismatchedItems.forEach((item) => {
      if (item.status === 'MISMATCH') {
        const diffSign = item.qtyDiff > 0 ? `+${item.qtyDiff}` : `${item.qtyDiff}`;
        errorDetails.push(
          `• Item Mismatch: "${item.foodName}" (${item.category}) — Daily Ledger: ${item.recordedQty} qty (Rs. ${item.recordedCost.toFixed(2)}) vs Mess Bill: ${item.reportedQty} qty (Rs. ${item.reportedCost.toFixed(2)}) [Qty Diff: ${diffSign}]`
        );
      } else if (item.status === 'NA_NOT_IN_BILL') {
        errorDetails.push(
          `• Unmatched: "${item.foodName}" (${item.category}) — Recorded in Daily Ledger (${item.recordedQty} qty, Rs. ${item.recordedCost.toFixed(2)}) but NOT found in Mess Bill.`
        );
      } else if (item.status === 'NA_NOT_IN_LEDGER') {
        errorDetails.push(
          `• Unmatched: "${item.foodName}" (${item.category}) — Reported in Mess Bill (${item.reportedQty} qty, Rs. ${item.reportedCost.toFixed(2)}) but NOT found in Daily Ledger.`
        );
      }
    });

    const summaryText = `Discrepancy detected: ${mismatchCount} item quantity mismatch(es)${naCount > 0 ? ` and ${naCount} unmatched item(s)` : ''} between recorded meals and imported mess bill:`;
    
    const wrappedSummary = doc.splitTextToSize(summaryText, innerWidth);
    const wrappedDetails: string[] = [];
    errorDetails.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, innerWidth);
      if (Array.isArray(wrapped)) {
        wrappedDetails.push(...wrapped);
      } else {
        wrappedDetails.push(wrapped);
      }
    });

    const lineHeight = 3.6;
    const headerHeight = 7;
    const summaryLinesCount = Array.isArray(wrappedSummary) ? wrappedSummary.length : 1;
    const boxHeight = headerHeight + (summaryLinesCount + wrappedDetails.length) * lineHeight + 4;

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text('AUDIT DISCREPANCIES DETECTED — ACTION REQUIRED', margin + 4, currentY + 5.5);

    // Summary line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    let textY = currentY + 5.5 + 4;
    if (Array.isArray(wrappedSummary)) {
      wrappedSummary.forEach((s: string) => {
        doc.text(s, margin + 4, textY);
        textY += lineHeight;
      });
    } else {
      doc.text(wrappedSummary, margin + 4, textY);
      textY += lineHeight;
    }

    // Detail bullets
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(153, 27, 27);
    wrappedDetails.forEach((line) => {
      doc.text(line, margin + 4, textY);
      textY += lineHeight;
    });

    currentY += boxHeight + 6;
  }

  // ==========================================================================
  // SECTION 2: RECORDED MEAL CATEGORY SUBTOTALS
  // ==========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('2. Recorded Consumption by Meal Category', margin, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Meal Category', 'Amount (Rs.)', 'Percentage of Total']],
    body: [
      ['Breakfast', `Rs. ${report.calculatedBreakfastTotal.toFixed(2)}`, `${((report.calculatedBreakfastTotal / (report.calculatedGrandTotal || 1)) * 100).toFixed(1)}%`],
      ['Lunch', `Rs. ${report.calculatedLunchTotal.toFixed(2)}`, `${((report.calculatedLunchTotal / (report.calculatedGrandTotal || 1)) * 100).toFixed(1)}%`],
      ['Dinner', `Rs. ${report.calculatedDinnerTotal.toFixed(2)}`, `${((report.calculatedDinnerTotal / (report.calculatedGrandTotal || 1)) * 100).toFixed(1)}%`],
      ['Group Grand Total', `Rs. ${report.calculatedGrandTotal.toFixed(2)}`, '100.0%'],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // ==========================================================================
  // SECTION 3: MEMBER BILLING BREAKDOWN (SHARES)
  // ==========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('3. Member Billing Breakdown (Individual Shares)', margin, currentY);

  const memberTableRows = report.memberSummaries.map((m) => [
    m.memberName,
    `Rs. ${m.breakfastTotal.toFixed(2)}`,
    `Rs. ${m.lunchTotal.toFixed(2)}`,
    `Rs. ${m.dinnerTotal.toFixed(2)}`,
    `Rs. ${m.grandTotal.toFixed(2)}`,
    `${m.recordedMealsCount} meals (${m.confirmedSkippedCount} skipped)`,
  ]);

  memberTableRows.push([
    'GROUP TOTAL',
    `Rs. ${report.calculatedBreakfastTotal.toFixed(2)}`,
    `Rs. ${report.calculatedLunchTotal.toFixed(2)}`,
    `Rs. ${report.calculatedDinnerTotal.toFixed(2)}`,
    `Rs. ${report.calculatedGrandTotal.toFixed(2)}`,
    `${report.memberSummaries.reduce((acc, m) => acc + m.recordedMealsCount, 0)} meals`,
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Member', 'Breakfast', 'Lunch', 'Dinner', 'Total Due', 'Meal Count']],
    body: memberTableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fontStyle: 'bold',
      fillColor: [241, 245, 249],
    },
    margin: { left: margin, right: margin },
  });

  // Reconciliation Audit Trail Notes (if present and fits on Page 1)
  const postSection3Y = (doc as any).lastAutoTable.finalY + 6;
  const billNotes = report.messBills?.[0]?.notes;
  if (billNotes && postSection3Y < pageHeight - 25) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, postSection3Y, pageWidth - 2 * margin, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('Reconciliation Resolution Notes / Remarks:', margin + 4, postSection3Y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(billNotes, margin + 4, postSection3Y + 9);
  }

  // ==========================================================================
  // FOLLOWING PAGES: INDIVIDUAL MEMBER ITEMIZED STATEMENTS
  // ==========================================================================

  const periodEntries = allEntries.filter(
    (e) => e.date >= report.startDate && e.date <= report.endDate
  );

  for (const member of members.filter((m) => m.active)) {
    doc.addPage();

    // Member Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(`Member Statement: ${member.name}`, margin, 20);

    const memberSummary = report.memberSummaries.find((ms) => ms.memberId === member.id);
    const memberTotalDue = memberSummary ? memberSummary.grandTotal : 0;

    // Total Due Card
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - margin - 55, 12, 55, 14, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('TOTAL DUE', pageWidth - margin - 52, 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(`Rs. ${memberTotalDue.toFixed(2)}`, pageWidth - margin - 52, 23);

    // Period line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(
      `Billing Period: ${formatDateDisplay(report.startDate)} to ${formatDateDisplay(report.endDate)} • ${memberSummary?.recordedMealsCount || 0} meals recorded`,
      margin,
      27
    );

    // Get entries for this member
    const memberEntries = periodEntries
      .filter((e) => e.memberId === member.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (memberEntries.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text('No food consumption entries recorded for this period.', margin, 40);
    } else {
      const itemRows = memberEntries.map((e) => {
        const isSkipped = e.status === 'confirmed_no_food';
        return [
          formatDateDisplay(e.date, { short: true }),
          e.mealType ? e.mealType.toUpperCase() : '',
          isSkipped ? `${e.foodNameSnapshot} (Skipped)` : e.foodNameSnapshot,
          isSkipped ? '0' : String(e.quantity),
          `Rs. ${e.unitPrice.toFixed(2)}`,
          `Rs. ${(isSkipped ? 0 : e.lineTotal).toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: 33,
        head: [['Date', 'Meal', 'Food Item', 'Qty', 'Unit Rate', 'Line Total']],
        body: itemRows,
        theme: 'plain',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [15, 23, 42],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
      });

      // Member Subtotal Box
      const finalY = (doc as any).lastAutoTable.finalY + 6;
      if (finalY < pageHeight - 40) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, finalY, pageWidth - 2 * margin, 18, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
        doc.text(
          `Breakfast: Rs. ${(memberSummary?.breakfastTotal || 0).toFixed(2)}   |   ` +
          `Lunch: Rs. ${(memberSummary?.lunchTotal || 0).toFixed(2)}   |   ` +
          `Dinner: Rs. ${(memberSummary?.dinnerTotal || 0).toFixed(2)}`,
          margin + 4,
          finalY + 8
        );

        doc.setFont('helvetica', 'bold');
        doc.text(
          `Total Individual Amount Payable: Rs. ${memberTotalDue.toFixed(2)}`,
          margin + 4,
          finalY + 14
        );
      }
    }
  }

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Web Share API or Download
  const filename = `MessMate_Reconciliation_Bill_${report.startDate}_to_${report.endDate}.pdf`;

  if (action === 'share' && navigator.canShare) {
    try {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `MessMate Bill (${report.startDate} - ${report.endDate})`,
          text: `Mess bill report for ${formatDateDisplay(report.startDate)} to ${formatDateDisplay(report.endDate)}. Total: Rs. ${report.calculatedGrandTotal.toFixed(2)}`,
        });
        return;
      }
    } catch (shareErr) {
      console.warn('Native share failed or dismissed, falling back to download', shareErr);
    }
  }

  // Default download
  doc.save(filename);
}
