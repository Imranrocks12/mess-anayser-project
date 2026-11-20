import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Cloud,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  History,
  Lock,
  Key,
} from 'lucide-react';
import type { AuditLog, FirebaseConfig } from '../types';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  initFirebase,
  uploadDataToCloud,
  downloadDataFromCloud,
} from '../services/firebase';
import { dataService } from '../services/dataService';
import { formatDateDisplay } from '../utils/calculations';

interface SettingsProps {
  auditLogs: AuditLog[];
}

export const Settings: React.FC<SettingsProps> = ({ auditLogs }) => {
  // Firebase configuration form
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(() => {
    return (
      getStoredFirebaseConfig() || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      }
    );
  });

  const [fbSaveNotice, setFbSaveNotice] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const isFbActive = Boolean(fbConfig.apiKey && fbConfig.projectId);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);

  const handlePushToCloud = async () => {
    const proceed = window.confirm(
      'Are you sure you want to push/upload all current local data to Firebase Cloud?\n\nClick OK / Yes to proceed, or Cancel / No to abort.'
    );
    if (!proceed) return;

    setCloudSyncing(true);
    try {
      const backupJson = dataService.exportBackupJson();
      const backupData = JSON.parse(backupJson);
      const res = await uploadDataToCloud(backupData);
      if (res.success) {
        alert('All mess members, bills, and food entries uploaded to Firebase Firestore successfully!');
      } else {
        alert(`Cloud sync error: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error syncing: ${e?.message}`);
    } finally {
      setCloudSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    const proceed = window.confirm(
      'Are you sure you want to pull/restore data from Firebase Cloud?\nThis will replace your local data with the cloud copy.\n\nClick OK / Yes to proceed, or Cancel / No to abort.'
    );
    if (!proceed) return;

    setCloudSyncing(true);
    try {
      const res = await downloadDataFromCloud();
      if (res.success && res.data) {
        const ok = dataService.importBackupJson(JSON.stringify(res.data));
        if (ok) {
          alert('Data successfully pulled and restored from Firebase Firestore!');
        } else {
          alert('Failed to parse cloud data.');
        }
      } else {
        alert(`Cloud fetch error: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Error fetching: ${e?.message}`);
    } finally {
      setCloudSyncing(false);
    }
  };

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fbConfig.apiKey.trim() && fbConfig.projectId.trim()) {
      const proceed = window.confirm(
        'Save Firebase configuration and sync with cloud now?\n\nClick OK / Yes to proceed, or Cancel / No to abort.'
      );
      if (!proceed) return;

      saveStoredFirebaseConfig(fbConfig);
      setFbSaveNotice('Firebase configuration saved! Syncing with cloud...');
      
      try {
        // Check if cloud already has stored data
        const cloudRes = await downloadDataFromCloud();
        if (cloudRes.success && cloudRes.data && (cloudRes.data.members?.length > 0 || cloudRes.data.foodEntries?.length > 0)) {
          dataService.importBackupJson(JSON.stringify(cloudRes.data));
          setFbSaveNotice('Firebase connected & activated! Pulled latest data from cloud.');
        } else {
          // Cloud is fresh: push existing local data to cloud immediately
          const backupJson = dataService.exportBackupJson();
          await uploadDataToCloud(JSON.parse(backupJson));
          setFbSaveNotice('Firebase connected & activated! Initial data pushed to cloud.');
        }
      } catch {
        setFbSaveNotice('Firebase configuration saved! Auto-sync is active.');
      }
    } else {
      saveStoredFirebaseConfig(null);
      setFbSaveNotice('Firebase credentials cleared. Running in local storage mode.');
    }
    setTimeout(() => setFbSaveNotice(null), 5000);
  };

  const handleResetSampleData = () => {
    if (
      window.confirm(
        'Reset data to realistic demonstration dataset? This will load 7 members, 14 days of realistic entries, and a verified mess bill.'
      )
    ) {
      dataService.resetToSampleData();
      alert('Sample dataset loaded successfully!');
    }
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all recorded food entries and bills? Members and menu items will be preserved.'
      )
    ) {
      dataService.clearAllData();
      alert('All food entries and bills have been cleared.');
    }
  };

  const handleExportBackup = () => {
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

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const success = dataService.importBackupJson(text);
        if (success) {
          alert('Backup data restored successfully!');
        } else {
          alert('Failed to restore backup: Invalid file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Filter audit logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesFilter = auditFilter === 'all' ? true : log.entityType === auditFilter;
    const matchesSearch =
      log.reason?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Admin Profile & App Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              IM
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Imran — Administrator
              </h2>
              <p className="text-xs text-slate-500">
                MessMate Single-Administrator Mode • Full System Authority
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Authorized Admin</span>
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[11px]">System Timezone</span>
            <strong>Asia/Kolkata (IST • UTC+05:30)</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Default Reporting Week</span>
            <strong>Monday to Sunday</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Currency Representation</span>
            <strong>Indian Rupee (INR • ₹)</strong>
          </div>
        </div>
      </div>

      {/* Cloud & Firebase Configuration */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>Database & Cloud Sync Configuration (Firebase)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Configure Google Firebase Firestore, Auth, and Storage for multi-device live sync.
            </p>
          </div>

          {isFbActive ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>Firebase Configured</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Local Storage Mode (Active)
            </span>
          )}
        </div>

        {fbSaveNotice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{fbSaveNotice}</span>
          </div>
        )}

        <form onSubmit={handleSaveFirebase} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Firebase API Key
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Firebase Project ID
              </label>
              <input
                type="text"
                placeholder="mess-analyser-xxx"
                value={fbConfig.projectId}
                onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                placeholder="mess-analyser-xxx.firebaseapp.com"
                value={fbConfig.authDomain}
                onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Storage Bucket
              </label>
              <input
                type="text"
                placeholder="mess-analyser-xxx.appspot.com"
                value={fbConfig.storageBucket}
                onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded px-2.5 py-1.5"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
            <span className="text-[11px] text-slate-400">
              Keys are stored securely in your browser and never leaked.
            </span>
            <div className="flex items-center space-x-2">
              {isFbActive && (
                <>
                  <button
                    type="button"
                    disabled={cloudSyncing}
                    onClick={handlePushToCloud}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    title="Upload local database to Firebase Firestore"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{cloudSyncing ? 'Syncing...' : 'Push to Cloud'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={cloudSyncing}
                    onClick={handlePullFromCloud}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    title="Restore local database from Firebase Firestore"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{cloudSyncing ? 'Fetching...' : 'Pull from Cloud'}</span>
                  </button>
                </>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
              >
                Save Firebase Settings
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Data Management & Resets */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
            <Database className="w-4 h-4 text-slate-600" />
            <span>Database Backup & Reset Controls</span>
          </h3>
          <p className="text-xs text-slate-500">
            Export JSON backups, restore historical snapshots, or load sample testing data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Export Backup */}
          <button
            onClick={handleExportBackup}
            className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <Download className="w-4 h-4 text-slate-600 mb-1.5" />
              <div className="text-xs font-semibold text-slate-800">Export Backup</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download .json database snapshot
              </p>
            </div>
          </button>

          {/* Import Backup */}
          <label className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors cursor-pointer flex flex-col justify-between">
            <div>
              <Upload className="w-4 h-4 text-slate-600 mb-1.5" />
              <div className="text-xs font-semibold text-slate-800">Restore Backup</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Import and restore from .json
              </p>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          {/* Reset to Sample Data */}
          <button
            onClick={handleResetSampleData}
            className="p-3 rounded-lg border border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <RefreshCw className="w-4 h-4 text-blue-600 mb-1.5" />
              <div className="text-xs font-semibold text-slate-800">Load Sample Data</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Preloads 7 members & 14 days
              </p>
            </div>
          </button>

          {/* Clear All Data */}
          <button
            onClick={handleClearAllData}
            className="p-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-left transition-colors flex flex-col justify-between"
          >
            <div>
              <Trash2 className="w-4 h-4 text-rose-600 mb-1.5" />
              <div className="text-xs font-semibold text-rose-900">Clear Food Entries</div>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Deletes entries; preserves members
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Audit Logs Explorer */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>Audit Trail & Activity Log ({filteredLogs.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Immutable log of all creates, updates, deletes, and reconciliations
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
            >
              <option value="all">All Entities</option>
              <option value="foodEntry">Food Entry</option>
              <option value="messBill">Mess Bill</option>
              <option value="billingPeriod">Billing Period</option>
              <option value="member">Member</option>
              <option value="foodItem">Food Item</option>
            </select>

            <input
              type="text"
              placeholder="Search audit logs..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white w-36"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <th className="py-2 px-3 font-medium">Timestamp</th>
                <th className="py-2 px-3 font-medium">Entity</th>
                <th className="py-2 px-3 font-medium">Action</th>
                <th className="py-2 px-3 font-medium">Reason / Description</th>
                <th className="py-2 px-3 font-medium">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 text-slate-500 font-tabular whitespace-nowrap">
                    {formatDateDisplay(log.timestamp.split('T')[0], { short: true })}{' '}
                    {log.timestamp.split('T')[1]?.substring(0, 5)}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800 capitalize">
                    {log.entityType}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        log.action === 'create'
                          ? 'bg-blue-50 text-blue-700'
                          : log.action === 'update'
                          ? 'bg-amber-50 text-amber-700'
                          : log.action === 'finalize'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={log.reason}>
                    {log.reason || 'N/A'}
                  </td>
                  <td className="py-2 px-3 text-slate-600 font-medium whitespace-nowrap">
                    {log.performedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
