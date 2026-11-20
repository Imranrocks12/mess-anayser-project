import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  BookOpen,
  Receipt,
  Scale,
  CalendarDays,
  CalendarRange,
  Download,
  Settings as SettingsIcon,
  X,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import type { AppUser } from '../types/auth';

export type NavTab =
  | 'dashboard'
  | 'daily_entry'
  | 'members'
  | 'menu_prices'
  | 'mess_bill_import'
  | 'reconciliation'
  | 'weekly_reports'
  | 'monthly_reports'
  | 'export_centre'
  | 'settings';

export const TAB_TO_SLUG: Record<NavTab, string> = {
  dashboard: 'dashboard',
  daily_entry: 'daily-entry',
  members: 'members',
  menu_prices: 'menu-prices',
  mess_bill_import: 'mess-bill-import',
  reconciliation: 'reconciliation',
  weekly_reports: 'weekly-reports',
  monthly_reports: 'monthly-reports',
  export_centre: 'export-centre',
  settings: 'settings',
};

export const SLUG_TO_TAB: Record<string, NavTab> = {
  dashboard: 'dashboard',
  'daily-entry': 'daily_entry',
  members: 'members',
  'menu-prices': 'menu_prices',
  'mess-bill-import': 'mess_bill_import',
  reconciliation: 'reconciliation',
  'weekly-reports': 'weekly_reports',
  'monthly-reports': 'monthly_reports',
  'export-centre': 'export_centre',
  settings: 'settings',
};

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily_entry', label: 'Daily Food Entry', icon: UtensilsCrossed, badge: 'Core' },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'menu_prices', label: 'Menu & Prices', icon: BookOpen },
    { id: 'mess_bill_import', label: 'Mess Bill Import', icon: Receipt },
    { id: 'reconciliation', label: 'Bill Reconciliation', icon: Scale },
    { id: 'weekly_reports', label: 'Weekly Reports', icon: CalendarDays },
    { id: 'monthly_reports', label: 'Monthly Reports', icon: CalendarRange },
    { id: 'export_centre', label: 'Export Centre', icon: Download },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <div className="font-semibold text-white tracking-tight text-sm leading-tight">
                MessMate
              </div>
              <div className="text-slate-400 text-[11px] leading-tight">
                Smart Mess Billing
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <a
                key={item.id}
                href={`#/${TAB_TO_SLUG[item.id]}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        {/* User / Admin Footer Badge & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-2.5 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/40 font-semibold text-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <ShieldCheck className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-200 truncate">
                {currentUser?.name || 'Imran (Admin)'}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="capitalize">{currentUser?.role || 'admin'} • Active</span>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
