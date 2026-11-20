import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
  Copy,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  Database,
} from 'lucide-react';
import type { GroupPeriodReport, Member, FoodEntry } from '../types';
import { formatCurrency, formatDateDisplay, getWeekRange, getMonthRange } from '../utils/calculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportCombinedReportPdf } from '../utils/pdfExport';
import { dataService } from '../services/dataService';

interface ExportCentreProps {
  currentReport: GroupPeriodReport;
  allEntries: FoodEntry[];
  members: Member[];
}

export const ExportCentre: React.FC<ExportCentreProps> = ({
  currentReport,
  allEntries,
  members,
}) => {
  const [exportStartDate, setExportStartDate] = useState(currentReport.startDate);
  const [exportEndDate, setExportEndDate] = useState(currentReport.endDate);
  const [copiedText, setCopiedText] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Quick preset ranges
  const setThisWeek = () => {
    const range = getWeekRange(new Date());
    setExportStartDate(range.startDate);
    setExportEndDate(range.endDate);
  };

  const setThisMonth = () => {
    const range = getMonthRange(new Date());
    setExportStartDate(range.startDate);
    setExportEndDate(range.endDate);
  };

  // Generate WhatsApp Plain Text Bill for easy pasting into group
  const generateWhatsAppSummaryText = (): string => {
    let msg = `*MESSMATE — GROUP BILL STATEMENT*\n`;
    msg += `Period: ${formatDateDisplay(exportStartDate, { short: true })} – ${formatDateDisplay(exportEndDate, { short: true })}\n`;
    msg += `Total Recorded Consumption: ${formatCurrency(currentReport.calculatedGrandTotal)}\n`;
    if (currentReport.reportedMessBillTotal > 0) {
      msg += `Reported Mess Bill: ${formatCurrency(currentReport.reportedMessBillTotal)}\n`;
      msg += `Status: ${currentReport.status.toUpperCase()}\n`;
    }
    msg += `\n*Individual Amounts Due:*\n`;

    currentReport.memberSummaries.forEach((m, idx) => {
      msg += `${idx + 1}. ${m.memberName}: ${formatCurrency(m.grandTotal)} (${m.recordedMealsCount} meals)\n`;
    });

    msg += `\n*Meal Distribution:*\n`;
    msg += `• Breakfast: ${formatCurrency(currentReport.calculatedBreakfastTotal)}\n`;
    msg += `• Lunch: ${formatCurrency(currentReport.calculatedLunchTotal)}\n`;
    msg += `• Dinner: ${formatCurrency(currentReport.calculatedDinnerTotal)}\n`;
    msg += `\nVerified via MessMate Smart Mess Billing Tracker.`;

    return msg;
  };

  const handleCopyWhatsAppText = async () => {
    const text = generateWhatsAppSummaryText();
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportReportToExcel(currentReport, allEntries, members, 'MessMate_Billing');
    } catch (e: any) {
      alert(`Failed to generate Excel file: ${e?.message}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleDownloadPdf = async (action: 'download' | 'share' = 'download') => {
    setIsExportingPdf(true);
    try {
      await exportCombinedReportPdf(currentReport, allEntries, members, action);
    } catch (e: any) {
      alert(`Failed to generate PDF document: ${e?.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = dataService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MessMate_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selection Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Document Export Centre</h2>
          <p className="text-xs text-slate-500">
            Generate audited multi-sheet Excel workbooks, combined multi-page PDF statements, or share directly to WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white font-tabular"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white font-tabular"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={setThisWeek}
              className="flex-1 py-1.5 text-xs rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              This Week
            </button>
            <button
              onClick={setThisMonth}
              className="flex-1 py-1.5 text-xs rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Primary Export Cards (Excel, PDF, WhatsApp) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Real Multi-Sheet Excel Workbook */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Excel Workbook (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete multi-worksheet workbook with styled headers, frozen top rows, formulas, and column widths.
            </p>

            <ul className="text-[11px] text-slate-600 space-y-1 mt-3 pl-3 list-disc">
              <li>Sheet 1: Food Entries Ledger</li>
              <li>Sheet 2: Member Summary & Totals</li>
              <li>Sheet 3: Daily Summary</li>
              <li>Sheet 4: Food Items Breakdown</li>
              <li>Sheet 5: Bill Reconciliation</li>
            </ul>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? 'Generating XLSX...' : 'Download Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* 2. Combined Multi-Page PDF Bill */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-3 border border-rose-200">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Combined PDF Statement (.pdf)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              A single multi-page PDF formatted cleanly for sharing with all group members.
            </p>

            <ul className="text-[11px] text-slate-600 space-y-1 mt-3 pl-3 list-disc">
              <li>Page 1: Group Summary & Reconciliation</li>
              <li>Pages 2+: Individual member itemized bills</li>
              <li>Subtotals for breakfast, lunch, and dinner</li>
              <li>Final Section: Group verification sign-off</li>
            </ul>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
            <button
              onClick={() => handleDownloadPdf('download')}
              disabled={isExportingPdf}
              className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download Combined PDF'}</span>
            </button>

            {/* Mobile Native Share */}
            <button
              onClick={() => handleDownloadPdf('share')}
              disabled={isExportingPdf}
              className="w-full py-1.5 px-3 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to WhatsApp (Mobile)</span>
            </button>
          </div>
        </div>

        {/* 3. Copy WhatsApp Summary Text */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3 border border-blue-200">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              WhatsApp Text Summary
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Copies a formatted text summary with bold member shares and totals to paste directly into your WhatsApp group.
            </p>

            <div className="mt-3 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[10px] text-slate-700 line-clamp-4">
              {generateWhatsAppSummaryText()}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={handleCopyWhatsAppText}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 ${
                copiedText
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
              }`}
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy WhatsApp Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Raw Backup Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Database className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Full System Raw Data Backup (.json)
            </h4>
            <p className="text-[11px] text-slate-500">
              Download complete database snapshot containing all members, price history, entries, and audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download JSON Backup</span>
        </button>
      </div>
    </div>
  );
};
