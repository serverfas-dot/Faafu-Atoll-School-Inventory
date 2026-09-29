import { useState, useEffect } from 'react';
import { supabase, Item, StockRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, Clock, CheckCircle, XCircle, PenTool, Trash2 } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

type RequestWithDetails = StockRequest & {
  items: { item_code: string; item_description: string; unit: string };
};

export function RequestsPage() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<RequestWithDetails | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    section: profile?.section || '',
    purpose: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    setLoading(true);

    const [requestsResult, itemsResult] = await Promise.all([
      supabase
        .from('stock_requests')
        .select('*, items(item_code, item_description, unit)')
        .eq('requested_by', user.id)
        .order('requested_at', { ascending: false }),
      supabase.from('items').select('*').order('item_code'),
    ]);

    if (!requestsResult.error && requestsResult.data) {
      setRequests(requestsResult.data);
    }
    if (!itemsResult.error && itemsResult.data) {
      setItems(itemsResult.data);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!signature) {
      alert('Please add your signature before submitting');
      return;
    }

    const { error } = await supabase.from('stock_requests').insert({
      item_id: formData.item_id,
      quantity: parseInt(formData.quantity),
      section: formData.section,
      purpose: formData.purpose,
      requested_by: user?.id,
      requester_signature: signature,
    });

    if (!error) {
      await loadData();
      closeModal();
    }
  }

  function openModal() {
    setFormData({
      item_id: '',
      quantity: '',
      section: profile?.section || '',
      purpose: '',
    });
    setSignature('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSignature('');
  }

  function handleSaveSignature(sig: string) {
    setSignature(sig);
    setShowSignaturePad(false);
  }

  function openDeleteModal(request: RequestWithDetails) {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!requestToDelete) return;

    setProcessing(true);

    const { error } = await supabase
      .from('stock_requests')
      .delete()
      .eq('id', requestToDelete.id);

    if (!error) {
      if (requestToDelete.status === 'approved') {
        await supabase
          .from('stock_out')
          .delete()
          .eq('request_id', requestToDelete.id);
      }

      await loadData();
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } else {
      alert('Error deleting request');
    }

    setProcessing(false);
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">My Requests</h2>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Quantity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Section</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Purpose</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                {isSuperAdmin && <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12 text-slate-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {new Date(request.requested_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">
                      <div>
                        <div className="font-medium">{request.items.item_description}</div>
                        <div className="text-xs text-slate-500">{request.items.item_code}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-800">
                      {request.quantity} {request.items.unit}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{request.section}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{request.purpose}</td>
                    <td className="py-3 px-4">{getStatusBadge(request.status)}</td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openDeleteModal(request)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                          title="Delete Request"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">New Item Request</h2>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Item</label>
                <select
                  required
                  value={formData.item_id}
                  onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_code} - {item.item_description} (Available: {item.stock_on_hand})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter quantity needed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                <input
                  type="text"
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., Mathematics Department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Purpose</label>
                <textarea
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Explain why you need these items"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Signature *</label>
                {signature ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
                    <img src={signature} alt="Signature" className="h-20 mx-auto" />
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="w-full mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change Signature
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                  >
                    <PenTool className="w-5 h-5" />
                    Add Your Signature
                  </button>
                )}
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={() => setShowSignaturePad(false)}
          initialSignature={signature}
        />
      )}

      {showDeleteModal && requestToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Delete Request</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setRequestToDelete(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-red-800 font-medium">
                  Are you sure you want to delete this request?
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Item:</span> {requestToDelete.items.item_description}
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Quantity:</span> {requestToDelete.quantity} {requestToDelete.items.unit}
                </p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">Status:</span> <span className="capitalize">{requestToDelete.status}</span>
                </p>
              </div>

              <p className="text-sm text-slate-600">
                This action cannot be undone. The request will be permanently deleted.
                {requestToDelete.status === 'approved' && ' The associated stock out record will also be deleted.'}
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRequestToDelete(null);
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
                  Delete Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
