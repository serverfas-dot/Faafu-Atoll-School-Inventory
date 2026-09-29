import { useState, useEffect } from 'react';
import { supabase, Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Edit2, Trash2, Plus, X, Upload } from 'lucide-react';
import { BulkItemImport } from './BulkItemImport';

type ItemWithTotals = Item & {
  total_stock_in: number;
  total_stock_out: number;
};

export function StockInventory() {
  const [items, setItems] = useState<ItemWithTotals[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemWithTotals[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    item_code: '',
    item_description: '',
    unit: 'pcs',
  });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const filtered = items.filter(
      (item) =>
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  async function loadItems() {
    setLoading(true);
    const { data: itemsData, error } = await supabase
      .from('items')
      .select('*')
      .order('item_code', { ascending: true });

    if (!error && itemsData) {
      const itemsWithTotals = await Promise.all(
        itemsData.map(async (item) => {
          const { data: stockInData } = await supabase
            .from('stock_in')
            .select('stock_in')
            .eq('item_id', item.id);

          const { data: stockOutData } = await supabase
            .from('stock_out')
            .select('stock_out')
            .eq('item_id', item.id);

          const total_stock_in = stockInData?.reduce((sum, row) => sum + (row.stock_in || 0), 0) || 0;
          const total_stock_out = stockOutData?.reduce((sum, row) => sum + (row.stock_out || 0), 0) || 0;

          return {
            ...item,
            total_stock_in,
            total_stock_out,
          };
        })
      );

      setItems(itemsWithTotals);
      setFilteredItems(itemsWithTotals);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingItem) {
      const { error } = await supabase
        .from('items')
        .update({
          item_code: formData.item_code,
          item_description: formData.item_description,
          unit: formData.unit,
        })
        .eq('id', editingItem.id);

      if (!error) {
        await loadItems();
        closeModal();
      }
    } else {
      const { error } = await supabase.from('items').insert({
        item_code: formData.item_code,
        item_description: formData.item_description,
        unit: formData.unit,
      });

      if (!error) {
        await loadItems();
        closeModal();
      }
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (!error) {
        await loadItems();
      }
    }
  }

  function openModal(item?: Item) {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_code: item.item_code,
        item_description: item.item_description,
        unit: item.unit,
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_code: '',
        item_description: '',
        unit: 'pcs',
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      item_code: '',
      item_description: '',
      unit: 'pcs',
    });
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by item code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Code</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock In</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock Out</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock on Hand</th>
                {isAdmin && <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-slate-500">
                    No items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">{item.item_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{item.item_description}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-800">{item.total_stock_in}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-800">{item.total_stock_out}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-medium ${
                          item.stock_on_hand > 10
                            ? 'bg-green-100 text-green-700'
                            : item.stock_on_hand > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.stock_on_hand}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item Code</label>
                <input
                  type="text"
                  required
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., ITM001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item Description</label>
                <input
                  type="text"
                  required
                  value={formData.item_description}
                  onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., A4 Paper"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="pcs">Pieces</option>
                  <option value="box">Box</option>
                  <option value="ream">Ream</option>
                  <option value="pack">Pack</option>
                  <option value="set">Set</option>
                  <option value="unit">Unit</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkImport && (
        <BulkItemImport
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            loadItems();
            setShowBulkImport(false);
          }}
        />
      )}
    </div>
  );
}
