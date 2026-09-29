import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Plus, Trash2, FileText } from 'lucide-react';

interface BulkItem {
  item_code: string;
  item_description: string;
  unit: string;
}

interface BulkItemImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkItemImport({ onClose, onSuccess }: BulkItemImportProps) {
  const [items, setItems] = useState<BulkItem[]>([
    { item_code: '', item_description: '', unit: 'pcs' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csvText, setCsvText] = useState('');
  const [showCsvInput, setShowCsvInput] = useState(false);

  function addRow() {
    setItems([...items, { item_code: '', item_description: '', unit: 'pcs' }]);
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof BulkItem, value: string) {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  }

  function parseCsv(text: string) {
    const lines = text.trim().split('\n');
    const parsedItems: BulkItem[] = [];

    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('item')) {
        return;
      }

      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsedItems.push({
          item_code: parts[0],
          item_description: parts[1],
          unit: parts[2] || 'pcs'
        });
      }
    });

    if (parsedItems.length > 0) {
      setItems(parsedItems);
      setShowCsvInput(false);
      setCsvText('');
    } else {
      setError('No valid items found in CSV. Format: item_code, item_description, unit');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validItems = items.filter(item => item.item_code && item.item_description);

    if (validItems.length === 0) {
      setError('Please add at least one item with code and description');
      return;
    }

    const duplicateCodes = validItems
      .map(item => item.item_code)
      .filter((code, index, self) => self.indexOf(code) !== index);

    if (duplicateCodes.length > 0) {
      setError(`Duplicate item codes found: ${duplicateCodes.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const { data: existingItems } = await supabase
        .from('items')
        .select('item_code')
        .in('item_code', validItems.map(i => i.item_code));

      if (existingItems && existingItems.length > 0) {
        const existingCodes = existingItems.map(i => i.item_code);
        setError(`These item codes already exist: ${existingCodes.join(', ')}`);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('items')
        .insert(validItems.map(item => ({
          item_code: item.item_code,
          item_description: item.item_description,
          unit: item.unit,
          stock_on_hand: 0
        })));

      if (insertError) {
        setError(insertError.message);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import items');
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Bulk Import Items</h2>
            <p className="text-sm text-slate-600 mt-1">Add multiple items at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!showCsvInput ? (
            <>
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={() => setShowCsvInput(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  <FileText className="w-4 h-4" />
                  Import from CSV
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-12 gap-3 text-sm font-medium text-slate-700 pb-2 border-b border-slate-200">
                    <div className="col-span-3">Item Code *</div>
                    <div className="col-span-5">Item Description *</div>
                    <div className="col-span-3">Unit</div>
                    <div className="col-span-1"></div>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-start">
                      <input
                        type="text"
                        value={item.item_code}
                        onChange={(e) => updateItem(index, 'item_code', e.target.value)}
                        className="col-span-3 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="CODE-001"
                        required
                      />
                      <input
                        type="text"
                        value={item.item_description}
                        onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                        className="col-span-5 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Item description"
                        required
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="col-span-3 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                        <option value="kg">Kilogram</option>
                        <option value="ltr">Liter</option>
                        <option value="unit">Unit</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={items.length === 1}
                        className="col-span-1 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {loading ? 'Importing...' : `Import ${items.filter(i => i.item_code && i.item_description).length} Items`}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format:</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Paste your CSV data below. Format should be:
                </p>
                <code className="text-xs bg-blue-100 text-blue-900 p-2 rounded block">
                  item_code, item_description, unit<br />
                  CODE-001, Pencil HB, pcs<br />
                  CODE-002, A4 Paper, pack<br />
                  CODE-003, Whiteboard Marker, box
                </code>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                  {error}
                </div>
              )}

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="Paste CSV data here..."
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvInput(false);
                    setCsvText('');
                    setError('');
                  }}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => parseCsv(csvText)}
                  disabled={!csvText.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Parse CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
