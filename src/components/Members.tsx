import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  History,
  TrendingUp,
  X,
  Search,
} from 'lucide-react';
import type { Member, FoodEntry } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/calculations';
import { dataService } from '../services/dataService';

interface MembersProps {
  members: Member[];
  entries: FoodEntry[];
}

export const Members: React.FC<MembersProps> = ({ members, entries }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<Member | null>(null);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    dataService.saveMember(newMemberName.trim(), newMemberNotes.trim() || undefined);
    setNewMemberName('');
    setNewMemberNotes('');
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name.trim()) return;
    dataService.updateMember(editingMember.id, {
      name: editingMember.name.trim(),
      notes: editingMember.notes?.trim() || undefined,
    });
    setEditingMember(null);
  };

  const handleToggleStatus = (id: string, name: string, active: boolean) => {
    const action = active ? 'deactivate' : 'reactivate';
    if (window.confirm(`Are you sure you want to ${action} ${name}? Historical food records will be preserved.`)) {
      dataService.toggleMemberStatus(id);
    }
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete member ${name}? This will remove them from the group.`)) {
      dataService.deleteMember(id);
    }
  };

  // Calculate member stats
  const getMemberStats = (memberId: string) => {
    const memberEntries = entries.filter((e) => e.memberId === memberId);
    const confirmedEntries = memberEntries.filter((e) => e.status !== 'confirmed_no_food');
    const totalSpent = confirmedEntries.reduce((sum, e) => sum + e.lineTotal, 0);
    const mealsCount = confirmedEntries.length;
    const skippedCount = memberEntries.filter((e) => e.status === 'confirmed_no_food').length;

    return { totalSpent, mealsCount, skippedCount, entries: memberEntries };
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48 sm:w-64"
            />
          </div>
          <span className="text-xs text-slate-500">
            {members.filter((m) => m.active).length} active members
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Members Grid or Empty State */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No Members Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Start by adding the members of your mess. You can record daily meal consumption for each member.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Member</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
          const stats = getMemberStats(member.id);
          return (
            <div
              key={member.id}
              className={`bg-white border rounded-lg p-4 shadow-2xs transition-all ${
                member.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-slate-900">{member.name}</h3>
                    {member.active ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Inactive
                      </span>
                    )}
                  </div>
                  {member.notes && (
                    <p className="text-xs text-slate-500 mt-0.5">{member.notes}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Joined: {formatDateDisplay(member.joinedAt, { short: true })}
                    {member.leftAt && ` • Left: ${formatDateDisplay(member.leftAt, { short: true })}`}
                  </p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                    title="Edit Member"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(member.id, member.name, member.active)}
                    className={`p-1.5 rounded-md ${
                      member.active
                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={member.active ? 'Deactivate Member' : 'Reactivate Member'}
                  >
                    {member.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member.id, member.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                    title="Delete Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Consumption Stats */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Spent</span>
                  <span className="font-semibold text-slate-900 font-tabular">
                    {formatCurrency(stats.totalSpent)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Meals Recorded</span>
                  <span className="font-medium text-slate-700">
                    {stats.mealsCount} meals {stats.skippedCount > 0 && `(${stats.skippedCount} skipped)`}
                  </span>
                </div>
              </div>

              {/* History Button */}
              <div className="mt-3">
                <button
                  onClick={() => setSelectedMemberHistory(member)}
                  className="w-full py-1.5 px-3 rounded-md border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-1.5 transition-colors font-medium"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Consumption History</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Add New Group Member</span>
            </h3>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afik"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 204"
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              <span>Edit Member Details</span>
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingMember.notes || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member History Drawer / Modal */}
      {selectedMemberHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedMemberHistory.name} — Consumption History
                </h3>
                <p className="text-xs text-slate-500">
                  Total lifetime spend: {formatCurrency(getMemberStats(selectedMemberHistory.id).totalSpent)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMemberHistory(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium">Meal</th>
                      <th className="py-2 px-3 font-medium">Food Item</th>
                      <th className="py-2 px-3 font-medium text-right">Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Unit Price</th>
                      <th className="py-2 px-3 font-medium text-right">Line Total</th>
                      <th className="py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getMemberStats(selectedMemberHistory.id).entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-600">{entry.date}</td>
                        <td className="py-2 px-3 uppercase text-[10px] font-semibold text-slate-500">
                          {entry.mealType}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {entry.foodNameSnapshot}
                        </td>
                        <td className="py-2 px-3 text-right font-tabular">
                          {entry.status === 'confirmed_no_food' ? '-' : entry.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-tabular text-slate-500">
                          {formatCurrency(entry.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold font-tabular text-slate-900">
                          {formatCurrency(entry.lineTotal)}
                        </td>
                        <td className="py-2 px-3">
                          {entry.status === 'confirmed_no_food' ? (
                            <span className="text-[10px] text-slate-500 font-medium">Skipped</span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-medium">Recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setSelectedMemberHistory(null)}
                className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
