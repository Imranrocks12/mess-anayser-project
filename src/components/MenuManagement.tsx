import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  History,
  CheckCircle,
  XCircle,
  Search,
  X,
  Utensils,
} from 'lucide-react';
import type { FoodItem, FoodCategory } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/calculations';
import { dataService } from '../services/dataService';

interface MenuManagementProps {
  foodItems: FoodItem[];
}

export const MenuManagement: React.FC<MenuManagementProps> = ({ foodItems }) => {
  const [items, setItems] = useState<FoodItem[]>(() => foodItems);

  React.useEffect(() => {
    setItems([...foodItems]);
  }, [foodItems]);

  React.useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setItems([...dataService.getFoodItems()]);
    });
    return unsub;
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [priceChangeItem, setPriceChangeItem] = useState<FoodItem | null>(null);
  const [viewHistoryItem, setViewHistoryItem] = useState<FoodItem | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FoodCategory>('lunch');
  const [newUnit, setNewUnit] = useState('plate');
  const [newPrice, setNewPrice] = useState<number>(50);

  // Price change form states
  const [updatedPrice, setUpdatedPrice] = useState<number>(0);
  const [effectiveFromDate, setEffectiveFromDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' ? true : item.category === selectedCategory;
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddFoodItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice < 0) return;

    dataService.saveFoodItem({
      name: newName.trim(),
      category: newCategory,
      defaultUnit: newUnit.trim() || 'plate',
      active: true,
      currentPrice: newPrice,
    });

    setNewName('');
    setNewPrice(50);
    setShowAddModal(false);
  };

  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    dataService.updateFoodItem(editingItem.id, {
      name: editingItem.name.trim(),
      category: editingItem.category,
      defaultUnit: editingItem.defaultUnit.trim(),
    });

    setEditingItem(null);
  };

  const handleOpenPriceChange = (item: FoodItem) => {
    setPriceChangeItem(item);
    setUpdatedPrice(item.currentPrice);
    setEffectiveFromDate(new Date().toISOString().split('T')[0]);
  };

  const handleSavePriceChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceChangeItem || updatedPrice < 0) return;

    dataService.updateFoodItemPrice(
      priceChangeItem.id,
      updatedPrice,
      effectiveFromDate
    );

    setPriceChangeItem(null);
  };

  const handleToggleItemActive = (item: FoodItem) => {
    const action = item.active ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} "${item.name}"? Past records will retain their pricing.`)) {
      dataService.updateFoodItem(item.id, { active: !item.active });
    }
  };

  const handleDeleteItem = (item: FoodItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"? This will remove it from the menu.`)) {
      dataService.deleteFoodItem(item.id);
    }
  };

  const handleClearAllForNewWeek = () => {
    dataService.clearAllFoodItems('Cleared all menu items for new week');
    setShowClearConfirmModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            {['all', 'breakfast', 'lunch', 'dinner', 'extras'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-all ${selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search food items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-40 sm:w-48"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {foodItems.length > 0 && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0"
              title="Clear all menu items to prepare for the new week"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear for New Week</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {/* Food Items Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-4 font-medium">Food Name</th>
                <th className="py-2.5 px-4 font-medium">Category</th>
                <th className="py-2.5 px-4 font-medium">Unit</th>
                <th className="py-2.5 px-4 font-medium text-right">Current Price</th>
                <th className="py-2.5 px-4 font-medium">Price History</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No menu items found</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      {foodItems.length === 0
                        ? "Items are ready for the new week! You can import a mess bill on 'Mess Bill Import' to automatically populate food items, or click 'Add Food Item'."
                        : 'No food items match the current search or category filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="capitalize text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 capitalize">{item.defaultUnit}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-tabular text-sm">
                    {formatCurrency(item.currentPrice)}
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => setViewHistoryItem(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                    >
                      <History className="w-3 h-3" />
                      <span>{item.priceHistory.length} records</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-4">
                    {item.active ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {/* Change Price with Effective Date */}
                      <button
                        onClick={() => handleOpenPriceChange(item)}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Update Price with Effective Date"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit Details */}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        title="Edit Item Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleItemActive(item)}
                        className={`p-1 rounded ${item.active
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        title={item.active ? 'Deactivate' : 'Activate'}
                      >
                        {item.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete Food Item */}
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Food Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Food Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add New Food Item</span>
            </h3>
            <form onSubmit={handleAddFoodItem} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Food Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dal rice"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meal Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FoodCategory)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white capitalize"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="extras">Extras / Additional</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Default Unit
                </label>
                <input
                  type="text"
                  placeholder="e.g. plate, piece, set"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Initial Unit Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 font-tabular"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Item Details Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center space-x-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              <span>Edit Food Item Details</span>
            </h3>
            <form onSubmit={handleSaveItemEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Food Name
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as FoodCategory })}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white capitalize"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="extras">Extras</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Default Unit
                </label>
                <input
                  type="text"
                  value={editingItem.defaultUnit}
                  onChange={(e) => setEditingItem({ ...editingItem, defaultUnit: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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

      {/* Change Price with Effective Date Modal */}
      {priceChangeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Update Price: {priceChangeItem.name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Historical entries prior to the effective date will retain their recorded unit price.
            </p>

            <form onSubmit={handleSavePriceChange} className="space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                <span>Current Price:</span>
                <span className="font-bold text-slate-900 font-tabular">
                  {formatCurrency(priceChangeItem.currentPrice)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  New Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={updatedPrice}
                  onChange={(e) => setUpdatedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-md px-2.5 py-1.5 font-tabular focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Effective From Date
                </label>
                <input
                  type="date"
                  required
                  value={effectiveFromDate}
                  onChange={(e) => setEffectiveFromDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPriceChangeItem(null)}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >
                  Apply Price Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Price Records Modal */}
      {viewHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {viewHistoryItem.name} — Price History
                </h3>
                <p className="text-xs text-slate-500">
                  Current rate: {formatCurrency(viewHistoryItem.currentPrice)}
                </p>
              </div>
              <button
                onClick={() => setViewHistoryItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              {viewHistoryItem.priceHistory.map((ph, idx) => (
                <div
                  key={ph.id || idx}
                  className="p-2.5 rounded-md border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-800 font-tabular text-sm">
                      {formatCurrency(ph.price)}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Valid from: {formatDateDisplay(ph.validFrom)}
                      {ph.validTo ? ` to ${formatDateDisplay(ph.validTo)}` : ' (Current)'}
                    </div>
                  </div>
                  {!ph.validTo && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setViewHistoryItem(null)}
                className="px-3 py-1.5 text-xs rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Menu Items for New Week Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-slate-900">Clear Menu Items for New Week</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will clear all <strong>{foodItems.length} items</strong> currently in Menu & Prices so you can start fresh for the upcoming billing week.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold flex items-center space-x-1">
                <span>💡 Automatic Repopulation</span>
              </p>
              <p>
                When you import the new mess bill on <strong>Mess Bill Import</strong>, food names, categories, and prices will be automatically populated into this list!
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllForNewWeek}
                className="px-3.5 py-1.5 text-xs rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 shadow-2xs transition-colors"
              >
                Yes, Clear for New Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
