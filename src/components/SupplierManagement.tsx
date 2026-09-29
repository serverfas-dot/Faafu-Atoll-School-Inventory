import { useState, useEffect } from 'react';
import { supabase, Supplier } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Edit2, Trash2, Plus, X } from 'lucide-react';

export function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    const filtered = suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  }, [searchTerm, suppliers]);

  async function loadSuppliers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setSuppliers(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({ name: formData.name.trim() })
          .eq('id', editingSupplier.id);

        if (error) {
          alert('Error updating supplier: ' + error.message);
          setProcessing(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({ name: formData.name.trim() });

        if (error) {
          alert('Error adding supplier: ' + error.message);
          setProcessing(false);
          return;
        }
      }

      await loadSuppliers();
      closeModal();
    } catch (error) {
      alert('Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this supplier? This may affect existing stock records that reference this supplier.')) {
      return;
    }

    setProcessing(true);
    const { error } = await supabase.from('suppliers').delete().eq('id', id);

    if (error) {
      alert('Error deleting supplier: ' + error.message);
    } else {
      await loadSuppliers();
    }
    setProcessing(false);
  }

  function openModal(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '' });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '' });
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">Supplier Management</h2>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Supplier Name</th>
                {isAdmin && <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 2 : 1} className="text-center py-12 text-slate-500">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">{supplier.name}</td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(supplier)}
                            disabled={processing}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            disabled={processing}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter supplier name"
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
                  {processing ? 'Processing...' : editingSupplier ? 'Update' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
