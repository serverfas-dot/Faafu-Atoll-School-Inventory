import { useState, useEffect } from 'react';
import { supabase, Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Trash2 } from 'lucide-react';
import { recalculateStockOnHand } from '../lib/stockCalculations';

type StockOutWithDetails = {
  id: string;
  date: string;
  item_id: string;
  item_code: string;
  item_description: string;
  section: string;
  requested_employee: string;
  quantity: number;
  stock_out: number;
  notes: string | null;
  items: { item_code: string; item_description: string };
};

export function StockOutPage() {
  const [stockOuts, setStockOuts] = useState<StockOutWithDetails[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<StockOutWithDetails | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item_id: '',
    section: '',
    requested_employee: '',
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [stockOutResult, itemsResult] = await Promise.all([
      supabase
        .from('stock_out')
        .select('*, items(item_code, item_description)')
        .order('date', { ascending: false }),
      supabase.from('items').select('*').order('item_code'),
    ]);

    if (!stockOutResult.error && stockOutResult.data) {
      setStockOuts(stockOutResult.data);
    }
    if (!itemsResult.error && itemsResult.data) {
      setItems(itemsResult.data);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const selectedItem = items.find(item => item.id === formData.item_id);

    const cleanedNotes = formData.notes?.trim();

    const { error } = await supabase.from('stock_out').insert({
      date: formData.date,
      item_id: formData.item_id,
      item_code: selectedItem?.item_code || '',
      item_description: selectedItem?.item_description || '',
      section: formData.section,
      requested_employee: formData.requested_employee,
      quantity: parseInt(formData.quantity),
      stock_out: parseInt(formData.quantity),
      notes: (cleanedNotes && cleanedNotes !== 'undefined') ? cleanedNotes : null,
      created_by: user?.id,
    });

    if (!error) {
      await recalculateStockOnHand(formData.item_id);
      await loadData();
      closeModal();
    }
  }

  function openModal() {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item_id: '',
      section: '',
      requested_employee: '',
      quantity: '',
      notes: '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function openDeleteModal(record: StockOutWithDetails) {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!recordToDelete) return;

    setProcessing(true);

    const itemId = recordToDelete.item_id;

    const { error } = await supabase
      .from('stock_out')
      .delete()
      .eq('id', recordToDelete.id);

    if (!error) {
      await recalculateStockOnHand(itemId);
      await loadData();
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } else {
      alert('Error deleting stock out record');
    }

    setProcessing(false);
  }

  function toggleSelectAll() {
    if (selectedRecords.size === stockOuts.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(stockOuts.map(record => record.id)));
    }
  }

  function toggleSelectRecord(id: string) {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  }

  async function handleBulkDelete() {
    if (selectedRecords.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedRecords.size} selected record(s)? This action cannot be undone.`)) {
      return;
    }

    setProcessing(true);

    const affectedItems = new Set(
      stockOuts.filter(s => selectedRecords.has(s.id)).map(s => s.item_id)
    );

    const { error } = await supabase
      .from('stock_out')
      .delete()
      .in('id', Array.from(selectedRecords));

    if (!error) {
      for (const itemId of affectedItems) {
        await recalculateStockOnHand(itemId);
      }
      await loadData();
      setSelectedRecords(new Set());
    } else {
      alert('Error deleting stock out records');
    }

    setProcessing(false);
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Stock Out Records</h2>
        <div className="flex gap-2">
          {isSuperAdmin && selectedRecords.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={processing}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedRecords.size})
            </button>
          )}
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Stock Out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-orange-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {isSuperAdmin && (
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={stockOuts.length > 0 && selectedRecords.size === stockOuts.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Code</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Section</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Requested By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Approved By</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock Out</th>
                {isSuperAdmin && <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {stockOuts.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 7} className="text-center py-12 text-slate-500">
                    No stock out records found
                  </td>
                </tr>
              ) : (
                stockOuts.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">{record.item_code || record.items.item_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{record.item_description || record.items.item_description}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.section}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.requested_employee}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.approver_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                        -{record.stock_out || record.quantity}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openDeleteModal(record)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Add Stock Out</h2>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Item</label>
                  <select
                    required
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_code} - {item.item_description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="e.g., Science Department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Requested Employee</label>
                  <input
                    type="text"
                    required
                    value={formData.requested_employee}
                    onChange={(e) => setFormData({ ...formData, requested_employee: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Employee name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
                >
                  Add Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Delete Stock Out Record</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRecordToDelete(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-red-800 font-medium">
                  Are you sure you want to delete this stock out record?
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Date:</span> {new Date(recordToDelete.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Item:</span> {recordToDelete.item_description || recordToDelete.items.item_description}
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Quantity:</span> {recordToDelete.stock_out || recordToDelete.quantity}
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Requested By:</span> {recordToDelete.requested_employee}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                This action cannot be undone. The stock out record will be permanently deleted.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRecordToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
