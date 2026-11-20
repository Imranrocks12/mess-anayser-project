import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Users,
  Utensils,
  Calendar,
} from 'lucide-react';
import type { GroupPeriodReport, Member, FoodItem } from '../types';
import { formatCurrency, formatDateDisplay, getWeekRange } from '../utils/calculations';

interface WeeklyReportsProps {
  report: GroupPeriodReport;
  members: Member[];
  foodItems: FoodItem[];
  onPeriodChange: (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const WeeklyReports: React.FC<WeeklyReportsProps> = ({
  report,
  members,
  foodItems,
  onPeriodChange,
  onExportExcel,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'food' | 'daily'>('members');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [selectedFoodFilter, setSelectedFoodFilter] = useState<string>('all');

  const handlePrevWeek = () => {
    const currentStart = new Date(report.startDate + 'T00:00:00');
    currentStart.setDate(currentStart.getDate() - 7);
    const range = getWeekRange(currentStart);
    onPeriodChange(range.startDate, range.endDate, 'weekly');
  };

  const handleNextWeek = () => {
    const currentStart = new Date(report.startDate + 'T00:00:00');
    currentStart.setDate(currentStart.getDate() + 7);
    const range = getWeekRange(currentStart);
    onPeriodChange(range.startDate, range.endDate, 'weekly');
  };

  const handleThisWeek = () => {
    const range = getWeekRange(new Date());
    onPeriodChange(range.startDate, range.endDate, 'weekly');
  };

  // Filtered members
  const filteredMembers = report.memberSummaries.filter((m) =>
    selectedMemberFilter === 'all' ? true : m.memberId === selectedMemberFilter
  );

  // Filtered foods
  const filteredFoods = report.foodSummaries.filter((f) =>
    selectedFoodFilter === 'all' ? true : f.foodItemId === selectedFoodFilter
  );

  return (
    <div className="space-y-6">
      {/* Week Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Week: {formatDateDisplay(report.startDate, { short: true })} – {formatDateDisplay(report.endDate, { short: true })}
            </span>
            <button
              onClick={handleThisWeek}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium"
            >
              Current Week
            </button>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
            title="Next Week"
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
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={onExportPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Statement</span>
          </button>
        </div>
      </div>

      {/* Incomplete Warning if any */}
      {report.incompleteDaysCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {report.incompleteDaysCount} day(s) in this week have partial or unrecorded meal consumption.
            Make sure to record all members before finalizing the report.
          </span>
        </div>
      )}

      {/* Group Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Weekly Food Total</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.calculatedGrandTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Recorded Consumption</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Breakfast Subtotal</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.calculatedBreakfastTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Morning meals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Lunch Subtotal</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.calculatedLunchTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Afternoon meals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Dinner Subtotal</div>
          <div className="text-xl font-bold text-slate-900 font-tabular mt-0.5">
            {formatCurrency(report.calculatedDinnerTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Night meals</div>
        </div>
      </div>

      {/* Report View Tabs: Member Summary | Food Breakdown | Daily Log */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-3.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Member-Wise Summary ({report.memberSummaries.length})</span>
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
              <span>Food-Wise Consumption ({report.foodSummaries.length})</span>
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
              <span>Daily Breakdown ({report.dailySummaries.length} days)</span>
            </button>
          </div>

          {/* Filter dropdown */}
          {activeTab === 'members' && (
            <div className="py-2">
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-700"
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'food' && (
            <div className="py-2">
              <select
                value={selectedFoodFilter}
                onChange={(e) => setSelectedFoodFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-700"
              >
                <option value="all">All Food Items</option>
                {foodItems.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Member-Wise Breakdown */}
        {activeTab === 'members' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium text-right">Breakfast</th>
                  <th className="py-2.5 px-4 font-medium text-right">Lunch</th>
                  <th className="py-2.5 px-4 font-medium text-right">Dinner</th>
                  <th className="py-2.5 px-4 font-medium text-right">Weekly Total Due</th>
                  <th className="py-2.5 px-4 font-medium">Recorded Meals</th>
                  <th className="py-2.5 px-4 font-medium">Consumed Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.memberName}
                    </td>
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
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {m.itemBreakdown.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {item.foodName} ({item.quantity})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-semibold text-slate-900 border-t border-slate-200">
                  <td className="py-3 px-4">GROUP TOTAL</td>
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
                  <td colSpan={2} className="py-3 px-4 text-slate-600 text-xs font-normal">
                    Matches sum of individual member bills
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Tab 2: Food Consumption Breakdown */}
        {activeTab === 'food' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Food Item</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total Qty Consumed</th>
                  <th className="py-2.5 px-4 font-medium text-right">Unit Rate</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total Cost</th>
                  <th className="py-2.5 px-4 font-medium text-right">Unique Consumers</th>
                  <th className="py-2.5 px-4 font-medium text-right">B / L / D Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFoods.map((f) => (
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
                    <td className="py-2.5 px-4 text-right font-tabular text-[11px] text-slate-500">
                      {f.mealBreakdown.breakfast} / {f.mealBreakdown.lunch} / {f.mealBreakdown.dinner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Daily Summary Breakdown */}
        {activeTab === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Breakfast</th>
                  <th className="py-2.5 px-4 font-medium text-right">Lunch</th>
                  <th className="py-2.5 px-4 font-medium text-right">Dinner</th>
                  <th className="py-2.5 px-4 font-medium text-right">Daily Total</th>
                  <th className="py-2.5 px-4 font-medium">Recorded Members</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.dailySummaries.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {formatDateDisplay(d.date, { includeDay: true })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.breakfastTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.lunchTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-tabular text-slate-600">
                      {formatCurrency(d.dinnerTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-tabular">
                      {formatCurrency(d.dailyTotal)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {d.membersRecorded} of {report.activeMembersCount}
                    </td>
                    <td className="py-2.5 px-4">
                      {d.completionStatus === 'complete' ? (
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                          Complete
                        </span>
                      ) : d.completionStatus === 'partial' ? (
                        <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                          Partial
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          Not Recorded
                        </span>
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
