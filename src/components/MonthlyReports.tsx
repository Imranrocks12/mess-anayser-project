import React, { useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Users,
  Utensils,
  Calendar,
} from 'lucide-react';
import type { GroupPeriodReport, Member, FoodItem } from '../types';
import { formatCurrency, formatDateDisplay, getMonthRange } from '../utils/calculations';

interface MonthlyReportsProps {
  report: GroupPeriodReport;
  members: Member[];
  foodItems: FoodItem[];
  onPeriodChange: (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const MonthlyReports: React.FC<MonthlyReportsProps> = ({
  report,
  members,
  onPeriodChange,
  onExportExcel,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'food' | 'daily'>('members');

  // Month navigation
  const currentStartDate = new Date(report.startDate + 'T00:00:00');

  const handlePrevMonth = () => {
    const d = new Date(currentStartDate);
    d.setMonth(d.getMonth() - 1);
    const range = getMonthRange(d);
    onPeriodChange(range.startDate, range.endDate, 'monthly');
  };

  const handleNextMonth = () => {
    const d = new Date(currentStartDate);
    d.setMonth(d.getMonth() + 1);
    const range = getMonthRange(d);
    onPeriodChange(range.startDate, range.endDate, 'monthly');
  };

  const handleCurrentMonth = () => {
    const range = getMonthRange(new Date());
    onPeriodChange(range.startDate, range.endDate, 'monthly');
  };

  const monthLabel = currentStartDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Month: {monthLabel} ({formatDateDisplay(report.startDate, { short: true })} – {formatDateDisplay(report.endDate, { short: true })})
            </span>
            <button
              onClick={handleCurrentMonth}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium"
            >
              Current Month
            </button>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Monthly Excel</span>
          </button>

          <button
            onClick={onExportPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Monthly PDF</span>
          </button>
        </div>
      </div>

      {/* Monthly Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Monthly Consumption</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.calculatedGrandTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total recorded across all members</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Reported Mess Bills</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.reportedMessBillTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{report.messBills.length} mess bills imported</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Discrepancy (Diff)</div>
          <div
            className={`text-xl font-bold font-tabular mt-0.5 ${
              Math.abs(report.discrepancy) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {report.discrepancy > 0 ? `+${formatCurrency(report.discrepancy)}` : formatCurrency(report.discrepancy)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {Math.abs(report.discrepancy) < 0.01 ? 'Balanced' : 'Discrepancy exists'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Active Group Members</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {report.activeMembersCount} People
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {report.completedDaysCount} complete days
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex space-x-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Monthly Totals ({report.memberSummaries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('food')}
            className={`py-3.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'food'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Monthly Food Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`py-3.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'daily'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily History</span>
          </button>
        </div>

        {/* Members Monthly Table */}
        {activeTab === 'members' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium text-right">Breakfast</th>
                  <th className="py-2.5 px-4 font-medium text-right">Lunch</th>
                  <th className="py-2.5 px-4 font-medium text-right">Dinner</th>
                  <th className="py-2.5 px-4 font-medium text-right">Monthly Share Due</th>
                  <th className="py-2.5 px-4 font-medium">Recorded Meals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.memberSummaries.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.memberName}</td>
                    <td className="py-3 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(m.breakfastTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(m.lunchTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(m.dinnerTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-tabular text-sm">
                      {formatCurrency(m.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.recordedMealsCount} meals {m.confirmedSkippedCount > 0 && `(${m.confirmedSkippedCount} skipped)`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-semibold text-slate-900 border-t border-slate-200">
                  <td className="py-3 px-4">MONTHLY GROUP TOTAL</td>
                  <td className="py-3 px-4 text-right font-tabular">
                    {formatCurrency(report.calculatedBreakfastTotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-tabular">
                    {formatCurrency(report.calculatedLunchTotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-tabular">
                    {formatCurrency(report.calculatedDinnerTotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-tabular text-sm text-blue-700">
                    {formatCurrency(report.calculatedGrandTotal)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-normal">
                    {report.activeMembersCount} members
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Food Monthly Table */}
        {activeTab === 'food' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Food Item</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium text-right">Quantity</th>
                  <th className="py-2.5 px-4 font-medium text-right">Unit Price</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total Cost</th>
                  <th className="py-2.5 px-4 font-medium text-right">Consumers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.foodSummaries.map((f) => (
                  <tr key={f.foodItemId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{f.foodName}</td>
                    <td className="py-2.5 px-4 capitalize text-slate-500">{f.category}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-tabular">
                      {f.totalQuantity}
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-slate-500">
                      {formatCurrency(f.unitPrice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-tabular">
                      {formatCurrency(f.totalCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-tabular">
                      {f.uniqueConsumersCount} people
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Daily History */}
        {activeTab === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Breakfast</th>
                  <th className="py-2.5 px-4 font-medium text-right">Lunch</th>
                  <th className="py-2.5 px-4 font-medium text-right">Dinner</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.dailySummaries.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50/70">
                    <td className="py-2 px-4 font-medium text-slate-900">
                      {formatDateDisplay(d.date, { includeDay: true })}
                    </td>
                    <td className="py-2 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.breakfastTotal)}
                    </td>
                    <td className="py-2 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.lunchTotal)}
                    </td>
                    <td className="py-2 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.dinnerTotal)}
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-slate-900 font-tabular">
                      {formatCurrency(d.dailyTotal)}
                    </td>
                    <td className="py-2 px-4">
                      {d.completionStatus === 'complete' ? (
                        <span className="text-[10px] text-emerald-700 font-medium">Complete</span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-medium">Partial</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
