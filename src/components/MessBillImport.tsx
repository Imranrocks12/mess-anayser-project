import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import type { MessBill, ExtractedBillItem, FoodItem, MealType } from '../types';
import { parseWhatsAppBill } from '../utils/whatsappParser';
import { processUploadedBillFile, type DocumentExtractionProgress } from '../utils/docParser';
import { formatCurrency, formatDateDisplay, roundCurrency, getWeekRange } from '../utils/calculations';
import { dataService } from '../services/dataService';
import { exportMessBillPdf } from '../utils/pdfExport';

interface MessBillImportProps {
  messBills: MessBill[];
  foodItems: FoodItem[];
  onNavigateToReconciliation: () => void;
}

const SAMPLE_WHATSAPP_TEXT = `Lunch food:
- Meals: 25 × ₹70 = ₹1750
- Tomato biriyani: 10 × ₹60 = ₹600
- Egg: 15 × ₹15 = ₹225

Dinner food:
- Roti: 120 × ₹15 = ₹1800
- Paneer: 25 × ₹30 = ₹750

Breakfast food:
- Idli: 35 × ₹10 = ₹350
- Dosa: 10 × ₹30 = ₹300
- Pongal: 5 × ₹35 = ₹175

Grand total: ₹5,950`;

export const MessBillImport: React.FC<MessBillImportProps> = ({
  messBills,
  foodItems,
  onNavigateToReconciliation,
}) => {
  const [bills, setBills] = useState<MessBill[]>(() => messBills);

  React.useEffect(() => {
    setBills([...messBills]);
  }, [messBills]);

  React.useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setBills([...dataService.getMessBills()]);
    });
    return unsub;
  }, []);

  const [importMode, setImportMode] = useState<'whatsapp' | 'file_upload' | 'manual'>('whatsapp');
  
  // WhatsApp raw text input
  const [whatsappText, setWhatsappText] = useState('');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<DocumentExtractionProgress | null>(null);

  // Review stage state
  const [isReviewing, setIsReviewing] = useState(false);
  const [periodStart, setPeriodStart] = useState<string>(() => getWeekRange(new Date()).startDate);
  const [periodEnd, setPeriodEnd] = useState<string>(() => getWeekRange(new Date()).endDate);
  const [reportedGrandTotal, setReportedGrandTotal] = useState<number>(0);
  const [extractedItems, setExtractedItems] = useState<ExtractedBillItem[]>([]);
  const [originalRawText, setOriginalRawText] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Edit existing bill state
  const [editingBill, setEditingBill] = useState<MessBill | null>(null);
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editGrandTotal, setEditGrandTotal] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<ExtractedBillItem[]>([]);

  // Sum of items when editing an existing bill
  const calculatedEditSumOfLines = roundCurrency(
    editItems.reduce((acc, item) => acc + (item.lineTotal || 0), 0)
  );

  const hasEditArithmeticDiscrepancy =
    editItems.length > 0 && Math.abs(calculatedEditSumOfLines - editGrandTotal) > 0.01;

  const handleOpenEditBill = (bill: MessBill) => {
    setEditingBill(bill);
    setEditPeriodStart(bill.periodStart);
    setEditPeriodEnd(bill.periodEnd);
    setEditGrandTotal(bill.reportedGrandTotal);
    setEditNotes(bill.notes || '');
    setEditItems(bill.items ? JSON.parse(JSON.stringify(bill.items)) : []);
  };

  const handleSaveEditedBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    if (editGrandTotal <= 0) {
      alert('Please enter a valid bill total');
      return;
    }
    if (hasEditArithmeticDiscrepancy) {
      alert(
        `Arithmetic Warning: Reported Grand Total (${formatCurrency(editGrandTotal)}) does not match sum of line items (${formatCurrency(calculatedEditSumOfLines)}).\n\nPlease review item quantities or edit the reported total before saving.`
      );
      return;
    }

    let bfTotal = 0;
    let lnTotal = 0;
    let dnTotal = 0;
    editItems.forEach((item) => {
      if (item.mealType === 'breakfast') bfTotal += item.lineTotal;
      else if (item.mealType === 'lunch') lnTotal += item.lineTotal;
      else if (item.mealType === 'dinner') dnTotal += item.lineTotal;
    });

    dataService.updateMessBill(editingBill.id, {
      periodStart: editPeriodStart,
      periodEnd: editPeriodEnd,
      reportedGrandTotal: editGrandTotal,
      reportedBreakfastTotal: editItems.length > 0 ? bfTotal : editingBill.reportedBreakfastTotal,
      reportedLunchTotal: editItems.length > 0 ? lnTotal : editingBill.reportedLunchTotal,
      reportedDinnerTotal: editItems.length > 0 ? dnTotal : editingBill.reportedDinnerTotal,
      notes: editNotes.trim() || undefined,
      items: editItems,
    });
    setEditingBill(null);
    setBills([...dataService.getMessBills()]);
    alert('Mess bill updated successfully!');
  };

  const handleDeleteBill = (bill: MessBill) => {
    if (window.confirm(`Are you sure you want to delete the mess bill for ${bill.periodStart} to ${bill.periodEnd} (₹${bill.reportedGrandTotal})?`)) {
      dataService.deleteMessBill(bill.id);
      setBills([...dataService.getMessBills()]);
    }
  };

  const handleAddEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        id: `edit_item_${Date.now()}`,
        foodName: 'New Item',
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        mealType: 'lunch',
      },
    ]);
  };

  const handleUpdateEditItem = (idx: number, updates: Partial<ExtractedBillItem>) => {
    setEditItems((prev) => {
      const copy = [...prev];
      const cur = { ...copy[idx], ...updates };
      cur.lineTotal = roundCurrency((cur.quantity || 0) * (cur.unitPrice || 0));
      copy[idx] = cur;
      return copy;
    });
  };

  const handleDeleteEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Parse WhatsApp Text
  const handleParseWhatsApp = () => {
    if (!whatsappText.trim()) return;

    const result = parseWhatsAppBill(whatsappText, foodItems);
    setOriginalRawText(whatsappText);
    setReportedGrandTotal(result.reportedGrandTotal);
    setExtractedItems(result.extractedItems);
    setWarnings(result.warnings);

    if (result.detectedDate) {
      setPeriodStart(result.detectedDate);
      setPeriodEnd(result.detectedDate);
    }

    setIsReviewing(true);
  };

  // Process File (PDF or Image OCR)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    try {
      const { text, parseResult } = await processUploadedBillFile(
        file,
        foodItems,
        (status) => setExtractionProgress(status)
      );

      setOriginalRawText(text);
      setReportedGrandTotal(parseResult.reportedGrandTotal);
      setExtractedItems(parseResult.extractedItems);
      setWarnings(parseResult.warnings);

      if (parseResult.detectedDate) {
        setPeriodStart(parseResult.detectedDate);
        setPeriodEnd(parseResult.detectedDate);
      }

      setIsReviewing(true);
    } catch (err: any) {
      alert(`Error processing file: ${err?.message || 'Failed to read file'}`);
    }
  };

  // Line item edits in review table
  const handleUpdateItem = (index: number, updates: Partial<ExtractedBillItem>) => {
    const updated = [...extractedItems];
    const target = { ...updated[index], ...updates };
    target.lineTotal = roundCurrency(target.quantity * target.unitPrice);
    updated[index] = target;
    setExtractedItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const updated = [...extractedItems];
    updated.splice(index, 1);
    setExtractedItems(updated);
  };

  const handleAddItem = () => {
    const defaultFood = foodItems[0];
    setExtractedItems([
      ...extractedItems,
      {
        id: `ext_${Date.now()}`,
        foodName: defaultFood ? defaultFood.name : 'Meals',
        quantity: 1,
        unitPrice: defaultFood ? defaultFood.currentPrice : 70,
        lineTotal: defaultFood ? defaultFood.currentPrice : 70,
        mealType: 'lunch',
        matchedFoodItemId: defaultFood?.id,
      },
    ]);
  };

  // Sum of extracted lines
  const calculatedSumOfLines = roundCurrency(
    extractedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  );

  const hasArithmeticDiscrepancy =
    extractedItems.length > 0 && Math.abs(calculatedSumOfLines - reportedGrandTotal) > 1;

  // Confirm and Save into MessBills
  const handleConfirmSaveBill = () => {
    if (reportedGrandTotal <= 0 && calculatedSumOfLines <= 0) {
      alert('Please enter a valid bill total');
      return;
    }

    const grandTotalToSave = reportedGrandTotal > 0 ? reportedGrandTotal : calculatedSumOfLines;

    // Calculate meal subtotals if itemized
    let bfTotal = 0;
    let lnTotal = 0;
    let dnTotal = 0;

    extractedItems.forEach((item) => {
      if (item.mealType === 'breakfast') bfTotal += item.lineTotal;
      else if (item.mealType === 'lunch') lnTotal += item.lineTotal;
      else if (item.mealType === 'dinner') dnTotal += item.lineTotal;
    });

    dataService.saveMessBill({
      periodStart,
      periodEnd,
      sourceType: importMode === 'file_upload' ? (selectedFile?.name.endsWith('.pdf') ? 'pdf' : 'image_ocr') : importMode === 'manual' ? 'manual' : 'whatsapp',
      originalMessage: originalRawText,
      reportedBreakfastTotal: roundCurrency(bfTotal) || undefined,
      reportedLunchTotal: roundCurrency(lnTotal) || undefined,
      reportedDinnerTotal: roundCurrency(dnTotal) || undefined,
      reportedGrandTotal: grandTotalToSave,
      attachmentName: selectedFile?.name,
      importStatus: 'verified',
      reconciliationStatus: 'draft',
      items: extractedItems,
      notes: billNotes.trim() || undefined,
      createdBy: 'Imran (Admin)',
    });

    setIsReviewing(false);
    setWhatsappText('');
    setSelectedFile(null);
    setExtractionProgress(null);
    setBills([...dataService.getMessBills()]);
    alert('Mess Bill saved successfully! Extracted items were synced to Menu & Prices. You can now proceed to Bill Reconciliation.');
  };

  return (
    <div className="space-y-6">
      {/* Tab Mode Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Import Mess In-Charge Bill</h2>
            <p className="text-xs text-slate-500">
              Paste WhatsApp text, upload bill receipts, or enter overall totals
            </p>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-medium">
            <button
              onClick={() => { setImportMode('whatsapp'); setIsReviewing(false); }}
              className={`px-3 py-1.5 rounded transition-all ${
                importMode === 'whatsapp'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WhatsApp Text
            </button>
            <button
              onClick={() => { setImportMode('file_upload'); setIsReviewing(false); }}
              className={`px-3 py-1.5 rounded transition-all ${
                importMode === 'file_upload'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Photo / PDF (OCR)
            </button>
            <button
              onClick={() => {
                setImportMode('manual');
                setIsReviewing(true);
                setExtractedItems([]);
                setReportedGrandTotal(0);
                setOriginalRawText('Manual bill entry');
              }}
              className={`px-3 py-1.5 rounded transition-all ${
                importMode === 'manual'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Total
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: WhatsApp Text Input */}
      {importMode === 'whatsapp' && !isReviewing && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paste Mess Bill Message
            </span>
            <button
              type="button"
              onClick={() => setWhatsappText(SAMPLE_WHATSAPP_TEXT)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Example WhatsApp Message</span>
            </button>
          </div>

          <textarea
            rows={8}
            placeholder={`Paste the bill text sent by mess in-charge on WhatsApp here...
Example:
Lunch food:
- Meals: 6 × ₹70 = ₹420
- Tomato biriyani: 4 × ₹60 = ₹240
Grand total: ₹660`}
            value={whatsappText}
            onChange={(e) => setWhatsappText(e.target.value)}
            className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800"
          />

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!whatsappText.trim()}
              onClick={handleParseWhatsApp}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <span>Parse & Verify Extracted Bill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Photo or PDF Upload */}
      {importMode === 'file_upload' && !isReviewing && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4 text-center">
          <div className="max-w-md mx-auto border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-6 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-slate-800">
              Upload Mess Receipt Photo or PDF Document
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports JPG, PNG, and PDF files. OCR will extract line items automatically.
            </p>
            <label className="mt-4 inline-block px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-2xs transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {extractionProgress && (
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">{extractionProgress.message}</span>
                <span className="font-bold text-slate-900">{extractionProgress.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${extractionProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage: Verification & Review Table */}
      {isReviewing && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Verify & Review Extracted Bill</span>
              </h3>
              <p className="text-xs text-slate-500">
                Check extracted quantities, prices, and arithmetic before saving.
              </p>
            </div>

            <button
              onClick={() => setIsReviewing(false)}
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Re-import / Cancel
            </button>
          </div>

          {/* Warnings Banner */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 space-y-1">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Arithmetic Check Callout */}
          {hasArithmeticDiscrepancy && (
            <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Arithmetic Warning: </strong>
                Reported Grand Total in message is {formatCurrency(reportedGrandTotal)}, but sum of line items is{' '}
                {formatCurrency(calculatedSumOfLines)} (Difference: {formatCurrency(Math.abs(reportedGrandTotal - calculatedSumOfLines))}).
                Please review item quantities or edit the reported total.
              </div>
            </div>
          )}

          {/* Billing Period Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Billing Period Start Date
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Billing Period End Date
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Reported Grand Total (₹)
              </label>
              <input
                type="number"
                min="0"
                value={reportedGrandTotal}
                onChange={(e) => setReportedGrandTotal(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold border border-slate-200 rounded-md px-2.5 py-1.5 bg-white font-tabular"
              />
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                Itemized Line Items ({extractedItems.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2 px-3 font-medium">Food Name</th>
                    <th className="py-2 px-3 font-medium">Meal</th>
                    <th className="py-2 px-3 font-medium text-right w-24">Quantity</th>
                    <th className="py-2 px-3 font-medium text-right w-28">Unit Price (₹)</th>
                    <th className="py-2 px-3 font-medium text-right w-28">Line Total (₹)</th>
                    <th className="py-2 px-3 font-medium text-right w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extractedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No itemized lines detected. Overall grand total only.
                      </td>
                    </tr>
                  ) : (
                    extractedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.foodName}
                            onChange={(e) => handleUpdateItem(idx, { foodName: e.target.value })}
                            className="w-full text-xs border border-slate-200 rounded px-2 py-1 font-medium text-slate-900"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.mealType || 'lunch'}
                            onChange={(e) => handleUpdateItem(idx, { mealType: e.target.value as MealType })}
                            className="text-xs border border-slate-200 rounded px-1.5 py-1 capitalize"
                          >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full text-right text-xs border border-slate-200 rounded px-2 py-1 font-tabular"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full text-right text-xs border border-slate-200 rounded px-2 py-1 font-tabular"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 font-tabular">
                          {formatCurrency(item.lineTotal)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Administrator Notes / Context (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received via WhatsApp from in-charge Suresh on Sunday night"
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md px-3 py-1.5"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="text-xs">
              <span className="text-slate-500">Calculated Line Sum: </span>
              <strong className="text-slate-900 font-tabular">{formatCurrency(calculatedSumOfLines)}</strong>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsReviewing(false)}
                className="px-3 py-2 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveBill}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
              >
                Confirm & Save Mess Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previously Imported Mess Bills */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Verified Imported Mess Bills ({bills.length})
          </h3>
          <button
            onClick={onNavigateToReconciliation}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Go to Reconciliation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {bills.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No imported mess bills yet</p>
              <p className="text-[11px] text-slate-400">
                Paste WhatsApp message text, upload a bill receipt, or enter manual totals above.
              </p>
            </div>
          )}
          {bills.map((bill) => (
            <div key={bill.id} className="p-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Period: {formatDateDisplay(bill.periodStart, { short: true })} to {formatDateDisplay(bill.periodEnd, { short: true })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">
                      {bill.sourceType}
                    </span>
                    {bill.reconciliationStatus === 'reconciled' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        Reconciled
                      </span>
                    )}
                  </div>
                  {bill.notes && (
                    <p className="text-xs text-slate-500 mt-1">{bill.notes}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Imported on {formatDateDisplay(bill.createdAt.split('T')[0])} by {bill.createdBy}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-base font-bold text-slate-900 font-tabular">
                      {formatCurrency(bill.reportedGrandTotal)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {bill.items?.length || 0} items extracted
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 pl-3 border-l border-slate-200">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await exportMessBillPdf(bill);
                        } catch (err: any) {
                          alert(`Export error: ${err?.message}`);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Export Mess Bill as PDF"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditBill(bill)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit Mess Bill"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBill(bill)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete Mess Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Mess Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-2xl w-full shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Edit Mess Bill</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedBill} className="space-y-4">
              {/* Arithmetic Discrepancy Warning in Edit Modal */}
              {hasEditArithmeticDiscrepancy && (
                <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-800 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Arithmetic Warning: </strong>
                    Reported Grand Total is {formatCurrency(editGrandTotal)}, but sum of line items is{' '}
                    {formatCurrency(calculatedEditSumOfLines)} (Difference: {formatCurrency(Math.abs(editGrandTotal - calculatedEditSumOfLines))}).
                    Please review item quantities or edit the reported total.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editPeriodStart}
                    onChange={(e) => setEditPeriodStart(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Period End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editPeriodEnd}
                    onChange={(e) => setEditPeriodEnd(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Reported Grand Total (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={editGrandTotal}
                    onChange={(e) => setEditGrandTotal(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 font-bold font-tabular text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Notes / Explanation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adjusted count after manual reconciliation"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5"
                />
              </div>

              {/* Items Table in Modal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                    Itemized Lines ({editItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {editItems.length > 0 && (
                  <div className="border border-slate-200 rounded-md overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">Meal</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Rate</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-3">
                              <input
                                type="text"
                                value={item.foodName}
                                onChange={(e) => handleUpdateEditItem(idx, { foodName: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded px-2 py-1 font-medium"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <select
                                value={item.mealType || 'lunch'}
                                onChange={(e) => handleUpdateEditItem(idx, { mealType: e.target.value as MealType })}
                                className="text-xs border border-slate-200 rounded px-1.5 py-1 capitalize"
                              >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                              </select>
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateEditItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                className="w-16 text-right text-xs border border-slate-200 rounded px-1.5 py-1 font-tabular"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateEditItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className="w-16 text-right text-xs border border-slate-200 rounded px-1.5 py-1 font-tabular"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right font-semibold text-slate-800 font-tabular">
                              {formatCurrency(item.lineTotal)}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEditItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {editItems.length > 0 && (
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-right text-xs font-medium text-slate-600">
                              Sum of Line Items:
                            </td>
                            <td className={`py-2 px-3 text-right font-tabular text-xs font-semibold ${
                              hasEditArithmeticDiscrepancy ? 'text-rose-600' : 'text-slate-800'
                            }`}>
                              {formatCurrency(calculatedEditSumOfLines)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await exportMessBillPdf(editingBill);
                    } catch (err: any) {
                      alert(`Export error: ${err?.message}`);
                    }
                  }}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export PDF</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingBill(null)}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={hasEditArithmeticDiscrepancy || editGrandTotal <= 0}
                    className="px-4 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-all"
                    title={
                      hasEditArithmeticDiscrepancy
                        ? 'Cannot save: Sum of line items does not match reported grand total'
                        : 'Save Changes'
                    }
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
