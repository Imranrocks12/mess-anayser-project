import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Receipt,
  Scale,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NavTab } from './Sidebar';
import type { GroupPeriodReport, FoodEntry, Member, MessBill } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/calculations';

interface DashboardProps {
  report: GroupPeriodReport;
  recentEntries: FoodEntry[];
  members: Member[];
  messBills: MessBill[];
  latestMessBill?: MessBill;
  activePeriod: { startDate: string; endDate: string; reportingType: string };
  onNavigate: (tab: NavTab) => void;
  onSelectDateForDailyEntry: (date: string) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPeriodChange: (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  recentEntries,
  members,
  messBills,
  latestMessBill,
  activePeriod,
  onNavigate,
  onSelectDateForDailyEntry,
  onExportExcel,
  onExportPdf,
  onPeriodChange,
}) => {
  const [filterMeal, setFilterMeal] = useState<string>('all');

  // Which mess bill record the user is currently viewing (index into messBills array)
  const [viewingBillIdx, setViewingBillIdx] = useState<number>(() =>
    messBills.length > 0 ? messBills.length - 1 : 0
  );

  // Keep viewingBillIdx in sync if a new bill is added (always jump to latest)
  useEffect(() => {
    if (messBills.length > 0) {
      setViewingBillIdx(messBills.length - 1);
    }
  }, [messBills.length]);

  const filteredRecentEntries = recentEntries
    .filter((e) => (filterMeal === 'all' ? true : e.mealType === filterMeal))
    .slice(0, 10);

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  const hasDiscrepancy = Math.abs(report.discrepancy) >= 0.01;

  return (
    <div className="space-y-6">
      {/* Mess Bill Billing Records Navigator */}
      {messBills.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Billing Record
              </span>
              <span className="text-[11px] text-slate-400">
                ({viewingBillIdx + 1} of {messBills.length})
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  const prevIdx = viewingBillIdx - 1;
                  if (prevIdx >= 0) {
                    setViewingBillIdx(prevIdx);
                    onPeriodChange(messBills[prevIdx].periodStart, messBills[prevIdx].periodEnd, 'custom');
                  }
                }}
                disabled={viewingBillIdx <= 0}
                className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous billing record"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const nextIdx = viewingBillIdx + 1;
                  if (nextIdx < messBills.length) {
                    setViewingBillIdx(nextIdx);
                    onPeriodChange(messBills[nextIdx].periodStart, messBills[nextIdx].periodEnd, 'custom');
                  }
                }}
                disabled={viewingBillIdx >= messBills.length - 1}
                className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next billing record"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {(() => {
            const bill = messBills[viewingBillIdx];
            if (!bill) return null;
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatDateDisplay(bill.periodStart, { short: true })} → {formatDateDisplay(bill.periodEnd, { short: true })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Imported {formatDateDisplay(bill.createdAt.split('T')[0], { short: true })} · Source: {bill.sourceType}
                    {bill.reconciliationStatus === 'reconciled' && (
                      <span className="ml-2 inline-flex items-center space-x-0.5 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Reconciled</span>
                      </span>
                    )}
                  </div>
                  {bill.notes && (
                    <div className="text-[11px] text-slate-500 mt-0.5 italic">{bill.notes}</div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Reported Total</div>
                    <div className="text-xl font-bold text-slate-900 font-tabular">
                      {formatCurrency(bill.reportedGrandTotal)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onPeriodChange(bill.periodStart, bill.periodEnd, 'custom');
                      onNavigate('reconciliation');
                    }}
                    className="shrink-0 inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <span>Reconcile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 flex items-center space-x-3">
          <Receipt className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <strong>No mess bill imported yet.</strong> Go to{' '}
            <button onClick={() => onNavigate('mess_bill_import')} className="underline font-semibold hover:text-blue-900">
              Mess Bill Import
            </button>{' '}
            to add the first billing record.
          </div>
        </div>
      )}

      {/* Discrepancy Banner */}
      {latestMessBill && hasDiscrepancy && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Reconciliation Discrepancy Detected: {formatCurrency(report.discrepancy)}
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Reported Mess Bill is {formatCurrency(report.reportedMessBillTotal)}, while recorded food consumption is{' '}
                {formatCurrency(report.calculatedGrandTotal)}. Difference of {formatCurrency(Math.abs(report.discrepancy))} needs manual review.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reconciliation')}
            className="shrink-0 inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Consumption */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Recorded Consumption</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-tabular">
            {formatCurrency(report.calculatedGrandTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {formatDateDisplay(activePeriod.startDate, { short: true })} – {formatDateDisplay(activePeriod.endDate, { short: true })}
          </div>
        </div>

        {/* Reported Mess Bill */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Reported Mess Bill</span>
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-tabular">
            {formatCurrency(report.reportedMessBillTotal)}
          </div>
          <div className="text-[11px] mt-1 flex items-center space-x-1.5">
            {latestMessBill ? (
              <span className="text-emerald-600 font-medium flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Latest bill verified
              </span>
            ) : (
              <span className="text-slate-400">No bill uploaded</span>
            )}
          </div>
        </div>

        {/* Discrepancy Amount */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Discrepancy (Diff)</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-tabular ${
              Math.abs(report.discrepancy) < 0.01
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            {report.discrepancy > 0 ? `+${formatCurrency(report.discrepancy)}` : formatCurrency(report.discrepancy)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {Math.abs(report.discrepancy) < 0.01
              ? 'Balanced with mess bill'
              : 'Requires review'}
          </div>
        </div>

        {/* Group Tracking Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Group Members</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {report.activeMembersCount} <span className="text-xs font-normal text-slate-500">Active</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {report.completedDaysCount} of {report.dailySummaries.length} days completed
          </div>
        </div>
      </div>

      {/* Meal Subtotals Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Breakfast</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5 font-tabular">
            {formatCurrency(report.calculatedBreakfastTotal)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Lunch</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5 font-tabular">
            {formatCurrency(report.calculatedLunchTotal)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Dinner</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5 font-tabular">
            {formatCurrency(report.calculatedDinnerTotal)}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => onNavigate('daily_entry')}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 transition-all text-center"
          >
            <UtensilsCrossed className="w-5 h-5 mb-1.5 text-blue-600" />
            <span className="text-xs font-medium">Record Entry</span>
          </button>

          <button
            onClick={() => onNavigate('mess_bill_import')}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-all text-center"
          >
            <Receipt className="w-5 h-5 mb-1.5 text-slate-600" />
            <span className="text-xs font-medium">Import Bill</span>
          </button>

          <button
            onClick={() => onNavigate('reconciliation')}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-all text-center"
          >
            <Scale className="w-5 h-5 mb-1.5 text-amber-600" />
            <span className="text-xs font-medium">Reconcile</span>
          </button>

          <button
            onClick={() => onNavigate('weekly_reports')}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 transition-all text-center"
          >
            <CalendarDays className="w-5 h-5 mb-1.5 text-indigo-600" />
            <span className="text-xs font-medium">Weekly Report</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 transition-all text-center"
          >
            <FileSpreadsheet className="w-5 h-5 mb-1.5 text-emerald-600" />
            <span className="text-xs font-medium">Export Excel</span>
          </button>

          <button
            onClick={onExportPdf}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 text-slate-700 hover:text-rose-700 transition-all text-center"
          >
            <FileText className="w-5 h-5 mb-1.5 text-rose-600" />
            <span className="text-xs font-medium">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Daily Calendar Progress + Member Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Progress in Current Period */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Days in Billing Period</span>
            </h3>
            <span className="text-xs text-slate-400">Click day to record</span>
          </div>

          <div className="space-y-1.5">
            {report.dailySummaries.map((day) => {
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={day.date}
                  onClick={() => onSelectDateForDailyEntry(day.date)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isToday
                      ? 'border-blue-300 bg-blue-50/30 hover:bg-blue-50'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        day.completionStatus === 'complete'
                          ? 'bg-emerald-500'
                          : day.completionStatus === 'partial'
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-800">
                        {formatDateDisplay(day.date, { includeDay: true })}
                        {isToday && (
                          <span className="ml-1.5 text-[10px] text-blue-600 font-semibold uppercase">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {day.membersRecorded} of {report.activeMembersCount} members recorded
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 font-tabular">
                      {formatCurrency(day.dailyTotal)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      B: {formatCurrency(day.breakfastTotal)} | L: {formatCurrency(day.lunchTotal)} | D:{' '}
                      {formatCurrency(day.dinnerTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Spending Snapshot */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Member Spending Breakdown</span>
            </h3>
            <button
              onClick={() => onNavigate('members')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {report.memberSummaries.map((m) => {
              const percentage = report.calculatedGrandTotal > 0
                ? (m.grandTotal / report.calculatedGrandTotal) * 100
                : 0;

              return (
                <div key={m.memberId} className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800">{m.memberName}</span>
                    <span className="font-semibold text-slate-900 font-tabular">
                      {formatCurrency(m.grandTotal)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {m.recordedMealsCount} meals recorded {m.confirmedSkippedCount > 0 && `(${m.confirmedSkippedCount} skipped)`}
                    </span>
                    <span>{percentage.toFixed(1)}% of total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Food Entries Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Food Consumption Entries</span>
            </h3>
            <p className="text-xs text-slate-500">Live entries recorded by administrator</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={filterMeal}
              onChange={(e) => setFilterMeal(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
            <button
              onClick={() => onNavigate('daily_entry')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1"
            >
              Add New
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Member</th>
                <th className="py-2.5 px-4 font-medium">Meal</th>
                <th className="py-2.5 px-4 font-medium">Food Item</th>
                <th className="py-2.5 px-4 font-medium text-right">Qty</th>
                <th className="py-2.5 px-4 font-medium text-right">Unit Price</th>
                <th className="py-2.5 px-4 font-medium text-right">Line Total</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecentEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRecentEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-600">{formatDateDisplay(entry.date, { short: true })}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {memberMap.get(entry.memberId) || 'Unknown'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 uppercase text-[10px] font-semibold">
                      {entry.mealType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{entry.foodNameSnapshot}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 font-tabular">
                      {entry.status === 'confirmed_no_food' ? '-' : entry.quantity}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500 font-tabular">
                      {formatCurrency(entry.unitPrice)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-tabular">
                      {formatCurrency(entry.lineTotal)}
                    </td>
                    <td className="py-2.5 px-4">
                      {entry.status === 'confirmed_no_food' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          Skipped
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                          Confirmed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
