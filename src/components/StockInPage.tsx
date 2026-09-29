import { useState, useEffect } from 'react';
import { supabase, Item, Supplier } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Trash2, Edit2, Search } from 'lucide-react';
import { recalculateStockOnHand } from '../lib/stockCalculations';

type StockInWithDetails = {
  id: string;
  date: string;
  item_id: string;
  item_code: string;
  item_description: string;
  po_number: string | null;
  supplier_id: string | null;
  quantity: number;
  stock_in: number;
  notes: string | null;
  items: { item_code: string; item_description: string };
  suppliers: { name: string } | null;
};

export function StockInPage() {
  const [stockIns, setStockIns] = useState<StockInWithDetails[]>([]);
  const [filteredStockIns, setFilteredStockIns] = useState<StockInWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StockInWithDetails | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item_id: '',
    po_number: '',
    supplier_id: '',
    quantity: '',
    notes: '',
  });
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = stockIns.filter(
      (record) =>
        record.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.po_number && record.po_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.suppliers?.name && record.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredStockIns(filtered);
  }, [searchTerm, stockIns]);

  async function loadData() {
    setLoading(true);

    const [stockInResult, itemsResult, suppliersResult] = await Promise.all([
      supabase
        .from('stock_in')
        .select('*, items(item_code, item_description), suppliers(name)')
        .order('date', { ascending: false }),
      supabase.from('items').select('*').order('item_code'),
      supabase.from('suppliers').select('*').order('name'),
    ]);

    if (!stockInResult.error && stockInResult.data) {
      setStockIns(stockInResult.data);
    }
    if (!itemsResult.error && itemsResult.data) {
      setItems(itemsResult.data);
    }
    if (!suppliersResult.error && suppliersResult.data) {
      setSuppliers(suppliersResult.data);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    console.log('=== HANDLESUBMIT START ===');
    console.log('RAW FORM DATA:', formData);
    console.log('editingRecord:', editingRecord);
    console.log('Is editing?', !!editingRecord);

    try {
      const cleanedItemId = (formData.item_id && formData.item_id !== 'undefined' && formData.item_id !== '') ? formData.item_id : null;

      if (!cleanedItemId) {
        alert('Please select a valid item');
        setProcessing(false);
        return;
      }

      const selectedItem = items.find(item => item.id === cleanedItemId);
      let supplierIdToUse: string | null = (formData.supplier_id && formData.supplier_id.trim() !== '' && formData.supplier_id !== 'undefined') ? formData.supplier_id : null;

      if (supplierIdToUse === 'undefined' || supplierIdToUse === '') {
        supplierIdToUse = null;
      }

      if (isAddingNewSupplier && newSupplierName.trim()) {
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert({ name: newSupplierName.trim() })
          .select()
          .single();

        if (supplierError) {
          alert('Error creating supplier: ' + supplierError.message);
          setProcessing(false);
          return;
        }

        supplierIdToUse = newSupplier?.id || null;
      }

      if (editingRecord) {
        const newQuantity = parseInt(formData.quantity);
        const oldItemId = editingRecord.item_id;

        const cleanedNotes = formData.notes?.trim();
        const cleanedPoNumber = formData.po_number?.trim();
        const finalSupplierIdUpdate = (supplierIdToUse && supplierIdToUse !== 'undefined' && supplierIdToUse !== '') ? supplierIdToUse : null;

        const updateData = {
          date: formData.date,
          item_id: cleanedItemId,
          item_code: selectedItem?.item_code || '',
          item_description: selectedItem?.item_description || '',
          po_number: (cleanedPoNumber && cleanedPoNumber !== 'undefined') ? cleanedPoNumber : null,
          supplier_id: finalSupplierIdUpdate,
          quantity: newQuantity,
          stock_in: newQuantity,
          notes: (cleanedNotes && cleanedNotes !== 'undefined') ? cleanedNotes : null,
        };

        console.log('FINAL UPDATE DATA:', JSON.stringify(updateData, null, 2));
        console.log('supplier_id type:', typeof updateData.supplier_id, 'value:', updateData.supplier_id);

        const { error } = await supabase
          .from('stock_in')
          .update(updateData)
          .eq('id', editingRecord.id);

        if (error) {
          console.error('Stock in update error:', error);
          alert('Error updating stock in: ' + error.message);
          setProcessing(false);
          return;
        }

        await recalculateStockOnHand(cleanedItemId);

        if (oldItemId !== cleanedItemId) {
          await recalculateStockOnHand(oldItemId);
        }

        await loadData();
        closeModal();
      } else {
        const cleanedNotesInsert = formData.notes?.trim();
        const cleanedPoNumberInsert = formData.po_number?.trim();

        const finalSupplierId = (supplierIdToUse && supplierIdToUse !== 'undefined' && supplierIdToUse !== '') ? supplierIdToUse : null;

        const insertData = {
          date: formData.date,
          item_id: cleanedItemId,
          item_code: selectedItem?.item_code || '',
          item_description: selectedItem?.item_description || '',
          po_number: (cleanedPoNumberInsert && cleanedPoNumberInsert !== 'undefined') ? cleanedPoNumberInsert : null,
          supplier_id: finalSupplierId,
          quantity: parseInt(formData.quantity),
          stock_in: parseInt(formData.quantity),
          notes: (cleanedNotesInsert && cleanedNotesInsert !== 'undefined') ? cleanedNotesInsert : null,
          created_by: user?.id || null,
        };

        console.log('FINAL INSERT DATA:', JSON.stringify(insertData, null, 2));
        console.log('supplier_id type:', typeof insertData.supplier_id, 'value:', insertData.supplier_id);

        const { error } = await supabase.from('stock_in').insert(insertData);

        if (error) {
          console.error('Stock in insert error:', error);
          alert('Error adding stock in: ' + error.message);
          setProcessing(false);
          return;
        }

        await recalculateStockOnHand(cleanedItemId);
        await loadData();
        closeModal();
      }
    } catch (error) {
      alert('Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this stock in entry?')) {
      const record = stockIns.find(s => s.id === id);
      const { error } = await supabase.from('stock_in').delete().eq('id', id);
      if (!error) {
        if (record) {
          await recalculateStockOnHand(record.item_id);
        }
        await loadData();
      }
    }
  }

  function openModal(record?: StockInWithDetails) {
    console.log('openModal called with record:', record);

    if (record) {
      console.log('Opening modal WITH record - EDIT MODE');
      setEditingRecord(record);

      const itemId = record.item_id ? String(record.item_id) : '';
      const supplierId = (record.supplier_id && record.supplier_id !== 'undefined' && record.supplier_id !== 'null') ? String(record.supplier_id) : '';

      console.log('Setting form data:', {
        item_id: itemId,
        supplier_id: supplierId,
      });

      setFormData({
        date: record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0],
        item_id: itemId,
        po_number: (record.po_number && record.po_number !== 'undefined') ? record.po_number : '',
        supplier_id: supplierId,
        quantity: (record.stock_in || record.quantity || 0).toString(),
        notes: (record.notes && record.notes !== 'undefined') ? record.notes : '',
      });
    } else {
      console.log('Opening modal WITHOUT record - ADD MODE');
      setEditingRecord(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        item_id: '',
        po_number: '',
        supplier_id: '',
        quantity: '',
        notes: '',
      });
    }
    setNewSupplierName('');
    setIsAddingNewSupplier(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRecord(null);
    setNewSupplierName('');
    setIsAddingNewSupplier(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item_id: '',
      po_number: '',
      supplier_id: '',
      quantity: '',
      notes: '',
    });
  }

  function toggleSelectAll() {
    if (selectedRecords.size === filteredStockIns.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredStockIns.map(record => record.id)));
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
      stockIns.filter(s => selectedRecords.has(s.id)).map(s => s.item_id)
    );

    const { error } = await supabase
      .from('stock_in')
      .delete()
      .in('id', Array.from(selectedRecords));

    if (!error) {
      for (const itemId of affectedItems) {
        await recalculateStockOnHand(itemId);
      }
      await loadData();
      setSelectedRecords(new Set());
    } else {
      alert('Error deleting stock in records');
    }

    setProcessing(false);
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">Stock In Records</h2>
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
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Stock In
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by item code, description, PO, or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-green-600"></div>
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
                      checked={filteredStockIns.length > 0 && selectedRecords.size === filteredStockIns.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Code</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">P.O. No</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Supplier</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock In</th>
                {isAdmin && <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStockIns.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : isAdmin ? 7 : 6} className="text-center py-12 text-slate-500">
                    No stock in records found
                  </td>
                </tr>
              ) : (
                filteredStockIns.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">{record.item_code || record.items.item_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{record.item_description || record.items.item_description}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.po_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{record.suppliers?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                        +{record.stock_in || record.quantity}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(record)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
              <h2 className="text-xl font-bold text-slate-800">
                {editingRecord ? 'Edit Stock In' : 'Add Stock In'}
              </h2>
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Item</label>
                  <select
                    required
                    value={formData.item_id || ''}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">P.O. Number</label>
                  <input
                    type="text"
                    value={formData.po_number}
                    onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="e.g., PO-2024-001"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Supplier</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewSupplier(!isAddingNewSupplier);
                        setNewSupplierName('');
                        setFormData({ ...formData, supplier_id: '' });
                      }}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      {isAddingNewSupplier ? 'Select Existing' : '+ Add New'}
                    </button>
                  </div>
                  {isAddingNewSupplier ? (
                    <input
                      type="text"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter new supplier name"
                    />
                  ) : (
                    <select
                      value={formData.supplier_id || ''}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    >
                      <option value="">Select supplier (optional)</option>
                      {suppliers.filter(s => s.id && s.id !== 'undefined').map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={processing}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : editingRecord ? 'Update Stock In' : 'Add Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
