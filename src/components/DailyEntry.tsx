import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Copy,
  CheckCircle,
  AlertCircle,
  Minus,
  UserX,
  History,
} from 'lucide-react';
import type { MealType, FoodEntry, Member, FoodItem } from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  calculateLineTotal,
  shiftDateDays,
  getTodayDateString,
} from '../utils/calculations';
import { dataService } from '../services/dataService';

interface DailyEntryProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  members: Member[];
  foodItems: FoodItem[];
  entries: FoodEntry[];
}

export const DailyEntry: React.FC<DailyEntryProps> = ({
  currentDate,
  onDateChange,
  members,
  foodItems,
  entries,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id || ''
  );
  const [selectedFoodItemId, setSelectedFoodItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [entryNotes, setEntryNotes] = useState<string>('');

  // Modals
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [showCopyConfirmModal, setShowCopyConfirmModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active members
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  // Entries for current date
  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === currentDate),
    [entries, currentDate]
  );

  // Entries for current meal
  const mealEntries = useMemo(
    () => dayEntries.filter((e) => e.mealType === selectedMeal),
    [dayEntries, selectedMeal]
  );

  // Filter food items for this meal + extras
  const relevantFoodItems = useMemo(() => {
    return foodItems.filter(
      (f) =>
        f.active &&
        (f.category === selectedMeal || f.category === 'extras' || f.category === 'lunch')
    );
  }, [foodItems, selectedMeal]);

  // Derived effective member ID (ensures active member matches list)
  const effectiveMemberId = useMemo(() => {
    if (selectedMemberId && activeMembers.some((m) => m.id === selectedMemberId)) {
      return selectedMemberId;
    }
    return activeMembers[0]?.id || '';
  }, [selectedMemberId, activeMembers]);

  // Derived effective food item ID (ensures active item matches current meal without effect setState)
  const effectiveFoodItemId = useMemo(() => {
    if (selectedFoodItemId && relevantFoodItems.some((f) => f.id === selectedFoodItemId)) {
      return selectedFoodItemId;
    }
    return relevantFoodItems[0]?.id || '';
  }, [selectedFoodItemId, relevantFoodItems]);

  // Selected food item object
  const activeFoodItem = useMemo(() => {
    return foodItems.find((f) => f.id === effectiveFoodItemId);
  }, [foodItems, effectiveFoodItemId]);

  // Line total preview
  const previewUnitPrice = activeFoodItem ? activeFoodItem.currentPrice : 0;
  const previewLineTotal = calculateLineTotal(quantity, previewUnitPrice);

  // Day Subtotals
  const dayBfTotal = useMemo(
    () => dayEntries.filter((e) => e.mealType === 'breakfast' && e.status !== 'confirmed_no_food').reduce((sum, e) => sum + e.lineTotal, 0),
    [dayEntries]
  );
  const dayLnTotal = useMemo(
    () => dayEntries.filter((e) => e.mealType === 'lunch' && e.status !== 'confirmed_no_food').reduce((sum, e) => sum + e.lineTotal, 0),
    [dayEntries]
  );
  const dayDnTotal = useMemo(
    () => dayEntries.filter((e) => e.mealType === 'dinner' && e.status !== 'confirmed_no_food').reduce((sum, e) => sum + e.lineTotal, 0),
    [dayEntries]
  );
  const dayGrandTotal = dayBfTotal + dayLnTotal + dayDnTotal;

  // Meal Subtotal
  const currentMealSubtotal = useMemo(
    () => mealEntries.filter(e => e.status !== 'confirmed_no_food').reduce((sum, e) => sum + e.lineTotal, 0),
    [mealEntries]
  );

  // Members recorded status for this meal
  const memberMealStatus = useMemo(() => {
    return activeMembers.map((member) => {
      const memberLines = mealEntries.filter((e) => e.memberId === member.id);
      const isSkipped = memberLines.some((e) => e.status === 'confirmed_no_food');
      const totalAmount = memberLines.reduce((sum, e) => sum + (e.status === 'confirmed_no_food' ? 0 : e.lineTotal), 0);
      const hasEntries = memberLines.length > 0;

      return {
        member,
        hasEntries,
        isSkipped,
        totalAmount,
        linesCount: memberLines.length,
      };
    });
  }, [activeMembers, mealEntries]);

  // Navigate Date Handlers
  const handlePrevDay = () => {
    onDateChange(shiftDateDays(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(shiftDateDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(getTodayDateString());
  };

  // Add Food Line
  const handleAddEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!effectiveMemberId) {
      if (members.length === 0) {
        alert('Please add at least one member in the "Members" tab in the sidebar first before recording food entries.');
      } else {
        alert('Please click on a member to select who ate this food.');
      }
      return;
    }
    if (!effectiveFoodItemId) {
      alert('Please select a food item from the menu.');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    const food = foodItems.find((f) => f.id === effectiveFoodItemId);
    if (!food) return;

    dataService.saveFoodEntry({
      date: currentDate,
      mealType: selectedMeal,
      memberId: effectiveMemberId,
      foodItemId: food.id,
      foodNameSnapshot: food.name,
      quantity,
      unitPrice: food.currentPrice, // Snapshot preserved
      status: 'completed',
      notes: entryNotes.trim() || undefined,
      createdBy: 'Imran (Admin)',
    });

    setEntryNotes('');
    // Reset quantity to 1 for quick next entry
    setQuantity(1);
    showNotice(`Added ${quantity} × ${food.name} for ${members.find(m => m.id === effectiveMemberId)?.name}`, 'success');
  };

  // Mark Member Skipped Meal
  const handleMarkSkipped = (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    if (!mem) return;
    dataService.markMemberSkippedMeal(currentDate, selectedMeal, memberId, mem.name);
    showNotice(`Marked ${mem.name} as skipped for ${selectedMeal} (₹0)`, 'info');
  };

  // Delete Entry
  const handleDeleteEntry = (entryId: string, name: string) => {
    if (window.confirm(`Delete entry "${name}"?`)) {
      dataService.deleteFoodEntry(entryId, 'Deleted via daily entry screen');
      showNotice(`Removed ${name}`, 'info');
    }
  };

  // Edit Entry Save
  const handleSaveEdit = () => {
    if (!editingEntry) return;
    dataService.updateFoodEntry(
      editingEntry.id,
      {
        quantity: editingEntry.quantity,
        unitPrice: editingEntry.unitPrice,
        notes: editingEntry.notes,
        status: editingEntry.status,
      },
      editReason.trim() || 'Admin correction'
    );
    setEditingEntry(null);
    setEditReason('');
    showNotice('Updated entry successfully', 'success');
  };

  // Copy Previous Day Draft Handler
  const handleCopyPreviousDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const prevDate = d.toISOString().split('T')[0];

    const copied = dataService.copyPreviousDayDraft(prevDate, currentDate, selectedMeal);
    setShowCopyConfirmModal(false);
    if (copied.length > 0) {
      showNotice(`Copied ${copied.length} entries from ${formatDateDisplay(prevDate, { short: true })} as review drafts.`, 'success');
    } else {
      showNotice(`No entries found on ${formatDateDisplay(prevDate, { short: true })} to copy.`, 'info');
    }
  };

  const showNotice = (text: string, type: 'success' | 'info' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  return (
    <div className="space-y-5">
      {/* Date & Meal Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Date Picker Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="text-xs sm:text-sm font-semibold border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleToday}
                className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 font-medium text-slate-700 border border-slate-200 transition-colors"
              >
                Today
              </button>
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="hidden sm:block text-xs text-slate-500 ml-2">
              {formatDateDisplay(currentDate, { includeDay: true })}
            </div>
          </div>

          {/* Meal Tabs: Breakfast | Lunch | Dinner */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((meal) => {
              const isSelected = selectedMeal === meal;
              const subtotal = meal === 'breakfast' ? dayBfTotal : meal === 'lunch' ? dayLnTotal : dayDnTotal;
              return (
                <button
                  key={meal}
                  onClick={() => setSelectedMeal(meal)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="capitalize">{meal}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-tabular ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {formatCurrency(subtotal)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Totals Summary Strip */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-4 text-slate-500">
            <span>
              Breakfast: <strong className="text-slate-800 font-tabular">{formatCurrency(dayBfTotal)}</strong>
            </span>
            <span>
              Lunch: <strong className="text-slate-800 font-tabular">{formatCurrency(dayLnTotal)}</strong>
            </span>
            <span>
              Dinner: <strong className="text-slate-800 font-tabular">{formatCurrency(dayDnTotal)}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Day Total:</span>
            <span className="text-sm font-bold text-slate-900 font-tabular">
              {formatCurrency(dayGrandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center space-x-2 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Fast Entry Form & Member Quick Grid */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Record {selectedMeal.toUpperCase()} Food Consumption</span>
          </h2>

          <div className="flex items-center space-x-2">
            {/* Copy Previous Day Draft Button */}
            <button
              onClick={() => setShowCopyConfirmModal(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Copy previous day meal entries as draft"
            >
              <Copy className="w-3 h-3 text-slate-500" />
              <span>Copy Yesterday's Draft</span>
            </button>
          </div>
        </div>

        {/* Member Selector Pills */}
        <div>
          <div className="text-[11px] font-medium text-slate-500 mb-1.5">
            Select Member:
          </div>
          {activeMembers.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              No members registered yet. Please click <strong>Members</strong> in the sidebar to add your mess members manually.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {memberMealStatus.map(({ member, hasEntries, isSkipped, totalAmount }) => {
                const isSelected = effectiveMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-2 border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : isSkipped
                        ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                        : hasEntries
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{member.name}</span>
                    {hasEntries && !isSkipped && (
                      <span
                        className={`text-[10px] font-tabular ${
                          isSelected ? 'text-slate-300' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(totalAmount)}
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-[10px] text-slate-400">Skipped</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Food Quick Chips for this meal */}
        <div>
          <div className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Frequently Eaten Items:</span>
            <span className="text-[10px] text-slate-400">Click item to select</span>
          </div>
          {relevantFoodItems.length === 0 ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
              No menu items for {selectedMeal} yet. Please click <strong>Menu & Prices</strong> in the sidebar to add your food items and rates.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {relevantFoodItems.map((food) => {
                const isSelected = effectiveFoodItemId === food.id;
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => setSelectedFoodItemId(food.id)}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{food.name}</span>
                    <span
                      className={`text-[10px] font-tabular ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(food.currentPrice)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Row: Food Item Dropdown + Quantity Stepper + Line Total + Add Button */}
        <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          {/* Food Search / Dropdown */}
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Food Item
            </label>
            <select
              value={effectiveFoodItemId}
              onChange={(e) => setSelectedFoodItemId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              {foodItems
                .filter((f) => f.active)
                .map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} — {formatCurrency(food.currentPrice)} ({food.category})
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity Stepper */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Quantity
            </label>
            <div className="flex items-center border border-slate-200 rounded-md bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-l-md"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full text-center text-xs font-semibold py-1.5 focus:outline-hidden font-tabular"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-r-md"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calculated Line Total Preview */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Line Total
            </label>
            <div className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900 font-tabular">
              {formatCurrency(previewLineTotal)}
            </div>
          </div>

          {/* Add Entry Button */}
          <div className="sm:col-span-2 flex items-end space-x-1.5">
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-2xs transition-colors flex items-center justify-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkSkipped(selectedMemberId)}
              className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
              title="Mark member as Skipped Meal (₹0)"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Spreadsheet-like Table of Recorded Food Items for This Meal */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span>{selectedMeal.toUpperCase()} CONSUMPTION TABLE</span>
              <span className="text-[11px] font-normal text-slate-500">
                ({mealEntries.length} lines recorded)
              </span>
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500">Meal Subtotal:</span>
            <span className="text-sm font-bold text-slate-900 font-tabular">
              {formatCurrency(currentMealSubtotal)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4 font-medium">Person</th>
                <th className="py-2.5 px-4 font-medium">Food Item</th>
                <th className="py-2.5 px-4 font-medium text-right">Quantity</th>
                <th className="py-2.5 px-4 font-medium text-right">Unit Price</th>
                <th className="py-2.5 px-4 font-medium text-right">Line Total</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mealEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No entries recorded for {selectedMeal} on {formatDateDisplay(currentDate, { short: true })}.
                    Use the quick entry form above to record food consumption.
                  </td>
                </tr>
              ) : (
                mealEntries.map((entry) => {
                  const isSkipped = entry.status === 'confirmed_no_food';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {memberMap.get(entry.memberId) || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">
                        {entry.foodNameSnapshot}
                        {entry.notes && (
                          <span className="block text-[10px] text-slate-400">
                            {entry.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-700 font-tabular">
                        {isSkipped ? '-' : entry.quantity}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-tabular">
                        {formatCurrency(entry.unitPrice)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900 font-tabular">
                        {formatCurrency(isSkipped ? 0 : entry.lineTotal)}
                      </td>
                      <td className="py-2.5 px-4">
                        {isSkipped ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Skipped (₹0)
                          </span>
                        ) : entry.status === 'in_progress' ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                            Draft (Needs Confirm)
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            Confirmed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Edit entry with audit log"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id, entry.foodNameSnapshot)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy Previous Day Draft Confirmation Modal */}
      {showCopyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-md w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Copy className="w-4 h-4 text-blue-600" />
              <span>Copy Previous Day Entries as Draft</span>
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              This will copy food consumption entries from yesterday for{' '}
              <strong className="text-slate-800 capitalize">{selectedMeal}</strong> into today as a draft.
              Entries will be marked as <span className="font-semibold text-amber-700">In Progress</span> so you can review and adjust quantities before confirming.
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCopyConfirmModal(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyPreviousDay}
                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                Confirm & Copy Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal with Audit Reason */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Edit Food Entry (Audit Trail)</span>
            </h3>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Person: <strong>{memberMap.get(editingEntry.memberId)}</strong></div>
              <div>Food: <strong>{editingEntry.foodNameSnapshot}</strong></div>
              <div>Date: {editingEntry.date} ({editingEntry.mealType})</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingEntry.quantity}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Historical Unit Price (₹)
                </label>
                <input
                  type="number"
                  value={editingEntry.unitPrice}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      unitPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Reason for Correction (Required for Audit Log)
                </label>
                <input
                  type="text"
                  placeholder="e.g. In-charge corrected roti count from 3 to 2"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
