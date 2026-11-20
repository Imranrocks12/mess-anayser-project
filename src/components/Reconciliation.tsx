import React, { useState, useMemo } from 'react';
import {
  Scale,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  ArrowRight,
  MessageSquare,
  Copy,
  Check,
  Share2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { GroupPeriodReport, BillingPeriod } from '../types';
import { formatCurrency, formatDateDisplay, shiftDateDays } from '../utils/calculations';
import { dataService } from '../services/dataService';

interface ReconciliationProps {
  report: GroupPeriodReport;
  billingPeriods: BillingPeriod[];
  onPeriodChange: (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => void;
  onNavigateToDailyEntry: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const Reconciliation: React.FC<ReconciliationProps> = ({
  report,
  billingPeriods,
  onPeriodChange,
  onNavigateToDailyEntry,
  onExportExcel,
  onExportPdf,
}) => {
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState(
    'Reviewed food lines and cross-verified against mess in-charge bill.'
  );
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const handlePrevWeek = () => {
    const newStart = shiftDateDays(report.startDate, -7);
    const newEnd = shiftDateDays(report.endDate, -7);
    onPeriodChange(newStart, newEnd, 'weekly');
  };

  const handleNextWeek = () => {
    const newStart = shiftDateDays(report.startDate, 7);
    const newEnd = shiftDateDays(report.endDate, 7);
    onPeriodChange(newStart, newEnd, 'weekly');
  };

  const activeMembers = useMemo(() => dataService.getMembers().filter((m) => m.active), [report]);

  const whatsappMessage = useMemo(() => {
    const periodStr = `${formatDateDisplay(report.startDate, { short: true })} – ${formatDateDisplay(report.endDate, { short: true })}`;
    let msg = `🍱 *MESS BILL & CROSS VERIFICATION SUMMARY*\n`;
    msg += `📅 *Period:* ${periodStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Recorded Consumption:* ${formatCurrency(report.calculatedGrandTotal || 0)}\n`;
    msg += `🧾 *Reported Mess Bill:* ${formatCurrency(report.reportedMessBillTotal || 0)}\n`;
    msg += `⚖️ *Discrepancy:* ${formatCurrency(report.discrepancy || 0)}\n`;
    msg += `📌 *Status:* ${
      report.status === 'reconciled'
        ? '✅ Reconciled (Matched)'
        : report.status === 'finalized'
        ? '🔒 Finalized'
        : '⚠️ Needs Review'
    }\n\n`;

    // Meal Breakdown
    msg += `🍽️ *Meal-Wise Totals:*\n`;
    msg += `• Breakfast: ${formatCurrency(report.calculatedBreakfastTotal || 0)}\n`;
    msg += `• Lunch: ${formatCurrency(report.calculatedLunchTotal || 0)}\n`;
    msg += `• Dinner: ${formatCurrency(report.calculatedDinnerTotal || 0)}\n\n`;

    // Member-Wise Dues
    msg += `👥 *Individual Member Dues:*\n`;
    const membersList =
      report.memberSummaries && report.memberSummaries.length > 0
        ? report.memberSummaries
        : activeMembers.map((m) => ({ memberId: m.id, memberName: m.name, grandTotal: 0 }));

    if (membersList.length > 0) {
      membersList.forEach((ms, idx) => {
        msg += `${idx + 1}. ${ms.memberName}: *${formatCurrency(ms.grandTotal || 0)}*\n`;
      });
    } else {
      msg += `• No member dues recorded: ₹0\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Generated via MessMate_`;
    return msg;
  }, [report, activeMembers]);

  const handleCopyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = whatsappMessage;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2500);
    }
  };

  const handleOpenWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const isReconciled = Math.abs(report.discrepancy) < 0.01;
  const isFinalized = report.status === 'finalized';

  const existingPeriod = billingPeriods.find(
    (bp) => bp.startDate === report.startDate && bp.endDate === report.endDate
  );

  // Status Update Handlers
  const handleMarkAsReconciled = () => {
    const periodId = existingPeriod?.id || `bp_${report.startDate}_${report.endDate}`;
    dataService.saveBillingPeriod({
      id: periodId,
      startDate: report.startDate,
      endDate: report.endDate,
      reportingType: report.reportingType,
      calculatedBreakfastTotal: report.calculatedBreakfastTotal,
      calculatedLunchTotal: report.calculatedLunchTotal,
      calculatedDinnerTotal: report.calculatedDinnerTotal,
      calculatedGrandTotal: report.calculatedGrandTotal,
      reportedMessBillTotal: report.reportedMessBillTotal,
      difference: report.discrepancy,
      status: 'reconciled',
      notes: resolutionNotes,
    });
    alert('Billing period marked as RECONCILED.');
  };

  const handleFinalizeBill = () => {
    if (!isReconciled) {
      if (!window.confirm(`Warning: A discrepancy of ${formatCurrency(report.discrepancy)} is still present. Are you sure you want to finalize this billing period?`)) {
        return;
      }
    }

    const periodId = existingPeriod?.id || `bp_${report.startDate}_${report.endDate}`;
    // Save first if not existing
    dataService.saveBillingPeriod({
      id: periodId,
      startDate: report.startDate,
      endDate: report.endDate,
      reportingType: report.reportingType,
      calculatedBreakfastTotal: report.calculatedBreakfastTotal,
      calculatedLunchTotal: report.calculatedLunchTotal,
      calculatedDinnerTotal: report.calculatedDinnerTotal,
      calculatedGrandTotal: report.calculatedGrandTotal,
      reportedMessBillTotal: report.reportedMessBillTotal,
      difference: report.discrepancy,
      status: 'reconciled',
      notes: resolutionNotes,
    });

    dataService.finalizeBillingPeriod(periodId, 'Imran (Admin)');
    alert('Billing period has been FINALIZED and locked.');
  };

  const handleReopenPeriod = () => {
    if (!existingPeriod || !reopenReason.trim()) return;
    dataService.reopenBillingPeriod(existingPeriod.id, reopenReason.trim());
    setShowReopenModal(false);
    setReopenReason('');
    alert('Billing period reopened for corrections.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Active Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Bill Reconciliation Engine
              </h2>
              {isFinalized ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Finalized & Locked</span>
                </span>
              ) : isReconciled ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Reconciled (Balanced)</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Needs Review (Discrepancy)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Period: {formatDateDisplay(report.startDate)} to {formatDateDisplay(report.endDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {billingPeriods.length > 0 && (
              <select
                value={`${report.startDate}_${report.endDate}`}
                onChange={(e) => {
                  const bp = billingPeriods.find(b => `${b.startDate}_${b.endDate}` === e.target.value);
                  if (bp) {
                    onPeriodChange(bp.startDate, bp.endDate, bp.reportingType);
                  }
                }}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
                title="Select Billing Period"
              >
                <option value={`${report.startDate}_${report.endDate}`}>
                  Current: {formatDateDisplay(report.startDate, { short: true })} – {formatDateDisplay(report.endDate, { short: true })}
                </option>
                {billingPeriods
                  .filter((b) => !(b.startDate === report.startDate && b.endDate === report.endDate))
                  .map((b) => (
                    <option key={b.id} value={`${b.startDate}_${b.endDate}`}>
                      {formatDateDisplay(b.startDate, { short: true })} – {formatDateDisplay(b.endDate, { short: true })} ({b.status})
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={onExportExcel}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Export Reconciliation as Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              onClick={onExportPdf}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Export Reconciliation as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF</span>
            </button>

            {!isFinalized ? (
              <>
                <button
                  onClick={handleMarkAsReconciled}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Mark as Reconciled
                </button>
                <button
                  onClick={handleFinalizeBill}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors flex items-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Finalize Bill</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowReopenModal(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Finalized Bill</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A. Recorded Consumption Total */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>A. Recorded Consumption</span>
            <span className="text-[10px] text-slate-400">Sum of members</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-tabular mt-2">
            {formatCurrency(report.calculatedGrandTotal)}
          </div>
          <div className="text-xs text-slate-500 mt-2 space-y-1 border-t border-slate-100 pt-2">
            <div className="flex justify-between">
              <span>Breakfast:</span>
              <span className="font-tabular">{formatCurrency(report.calculatedBreakfastTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lunch:</span>
              <span className="font-tabular">{formatCurrency(report.calculatedLunchTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Dinner:</span>
              <span className="font-tabular">{formatCurrency(report.calculatedDinnerTotal)}</span>
            </div>
          </div>
        </div>

        {/* B. Reported Mess Bill */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>B. Reported Mess Bill</span>
            <span className="text-[10px] text-slate-400">In-Charge Bill</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-tabular mt-2">
            {formatCurrency(report.reportedMessBillTotal)}
          </div>
          <div className="text-xs text-slate-500 mt-2 space-y-1 border-t border-slate-100 pt-2">
            <div className="flex justify-between">
              <span>Source:</span>
              <span className="capitalize">{report.messBills[0]?.sourceType || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Imported Bills:</span>
              <span>{report.messBills.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Itemized Lines:</span>
              <span>{report.messBills[0]?.items?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Difference = B - A */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Difference (B − A)</span>
            <Scale className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-2xl font-bold font-tabular mt-2 ${
              isReconciled ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {report.discrepancy > 0 ? `+${formatCurrency(report.discrepancy)}` : formatCurrency(report.discrepancy)}
          </div>
          <div className="text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2">
            {isReconciled ? (
              <p className="text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                No difference. Perfect match between recorded food and mess bill.
              </p>
            ) : (
              <p className="text-rose-700 font-medium">
                {report.discrepancy > 0
                  ? `Mess bill is ${formatCurrency(report.discrepancy)} higher than recorded food.`
                  : `Recorded food is ${formatCurrency(Math.abs(report.discrepancy))} higher than mess bill.`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancy Diagnostics Checklist */}
      {!isReconciled && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Discrepancy Investigation Checklist</span>
          </h3>
          <p className="text-xs text-amber-800">
            MessMate never automatically distributes unexplained differences among members or alters totals silently. Check the following potential causes:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <div className="bg-white p-2.5 rounded border border-amber-200 flex items-start space-x-2">
              <input type="checkbox" className="mt-0.5 rounded text-blue-600" />
              <div>
                <strong>Missing food entry:</strong> Did someone eat lunch or dinner on a day that wasn't recorded?
              </div>
            </div>

            <div className="bg-white p-2.5 rounded border border-amber-200 flex items-start space-x-2">
              <input type="checkbox" className="mt-0.5 rounded text-blue-600" />
              <div>
                <strong>Incorrect quantity:</strong> Was an extra egg or roti recorded as 1 instead of 2?
              </div>
            </div>

            <div className="bg-white p-2.5 rounded border border-amber-200 flex items-start space-x-2">
              <input type="checkbox" className="mt-0.5 rounded text-blue-600" />
              <div>
                <strong>Price change:</strong> Did the mess in-charge change a dish price that differs from our menu?
              </div>
            </div>

            <div className="bg-white p-2.5 rounded border border-amber-200 flex items-start space-x-2">
              <input type="checkbox" className="mt-0.5 rounded text-blue-600" />
              <div>
                <strong>Non-consumption charge:</strong> Does the mess bill include water bottles, delivery, or gas charges?
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-amber-800">
              Need to add missing entries or adjust quantities?
            </span>
            <button
              onClick={onNavigateToDailyEntry}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <span>Go to Daily Food Entry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Itemized Comparison Table (if imported bill has itemized items) */}
      {report.messBills[0]?.items && report.messBills[0].items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Food Item-Wise Cross Verification
            </h3>
            <p className="text-xs text-slate-500">
              Compares quantities extracted from mess bill with total quantities recorded in our ledger
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Food Item</th>
                  <th className="py-2.5 px-4 font-medium text-right">Recorded Total Qty</th>
                  <th className="py-2.5 px-4 font-medium text-right">Reported Bill Qty</th>
                  <th className="py-2.5 px-4 font-medium text-right">Qty Difference</th>
                  <th className="py-2.5 px-4 font-medium text-right">Recorded Cost</th>
                  <th className="py-2.5 px-4 font-medium text-right">Reported Cost</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const map = new Map<string, {
                    foodName: string;
                    recordedQty: number;
                    reportedQty: number;
                    recordedCost: number;
                    reportedCost: number;
                  }>();

                  report.foodSummaries.forEach((f) => {
                    map.set(f.foodName.toLowerCase().trim(), {
                      foodName: f.foodName,
                      recordedQty: f.totalQuantity,
                      reportedQty: 0,
                      recordedCost: f.totalCost,
                      reportedCost: 0,
                    });
                  });

                  report.messBills[0]?.items?.forEach((bi) => {
                    const key = bi.foodName.toLowerCase().trim();
                    const existing = map.get(key);
                    if (existing) {
                      existing.reportedQty = bi.quantity;
                      existing.reportedCost = bi.lineTotal;
                    } else {
                      map.set(key, {
                        foodName: bi.foodName,
                        recordedQty: 0,
                        reportedQty: bi.quantity,
                        recordedCost: 0,
                        reportedCost: bi.lineTotal,
                      });
                    }
                  });

                  return Array.from(map.values()).map((item, idx) => {
                    const qtyDiff = item.reportedQty - item.recordedQty;
                    const isMismatch = item.recordedQty > 0 && item.reportedQty > 0 && Math.abs(qtyDiff) > 0.01;
                    const isNotInBill = item.reportedQty === 0;
                    const isNotRecorded = item.recordedQty === 0;

                    return (
                      <tr key={idx} className={`hover:bg-slate-50/70 ${isMismatch ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.foodName}</td>
                        <td className="py-2.5 px-4 text-right font-tabular text-slate-700">
                          {item.recordedQty > 0 ? item.recordedQty : <span className="text-slate-400">0</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-tabular text-slate-700">
                          {item.reportedQty > 0 ? item.reportedQty : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-tabular">
                          {isNotInBill ? (
                            <span className="text-slate-400">N/A</span>
                          ) : isNotRecorded ? (
                            <span className="text-amber-600 font-medium">N/A (+{item.reportedQty})</span>
                          ) : qtyDiff === 0 ? (
                            <span className="text-emerald-600 font-semibold">0</span>
                          ) : (
                            <span className="text-rose-600 font-bold">
                              {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-tabular">
                          {formatCurrency(item.recordedCost)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-tabular">
                          {item.reportedCost > 0 ? formatCurrency(item.reportedCost) : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          {isNotInBill ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              N/A: Not in bill
                            </span>
                          ) : isNotRecorded ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              N/A: Not in ledger
                            </span>
                          ) : Math.abs(qtyDiff) < 0.1 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              Matched
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              ⚠️ Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Copy WhatsApp Message Section (Below Cross Verification) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-linear-to-r from-emerald-50/50 via-white to-slate-50/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                WhatsApp Weekly Bill Summary
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-tabular">
                {formatDateDisplay(report.startDate, { short: true })} – {formatDateDisplay(report.endDate, { short: true })}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live summary for the selected week. Switch weeks to view that week's data (shows ₹0 if no entries exist).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Week navigation buttons */}
            <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden text-xs shadow-2xs">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-1 border-r border-slate-200 transition-colors"
                title="View Previous Week"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Week</span>
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-colors"
                title="View Next Week"
              >
                <span>Next Week</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyWhatsapp}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer shadow-2xs ${
                copiedWhatsapp
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'
              }`}
            >
              {copiedWhatsapp ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy WhatsApp Message</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsapp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              title="Share directly to WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-xl mx-auto bg-white rounded-lg border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Formatted WhatsApp Message
              </span>
              <span className="text-[10px] text-slate-400">Ready to paste</span>
            </div>
            <pre className="text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed select-all bg-slate-50/60 p-3 rounded-md border border-slate-200/50">
              {whatsappMessage}
            </pre>
          </div>
        </div>
      </div>

      {/* Resolution Notes Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Reconciliation Audit Notes & Resolution Explanation
        </label>
        <textarea
          rows={3}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Record notes explaining any accepted differences or verification rationale..."
          className="w-full text-xs border border-slate-200 rounded-md p-3 text-slate-800"
        />
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>Notes will be saved in the permanent audit trail.</span>
          <button
            onClick={handleMarkAsReconciled}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Save Notes
          </button>
        </div>
      </div>

      {/* Reopen Finalized Bill Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Unlock className="w-4 h-4 text-amber-600" />
              <span>Reopen Finalized Billing Period</span>
            </h3>
            <p className="text-xs text-slate-600">
              Reopening a finalized report allows you to adjust entries, but requires an audit reason.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Reason for Reopening (Required)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mess in-charge sent corrected bill on Monday"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reopenReason.trim()}
                onClick={handleReopenPeriod}
                className="px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                Reopen Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
