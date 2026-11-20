import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar, type NavTab, TAB_TO_SLUG, SLUG_TO_TAB } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DailyEntry } from './components/DailyEntry';
import { Members } from './components/Members';
import { MenuManagement } from './components/MenuManagement';
import { MessBillImport } from './components/MessBillImport';
import { Reconciliation } from './components/Reconciliation';
import { WeeklyReports } from './components/WeeklyReports';
import { MonthlyReports } from './components/MonthlyReports';
import { ExportCentre } from './components/ExportCentre';
import { Settings } from './components/Settings';
import { Login } from './components/Login';

import type { Member, FoodItem, FoodEntry, MessBill, BillingPeriod, AuditLog } from './types';
import type { AppUser } from './types/auth';
import { dataService } from './services/dataService';
import { authService } from './services/authService';
import { generatePeriodReport, getWeekRange, getTodayDateString } from './utils/calculations';
import { exportReportToExcel } from './utils/excelExport';
import { exportCombinedReportPdf } from './utils/pdfExport';
import { getStoredFirebaseConfig, downloadDataFromCloud, uploadDataToCloud } from './services/firebase';

const getInitialTabFromHash = (): NavTab => {
  if (typeof window === 'undefined') return 'dashboard';
  const clean = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  return SLUG_TO_TAB[clean] || 'dashboard';
};

export function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => authService.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTabFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Reactive datasets from dataService
  const [members, setMembers] = useState<Member[]>(() => dataService.getMembers());
  const [foodItems, setFoodItems] = useState<FoodItem[]>(() => dataService.getFoodItems());
  const [allEntries, setAllEntries] = useState<FoodEntry[]>(() => dataService.getFoodEntries());
  const [messBills, setMessBills] = useState<MessBill[]>(() => dataService.getMessBills());
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>(() => dataService.getBillingPeriods());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => dataService.getAuditLogs());

  // Active billing period selection — defaults to TODAY's week
  const [activePeriod, setActivePeriod] = useState<{
    startDate: string;
    endDate: string;
    reportingType: 'weekly' | 'monthly' | 'custom';
  }>(() => {
    const week = getWeekRange(new Date());
    return {
      startDate: week.startDate,
      endDate: week.endDate,
      reportingType: 'weekly',
    };
  });

  // Track previous mess bills count to detect a newly added bill
  const prevMessBillsCountRef = useRef<number>(0);

  // Current selected date for Daily Food Entry screen — defaults to TODAY
  const [selectedEntryDate, setSelectedEntryDate] = useState<string>(getTodayDateString);

  // Subscribe to dataService updates
  useEffect(() => {
    const refreshAll = () => {
      setMembers([...dataService.getMembers()]);
      setFoodItems([...dataService.getFoodItems()]);
      setAllEntries([...dataService.getFoodEntries()]);
      setMessBills([...dataService.getMessBills()]);
      setBillingPeriods([...dataService.getBillingPeriods()]);
      setAuditLogs([...dataService.getAuditLogs()]);
    };
    const unsubscribeData = dataService.subscribe(refreshAll);
    const unsubscribeAuth = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribeData();
      unsubscribeAuth();
    };
  }, []);

  // When user is logged in, automatically pull latest data from Firebase cloud into session
  useEffect(() => {
    if (!currentUser) return;
    const config = getStoredFirebaseConfig();
    if (config && config.apiKey && config.projectId) {
      downloadDataFromCloud()
        .then((res) => {
          if (res.success && res.data) {
            const cloudData = res.data;
            const hasCloudRecords =
              (Array.isArray(cloudData.members) && cloudData.members.length > 0) ||
              (Array.isArray(cloudData.foodEntries) && cloudData.foodEntries.length > 0) ||
              (Array.isArray(cloudData.messBills) && cloudData.messBills.length > 0);

            const localEntries = dataService.getFoodEntries();
            const localBills = dataService.getMessBills();
            const hasLocalRecords = localEntries.length > 0 || localBills.length > 0;

            if (hasCloudRecords && !hasLocalRecords) {
              // Automatically load cloud data into new session/incognito
              const ok = dataService.importBackupJson(JSON.stringify(cloudData));
              if (ok) {
                console.log('[MessMate Cloud] Successfully loaded cloud data on login');
                if (Array.isArray(cloudData.messBills) && cloudData.messBills.length > 0) {
                  const latestBill = cloudData.messBills[cloudData.messBills.length - 1];
                  if (latestBill && latestBill.periodStart && latestBill.periodEnd) {
                    setActivePeriod({
                      startDate: latestBill.periodStart,
                      endDate: latestBill.periodEnd,
                      reportingType: 'custom',
                    });
                  }
                }
              }
            } else if (hasLocalRecords && !hasCloudRecords) {
              const proceed = window.confirm(
                'You have local mess records.\n\nDo you want to sync your local data to Firebase Cloud now?\nClick OK / Yes to sync, or Cancel / No to abort.'
              );
              if (proceed) {
                const backupJson = dataService.exportBackupJson();
                uploadDataToCloud(JSON.parse(backupJson));
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[MessMate Cloud] Cloud check on login skipped/failed:', err);
        });
    }
  }, [currentUser]);

  // Synchronize browser address bar with current module URL
  useEffect(() => {
    if (!currentUser) return;
    const slug = TAB_TO_SLUG[currentTab];
    const cleanHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (cleanHash !== slug) {
      window.location.hash = `#/${slug}`;
    }
  }, [currentTab, currentUser]);

  // Listen for browser Back/Forward or direct hash entry
  useEffect(() => {
    const handleHash = () => {
      const clean = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      const matched = SLUG_TO_TAB[clean];
      if (matched && matched !== currentTab) {
        setCurrentTab(matched);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [currentTab]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      authService.logout();
    }
  };

  // Compute period report
  const currentReport = useMemo(() => {
    return generatePeriodReport(
      activePeriod.startDate,
      activePeriod.endDate,
      activePeriod.reportingType,
      members,
      allEntries,
      messBills,
      billingPeriods
    );
  }, [
    activePeriod.startDate,
    activePeriod.endDate,
    activePeriod.reportingType,
    members,
    allEntries,
    messBills,
    billingPeriods,
  ]);

  // Latest Mess Bill
  const latestMessBill = useMemo(() => {
    return messBills.length > 0 ? messBills[messBills.length - 1] : undefined;
  }, [messBills]);

  // Auto-switch active period when a new mess bill is saved
  useEffect(() => {
    const prevCount = prevMessBillsCountRef.current;
    if (messBills.length > prevCount && messBills.length > 0) {
      const newest = messBills[messBills.length - 1];
      setActivePeriod({
        startDate: newest.periodStart,
        endDate: newest.periodEnd,
        reportingType: 'custom',
      });
    }
    prevMessBillsCountRef.current = messBills.length;
  }, [messBills]);

  // Global Quick Export Handlers
  const handleQuickExportExcel = async () => {
    try {
      await exportReportToExcel(currentReport, allEntries, members, 'MessMate_Report');
    } catch (e: any) {
      alert(`Export error: ${e?.message}`);
    }
  };

  const handleQuickExportPdf = async () => {
    try {
      await exportCombinedReportPdf(currentReport, allEntries, members, 'download');
    } catch (e: any) {
      alert(`Export error: ${e?.message}`);
    }
  };

  const handleNavigateToDailyDate = (date: string) => {
    setSelectedEntryDate(date);
    setCurrentTab('daily_entry');
  };

  const handlePeriodChange = (start: string, end: string, type: 'weekly' | 'monthly' | 'custom') => {
    setActivePeriod({
      startDate: start,
      endDate: end,
      reportingType: type,
    });
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Offset by sidebar on lg screens) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={setCurrentTab}
          activePeriod={activePeriod}
          periodStatus={currentReport.status}
          onQuickExportExcel={handleQuickExportExcel}
          onQuickExportPdf={handleQuickExportPdf}
          currentUser={currentUser}
          onLogout={handleLogout}
          onPeriodChange={handlePeriodChange}
        />

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              report={currentReport}
              recentEntries={allEntries}
              members={members}
              messBills={messBills}
              latestMessBill={latestMessBill}
              activePeriod={activePeriod}
              onNavigate={setCurrentTab}
              onSelectDateForDailyEntry={handleNavigateToDailyDate}
              onExportExcel={handleQuickExportExcel}
              onExportPdf={handleQuickExportPdf}
              onPeriodChange={handlePeriodChange}
            />
          )}

          {currentTab === 'daily_entry' && (
            <DailyEntry
              currentDate={selectedEntryDate}
              onDateChange={setSelectedEntryDate}
              members={members}
              foodItems={foodItems}
              entries={allEntries}
            />
          )}

          {currentTab === 'members' && (
            <Members members={members} entries={allEntries} />
          )}

          {currentTab === 'menu_prices' && (
            <MenuManagement foodItems={foodItems} />
          )}

          {currentTab === 'mess_bill_import' && (
            <MessBillImport
              messBills={messBills}
              foodItems={foodItems}
              onNavigateToReconciliation={() => setCurrentTab('reconciliation')}
            />
          )}

          {currentTab === 'reconciliation' && (
            <Reconciliation
              report={currentReport}
              billingPeriods={billingPeriods}
              onPeriodChange={handlePeriodChange}
              onNavigateToDailyEntry={() => setCurrentTab('daily_entry')}
              onExportExcel={handleQuickExportExcel}
              onExportPdf={handleQuickExportPdf}
            />
          )}

          {currentTab === 'weekly_reports' && (
            <WeeklyReports
              report={currentReport}
              members={members}
              foodItems={foodItems}
              onPeriodChange={handlePeriodChange}
              onExportExcel={handleQuickExportExcel}
              onExportPdf={handleQuickExportPdf}
            />
          )}

          {currentTab === 'monthly_reports' && (
            <MonthlyReports
              report={currentReport}
              members={members}
              foodItems={foodItems}
              onPeriodChange={handlePeriodChange}
              onExportExcel={handleQuickExportExcel}
              onExportPdf={handleQuickExportPdf}
            />
          )}

          {currentTab === 'export_centre' && (
            <ExportCentre
              currentReport={currentReport}
              allEntries={allEntries}
              members={members}
            />
          )}

          {currentTab === 'settings' && (
            <Settings auditLogs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
