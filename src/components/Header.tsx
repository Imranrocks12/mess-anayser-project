import React, { useMemo } from 'react';
import {
  Menu,
  Calendar,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  FileText,
  Scale,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { NavTab } from './Sidebar';
import { formatDateDisplay, shiftDateDays, getWeekRange } from '../utils/calculations';
import type { AppUser } from '../types/auth';

interface HeaderProps {
  currentTab: NavTab;
  onOpenSidebar: () => void;
  onNavigate: (tab: NavTab) => void;
  activePeriod: { startDate: string; endDate: string };
  periodStatus: 'draft' | 'needs_review' | 'reconciled' | 'finalized';
  onQuickExportExcel: () => void;
  onQuickExportPdf: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onPeriodChange?: (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSidebar,
  onNavigate,
  activePeriod,
  periodStatus,
  onQuickExportExcel,
  onQuickExportPdf,
  currentUser,
  onLogout,
  onPeriodChange,
}) => {
  const currentWeek = useMemo(() => getWeekRange(new Date()), []);
  const isCurrentWeek =
    activePeriod.startDate === currentWeek.startDate &&
    activePeriod.endDate === currentWeek.endDate;

  const getTabTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'daily_entry':
        return 'Daily Food Consumption Entry';
      case 'members':
        return 'Group Members Management';
      case 'menu_prices':
        return 'Menu Items & Pricing Configuration';
      case 'mess_bill_import':
        return 'Mess Bill Import (WhatsApp / OCR)';
      case 'reconciliation':
        return 'Bill Reconciliation Engine';
      case 'weekly_reports':
        return 'Weekly Breakdown Reports';
      case 'monthly_reports':
        return 'Monthly Billing Reports';
      case 'export_centre':
        return 'Export & Document Centre';
      case 'settings':
        return 'Application Settings & Backups';
      default:
        return 'MessMate';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reconciled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Reconciled
          </span>
        );
      case 'finalized':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Finalized
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Needs Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Draft
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle & Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate">
              {getTabTitle(currentTab)}
            </h1>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-600 mt-0.5">
              <div className="inline-flex items-center space-x-1 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-md p-0.5 shadow-2xs transition-colors">
                {onPeriodChange && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStart = shiftDateDays(activePeriod.startDate, -7);
                      const newEnd = shiftDateDays(activePeriod.endDate, -7);
                      onPeriodChange(newStart, newEnd, 'weekly');
                    }}
                    className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center space-x-1 px-1 font-medium font-tabular text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Period: {formatDateDisplay(activePeriod.startDate, { short: true })} – {formatDateDisplay(activePeriod.endDate, { short: true })}
                  </span>
                </div>

                {onPeriodChange && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStart = shiftDateDays(activePeriod.startDate, 7);
                      const newEnd = shiftDateDays(activePeriod.endDate, 7);
                      onPeriodChange(newStart, newEnd, 'weekly');
                    }}
                    className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                    title="Next Week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {onPeriodChange && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      onPeriodChange(currentWeek.startDate, currentWeek.endDate, 'weekly');
                    }}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                      isCurrentWeek
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-400/30 font-semibold'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-200'
                    }`}
                    title={
                      isCurrentWeek
                        ? `Currently viewing Current Week (${formatDateDisplay(currentWeek.startDate, { short: true })} – ${formatDateDisplay(currentWeek.endDate, { short: true })})`
                        : `Navigate to Current Week (${formatDateDisplay(currentWeek.startDate, { short: true })} – ${formatDateDisplay(currentWeek.endDate, { short: true })})`
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        isCurrentWeek ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    (Current Week)
                  </button>
                </>
              )}

              <span>•</span>
              {getStatusBadge(periodStatus)}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Add Daily Entry */}
          <button
            onClick={() => onNavigate('daily_entry')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
            title="Fast Daily Consumption Entry"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Record Entry</span>
          </button>

          {/* Quick Import Mess Bill */}
          <button
            onClick={() => onNavigate('mess_bill_import')}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            title="Import WhatsApp Bill / OCR"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Import Bill</span>
          </button>

          {/* Quick Reconcile */}
          <button
            onClick={() => onNavigate('reconciliation')}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            title="Reconcile Recorded vs Reported Mess Bill"
          >
            <Scale className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden lg:inline">Reconcile</span>
          </button>

          {/* Quick Export Excel */}
          <button
            onClick={onQuickExportExcel}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center space-x-1.5"
            title="Download Excel Workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xl:inline">Excel</span>
          </button>

          {/* Quick Export PDF */}
          <button
            onClick={onQuickExportPdf}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center space-x-1.5"
            title="Generate Combined PDF Bill"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden xl:inline">PDF</span>
          </button>

          {/* User Status & Logout */}
          {onLogout && (
            <div className="pl-2 border-l border-slate-200 flex items-center space-x-2">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser?.name || 'Admin'}
                </span>
                <span className="text-[10px] text-slate-500 capitalize leading-tight">
                  {currentUser?.role || 'admin'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
