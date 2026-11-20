import ExcelJS from 'exceljs';
import type { GroupPeriodReport, FoodEntry, Member } from '../types';
import { formatDateDisplay } from './calculations';

export async function exportReportToExcel(
  report: GroupPeriodReport,
  allEntries: FoodEntry[],
  members: Member[],
  filenamePrefix = 'MessMate_Report'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MessMate — Smart Mess Billing & Food Tracker';
  workbook.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const formatHeaderRow = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderStyle;
    });
    row.height = 26;
  };

  // --------------------------------------------------------------------------
  // SHEET 1: Food Entries
  // --------------------------------------------------------------------------
  const sheetEntries = workbook.addWorksheet('Food Entries', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheetEntries.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Person', key: 'person', width: 18 },
    { header: 'Meal Type', key: 'meal', width: 14 },
    { header: 'Food Item', key: 'food', width: 22 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit Price (₹)', key: 'unitPrice', width: 14 },
    { header: 'Line Total (₹)', key: 'lineTotal', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Notes', key: 'notes', width: 24 },
  ];
  formatHeaderRow(sheetEntries.getRow(1));

  // Filter entries within period
  const periodEntries = allEntries.filter(
    (e) => e.date >= report.startDate && e.date <= report.endDate
  );

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  periodEntries.forEach((entry) => {
    const row = sheetEntries.addRow({
      date: entry.date,
      person: memberMap.get(entry.memberId) || 'Unknown',
      meal: entry.mealType ? entry.mealType.toUpperCase() : '',
      food: entry.foodNameSnapshot,
      quantity: entry.status === 'confirmed_no_food' ? 0 : entry.quantity,
      unitPrice: entry.unitPrice,
      lineTotal: entry.status === 'confirmed_no_food' ? 0 : entry.lineTotal,
      status:
        entry.status === 'confirmed_no_food'
          ? 'Confirmed No Food'
          : entry.status.replace('_', ' ').toUpperCase(),
      notes: entry.notes || '',
    });

    row.getCell('quantity').numFmt = '#,##0.##';
    row.getCell('unitPrice').numFmt = '₹#,##0.00';
    row.getCell('lineTotal').numFmt = '₹#,##0.00';
    row.eachCell((c) => (c.border = borderStyle));
  });

  // --------------------------------------------------------------------------
  // SHEET 2: Member Summary
  // --------------------------------------------------------------------------
  const sheetMembers = workbook.addWorksheet('Member Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheetMembers.columns = [
    { header: 'Member Name', key: 'name', width: 20 },
    { header: 'Breakfast Total (₹)', key: 'bf', width: 18 },
    { header: 'Lunch Total (₹)', key: 'ln', width: 18 },
    { header: 'Dinner Total (₹)', key: 'dn', width: 18 },
    { header: 'Total Payable (₹)', key: 'total', width: 18 },
    { header: 'Recorded Meals', key: 'meals', width: 16 },
    { header: 'Skipped Meals', key: 'skipped', width: 16 },
  ];
  formatHeaderRow(sheetMembers.getRow(1));

  report.memberSummaries.forEach((m) => {
    const row = sheetMembers.addRow({
      name: m.memberName,
      bf: m.breakfastTotal,
      ln: m.lunchTotal,
      dn: m.dinnerTotal,
      total: m.grandTotal,
      meals: m.recordedMealsCount,
      skipped: m.confirmedSkippedCount,
    });

    row.getCell('bf').numFmt = '₹#,##0.00';
    row.getCell('ln').numFmt = '₹#,##0.00';
    row.getCell('dn').numFmt = '₹#,##0.00';
    row.getCell('total').numFmt = '₹#,##0.00';
    row.getCell('total').font = { bold: true };
    row.eachCell((c) => (c.border = borderStyle));
  });

  // Total summary row
  const memberTotalRow = sheetMembers.addRow({
    name: 'GROUP TOTAL',
    bf: report.calculatedBreakfastTotal,
    ln: report.calculatedLunchTotal,
    dn: report.calculatedDinnerTotal,
    total: report.calculatedGrandTotal,
    meals: report.memberSummaries.reduce((acc, m) => acc + m.recordedMealsCount, 0),
    skipped: report.memberSummaries.reduce((acc, m) => acc + m.confirmedSkippedCount, 0),
  });
  memberTotalRow.font = { bold: true };
  memberTotalRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.border = borderStyle;
  });
  memberTotalRow.getCell('bf').numFmt = '₹#,##0.00';
  memberTotalRow.getCell('ln').numFmt = '₹#,##0.00';
  memberTotalRow.getCell('dn').numFmt = '₹#,##0.00';
  memberTotalRow.getCell('total').numFmt = '₹#,##0.00';

  // --------------------------------------------------------------------------
  // SHEET 3: Daily Summary
  // --------------------------------------------------------------------------
  const sheetDaily = workbook.addWorksheet('Daily Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheetDaily.columns = [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Day of Week', key: 'day', width: 16 },
    { header: 'Breakfast (₹)', key: 'bf', width: 16 },
    { header: 'Lunch (₹)', key: 'ln', width: 16 },
    { header: 'Dinner (₹)', key: 'dn', width: 16 },
    { header: 'Daily Total (₹)', key: 'total', width: 16 },
    { header: 'Members Count', key: 'members', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
  ];
  formatHeaderRow(sheetDaily.getRow(1));

  report.dailySummaries.forEach((d) => {
    const row = sheetDaily.addRow({
      date: d.date,
      day: formatDateDisplay(d.date, { includeDay: true }).split(',')[0],
      bf: d.breakfastTotal,
      ln: d.lunchTotal,
      dn: d.dinnerTotal,
      total: d.dailyTotal,
      members: d.membersRecorded,
      status: d.completionStatus.toUpperCase(),
    });

    row.getCell('bf').numFmt = '₹#,##0.00';
    row.getCell('ln').numFmt = '₹#,##0.00';
    row.getCell('dn').numFmt = '₹#,##0.00';
    row.getCell('total').numFmt = '₹#,##0.00';
    row.eachCell((c) => (c.border = borderStyle));
  });

  // --------------------------------------------------------------------------
  // SHEET 4: Food Summary
  // --------------------------------------------------------------------------
  const sheetFood = workbook.addWorksheet('Food Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheetFood.columns = [
    { header: 'Food Item', key: 'name', width: 24 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Total Quantity', key: 'qty', width: 14 },
    { header: 'Unit Price (₹)', key: 'price', width: 14 },
    { header: 'Total Cost (₹)', key: 'cost', width: 16 },
    { header: 'Unique Consumers', key: 'consumers', width: 18 },
    { header: 'Breakfast Qty', key: 'bfQty', width: 14 },
    { header: 'Lunch Qty', key: 'lnQty', width: 14 },
    { header: 'Dinner Qty', key: 'dnQty', width: 14 },
  ];
  formatHeaderRow(sheetFood.getRow(1));

  report.foodSummaries.forEach((f) => {
    const row = sheetFood.addRow({
      name: f.foodName,
      category: f.category.toUpperCase(),
      qty: f.totalQuantity,
      price: f.unitPrice,
      cost: f.totalCost,
      consumers: f.uniqueConsumersCount,
      bfQty: f.mealBreakdown.breakfast,
      lnQty: f.mealBreakdown.lunch,
      dnQty: f.mealBreakdown.dinner,
    });

    row.getCell('price').numFmt = '₹#,##0.00';
    row.getCell('cost').numFmt = '₹#,##0.00';
    row.eachCell((c) => (c.border = borderStyle));
  });

  // --------------------------------------------------------------------------
  // SHEET 5: Bill Reconciliation
  // --------------------------------------------------------------------------
  const sheetReconciliation = workbook.addWorksheet('Bill Reconciliation', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheetReconciliation.columns = [
    { header: 'Metric / Field', key: 'metric', width: 32 },
    { header: 'Value / Amount', key: 'value', width: 28 },
    { header: 'Notes & Verification Details', key: 'notes', width: 44 },
  ];
  formatHeaderRow(sheetReconciliation.getRow(1));

  const reconRows = [
    {
      metric: 'Billing Period Start',
      value: report.startDate,
      notes: formatDateDisplay(report.startDate),
    },
    {
      metric: 'Billing Period End',
      value: report.endDate,
      notes: formatDateDisplay(report.endDate),
    },
    {
      metric: 'Recorded Consumption Total',
      value: `₹${report.calculatedGrandTotal.toFixed(2)}`,
      notes: 'Sum of all confirmed member meal entries',
    },
    {
      metric: 'Reported Mess Bill Total',
      value: `₹${report.reportedMessBillTotal.toFixed(2)}`,
      notes: 'Total from verified WhatsApp/receipt bills',
    },
    {
      metric: 'Difference (Reported - Recorded)',
      value: `₹${report.discrepancy.toFixed(2)}`,
      notes:
        Math.abs(report.discrepancy) < 0.01
          ? 'Perfect Match (Reconciled)'
          : report.discrepancy > 0
          ? 'Unaccounted difference in Mess Bill'
          : 'Recorded consumption exceeds Mess Bill',
    },
    {
      metric: 'Reconciliation Status',
      value: report.status.toUpperCase(),
      notes: report.status === 'reconciled' ? 'Verified & Balanced' : 'Review Required',
    },
  ];

  reconRows.forEach((r) => {
    const row = sheetReconciliation.addRow(r);
    row.eachCell((c) => (c.border = borderStyle));
  });

  // Write and trigger download in browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}_${report.startDate}_to_${report.endDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
