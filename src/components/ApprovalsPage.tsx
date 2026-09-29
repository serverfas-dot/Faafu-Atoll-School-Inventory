import { useState, useEffect, useRef } from 'react';
import { supabase, StockRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Clock, Trash2, PenTool, Upload, Edit2, Package, Search } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { recalculateStockOnHand } from '../lib/stockCalculations';

type RequestWithDetails = StockRequest & {
  items: { item_code: string; item_description: string; unit: string; stock_on_hand: number };
  profiles: { full_name: string; section: string; email: string } | null;
};

type BatchRequest = {
  batch_id: string | null;
  requests: RequestWithDetails[];
  requester_name: string;
  requester_email: string | null;
  section: string;
  status: string;
  requested_at: string;
};

export function ApprovalsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchedRequests, setBatchedRequests] = useState<BatchRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BatchRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [approverNames, setApproverNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approverName, setApproverName] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<BatchRequest | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<BatchRequest | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    loadRequests();
    loadApproverNames();

    const channel = supabase
      .channel('stock_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_requests'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (showApprovalModal && approverName) {
      loadSignature(approverName);
    }
  }, [approverName, showApprovalModal]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRequests(batchedRequests);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = batchedRequests.filter(batch => {
      const matchesName = batch.requester_name.toLowerCase().includes(query);
      const matchesDate = new Date(batch.requested_at).toLocaleDateString().includes(query);
      const matchesSection = batch.section.toLowerCase().includes(query);
      const matchesApprover = batch.requests[0].approver_name?.toLowerCase().includes(query);

      return matchesName || matchesDate || matchesSection || matchesApprover;
    });

    setFilteredRequests(filtered);
  }, [searchQuery, batchedRequests]);

  async function loadSignature(personName: string) {
    const { data, error } = await supabase
      .from('signatures')
      .select('signature_data')
      .eq('person_name', personName)
      .maybeSingle();

    if (!error && data) {
      setSignature(data.signature_data);
    } else {
      setSignature('');
    }
  }

  async function saveSignature(personName: string, signatureData: string) {
    const { error } = await supabase
      .from('signatures')
      .upsert(
        {
          person_name: personName,
          signature_data: signatureData,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'person_name' }
      );

    if (error) {
      console.error('Error saving signature:', error);
      alert('Error saving signature');
    }
  }

  async function loadApproverNames() {
    const { data, error } = await supabase
      .from('approver_names')
      .select('name')
      .order('name');

    if (!error && data) {
      const names = data.map(item => item.name);
      setApproverNames(names);
      if (names.length > 0 && !approverName) {
        setApproverName(names[0]);
      }
    }
  }

  async function loadRequests() {
    setLoading(true);

    const { data: requestsData, error } = await supabase
      .from('stock_requests')
      .select('*, items(item_code, item_description, unit, stock_on_hand)')
      .order('requested_at', { ascending: false });

    if (!error && requestsData) {
      const requestsWithProfiles = await Promise.all(
        requestsData.map(async (request) => {
          if (request.requested_by) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, section, email')
              .eq('id', request.requested_by)
              .maybeSingle();

            return {
              ...request,
              profiles: profileData,
            };
          }
          return {
            ...request,
            profiles: null,
          };
        })
      );

      const batched = groupRequestsByBatch(requestsWithProfiles);
      setBatchedRequests(batched);
    }

    setLoading(false);
  }

  function groupRequestsByBatch(requests: RequestWithDetails[]): BatchRequest[] {
    const batchMap = new Map<string, RequestWithDetails[]>();
    const noBatchRequests: RequestWithDetails[] = [];

    requests.forEach(request => {
      if (request.batch_id) {
        if (!batchMap.has(request.batch_id)) {
          batchMap.set(request.batch_id, []);
        }
        batchMap.get(request.batch_id)!.push(request);
      } else {
        noBatchRequests.push(request);
      }
    });

    const batched: BatchRequest[] = [];

    batchMap.forEach((batchRequests, batchId) => {
      const firstRequest = batchRequests[0];
      batched.push({
        batch_id: batchId,
        requests: batchRequests,
        requester_name: firstRequest.requester_name || firstRequest.profiles?.full_name || 'Unknown',
        requester_email: firstRequest.profiles?.email || firstRequest.requester_email || null,
        section: firstRequest.section,
        status: firstRequest.status,
        requested_at: firstRequest.requested_at,
      });
    });

    noBatchRequests.forEach(request => {
      batched.push({
        batch_id: null,
        requests: [request],
        requester_name: request.requester_name || request.profiles?.full_name || 'Unknown',
        requester_email: request.profiles?.email || request.requester_email || null,
        section: request.section,
        status: request.status,
        requested_at: request.requested_at,
      });
    });

    return batched.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }

  function openApprovalModal(batch: BatchRequest, action: 'approve' | 'reject') {
    if (action === 'approve') {
      for (const request of batch.requests) {
        if (request.quantity > request.items.stock_on_hand) {
          alert(`Cannot approve: Only ${request.items.stock_on_hand} units of ${request.items.item_description} available in stock`);
          return;
        }
      }
    }
    setSelectedBatch(batch);
    setApprovalAction(action);
    setApproverName(approverNames.length > 0 ? approverNames[0] : '');
    setSignature('');
    setShowApprovalModal(true);
  }

  async function handleSaveSignature(sig: string) {
    setSignature(sig);
    setShowSignaturePad(false);
    await saveSignature(approverName, sig);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setSignature(result);
      await saveSignature(approverName, result);
    };
    reader.readAsDataURL(file);
  }

  async function handleApprove() {
    if (!approverName.trim()) {
      alert('Please enter your full name');
      return;
    }

    if (!signature) {
      alert('Please add your signature');
      return;
    }

    if (!selectedBatch) return;

    const batchId = selectedBatch.batch_id || selectedBatch.requests[0].id;
    setProcessing(batchId);

    let signatureUrl = signature;

    if (signature && signature.startsWith('data:image')) {
      try {
        const response = await fetch(signature);
        const blob = await response.blob();
        const fileName = `signature-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assets')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Signature upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('assets')
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      } catch (error) {
        console.error('Error processing signature:', error);
      }
    }

    const approvalData = {
      status: 'approved',
      approved_by: user?.id,
      approver_name: approverName.trim(),
      approver_signature: signatureUrl,
      approved_at: new Date().toISOString(),
    };

    const batchToProcess = selectedBatch;
    const approverNameTrimmed = approverName.trim();

    setShowApprovalModal(false);
    setSelectedBatch(null);
    setSignature('');

    try {
      const affectedItems = new Set<string>();

      const updates = batchToProcess.requests.map(async (request) => {
        const updateResult = await supabase
          .from('stock_requests')
          .update(approvalData)
          .eq('id', request.id);

        if (updateResult.error) {
          throw new Error(`Error approving ${request.items.item_description}`);
        }

        const requestedEmployee = request.requester_name || request.profiles?.full_name || 'Unknown';

        const stockOutResult = await supabase.from('stock_out').insert({
          date: new Date().toISOString().split('T')[0],
          item_id: request.item_id,
          item_code: request.items.item_code,
          item_description: request.items.item_description,
          section: request.section,
          requested_employee: requestedEmployee,
          quantity: request.quantity,
          stock_out: request.quantity,
          approver_name: approverNameTrimmed,
          notes: `Request approved by ${approverNameTrimmed}: ${request.purpose}`,
          request_id: request.id,
          created_by: user?.id,
        });

        if (stockOutResult.error) {
          throw new Error(`Error creating stock out for ${request.items.item_description}`);
        }

        affectedItems.add(request.item_id);
      });

      await Promise.all(updates);

      for (const itemId of affectedItems) {
        await recalculateStockOnHand(itemId);
      }

      await loadRequests();

      if (batchToProcess.requester_email) {
        const items = batchToProcess.requests.map(req => ({
          name: req.items.item_description,
          quantity: req.quantity,
          unit: req.items.unit
        }));

        const message = batchToProcess.requests.length === 1
          ? `Your request for ${items[0].quantity} ${items[0].unit} of ${items[0].name} has been approved.`
          : `Your request for ${items.length} items has been approved.`;

        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: batchToProcess.requester_email,
            subject: 'Stock Request Approved',
            message: message,
            requesterName: batchToProcess.requester_name,
            approverName: approverNameTrimmed,
            approverSignature: signatureUrl,
            items: items,
            status: 'approved'
          }),
        }).catch(error => console.error('Email notification error:', error));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error processing approval');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject() {
    if (!approverName.trim()) {
      alert('Please enter your full name');
      return;
    }

    if (!signature) {
      alert('Please add your signature');
      return;
    }

    if (!selectedBatch) return;

    const batchId = selectedBatch.batch_id || selectedBatch.requests[0].id;
    setProcessing(batchId);

    let signatureUrl = signature;

    if (signature && signature.startsWith('data:image')) {
      try {
        const response = await fetch(signature);
        const blob = await response.blob();
        const fileName = `signature-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assets')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Signature upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('assets')
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      } catch (error) {
        console.error('Error processing signature:', error);
      }
    }

    const rejectionData = {
      status: 'rejected',
      approved_by: user?.id,
      approver_name: approverName.trim(),
      approver_signature: signatureUrl,
      approved_at: new Date().toISOString(),
    };

    const batchToProcess = selectedBatch;
    const approverNameTrimmed = approverName.trim();

    setShowApprovalModal(false);
    setSelectedBatch(null);
    setSignature('');

    try {
      const updates = batchToProcess.requests.map(async (request) => {
        const result = await supabase
          .from('stock_requests')
          .update(rejectionData)
          .eq('id', request.id);

        if (result.error) {
          throw new Error(`Error rejecting ${request.items.item_description}`);
        }
      });

      await Promise.all(updates);

      await loadRequests();

      if (batchToProcess.requester_email) {
        const items = batchToProcess.requests.map(req => ({
          name: req.items.item_description,
          quantity: req.quantity,
          unit: req.items.unit
        }));

        const message = batchToProcess.requests.length === 1
          ? `Your request for ${items[0].quantity} ${items[0].unit} of ${items[0].name} has been rejected.`
          : `Your request for ${items.length} items has been rejected.`;

        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: batchToProcess.requester_email,
            subject: 'Stock Request Rejected',
            message: message,
            requesterName: batchToProcess.requester_name,
            approverName: approverNameTrimmed,
            approverSignature: signatureUrl,
            items: items,
            status: 'rejected'
          }),
        }).catch(error => console.error('Email notification error:', error));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error processing rejection');
    } finally {
      setProcessing(null);
    }
  }

  function submitApproval() {
    if (approvalAction === 'approve') {
      handleApprove();
    } else {
      handleReject();
    }
  }

  function openDeleteModal(batch: BatchRequest) {
    setBatchToDelete(batch);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!batchToDelete) return;

    const batchId = batchToDelete.batch_id || batchToDelete.requests[0].id;
    setProcessing(batchId);

    const batchToProcess = batchToDelete;

    setShowDeleteModal(false);
    setBatchToDelete(null);

    try {
      const affectedItems = new Set<string>();

      const deletes = batchToProcess.requests.map(async (request) => {
        if (request.status === 'approved') {
          await supabase
            .from('stock_out')
            .delete()
            .eq('request_id', request.id);

          affectedItems.add(request.item_id);
        }

        const result = await supabase
          .from('stock_requests')
          .delete()
          .eq('id', request.id);

        if (result.error) {
          console.error('Delete error:', result.error);
          throw new Error(`Error deleting ${request.items.item_description}: ${result.error.message}`);
        }
        return result;
      });

      await Promise.all(deletes);

      for (const itemId of affectedItems) {
        await recalculateStockOnHand(itemId);
      }

      alert('Request(s) deleted successfully');
      loadRequests();
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error instanceof Error ? error.message : 'Error deleting requests');
    } finally {
      setProcessing(null);
    }
  }

  function openEditModal(batch: BatchRequest) {
    setBatchToEdit(batch);
    setShowEditModal(true);
  }

  async function handleEditSubmit() {
    if (!batchToEdit) return;

    const batchId = batchToEdit.batch_id || batchToEdit.requests[0].id;
    setProcessing(batchId);

    const batchToProcess = batchToEdit;

    setShowEditModal(false);
    setBatchToEdit(null);

    try {
      const affectedItems = new Set<string>();

      const updates = batchToProcess.requests.map(async (request) => {
        const result = await supabase
          .from('stock_requests')
          .update({
            status: 'pending',
            approved_by: null,
            approver_name: null,
            approver_signature: null,
            approved_at: null,
          })
          .eq('id', request.id);

        if (result.error) {
          throw new Error(`Error editing ${request.items.item_description}`);
        }

        if (request.status === 'approved') {
          await supabase
            .from('stock_out')
            .delete()
            .eq('request_id', request.id);

          affectedItems.add(request.item_id);
        }
      });

      await Promise.all(updates);

      for (const itemId of affectedItems) {
        await recalculateStockOnHand(itemId);
      }

      await loadRequests();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error editing requests');
    } finally {
      setProcessing(null);
    }
  }

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
            <Check className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <X className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Request Approvals</h2>
        <p className="text-sm text-slate-600 mt-1">Review and approve item requests from staff</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, date, section, or approver..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No requests found matching your search' : 'No requests found'}
            </div>
          ) : (
            filteredRequests.map((batch, batchIndex) => (
              <div
                key={batch.batch_id || batch.requests[0].id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">
                        {batch.requests.length} Item{batch.requests.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      {batch.requests.map((request, idx) => (
                        <div key={request.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="font-semibold text-slate-800">{request.items.item_description}</p>
                              <p className="text-xs text-slate-500">{request.items.item_code}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Quantity</p>
                              <p className="font-medium text-slate-800">
                                {request.quantity} {request.items.unit}
                              </p>
                              <p className={`text-xs ${
                                request.items.stock_on_hand >= request.quantity
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                Stock: {request.items.stock_on_hand}
                              </p>
                            </div>
                            {request.purpose && (
                              <div>
                                <p className="text-xs text-slate-500">Purpose</p>
                                <p className="text-xs text-slate-700">{request.purpose}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">Requester:</span> {batch.requester_name}
                      </div>
                      <div>
                        <span className="font-medium">Section:</span> {batch.section}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {new Date(batch.requested_at).toLocaleDateString()}
                      </div>
                      {batch.status !== 'pending' && batch.requests[0].approver_name && (
                        <div>
                          <span className="font-medium">By:</span> {batch.requests[0].approver_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {batch.status === 'pending' && (
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => openApprovalModal(batch, 'approve')}
                        disabled={processing === (batch.batch_id || batch.requests[0].id)}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Approve</span>
                      </button>
                      <button
                        onClick={() => openApprovalModal(batch, 'reject')}
                        disabled={processing === (batch.batch_id || batch.requests[0].id)}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Reject</span>
                      </button>
                      {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                        <button
                          onClick={() => openDeleteModal(batch)}
                          disabled={processing === (batch.batch_id || batch.requests[0].id)}
                          className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {batch.status !== 'pending' && profile?.role === 'super_admin' && (
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => openEditModal(batch)}
                        disabled={processing === (batch.batch_id || batch.requests[0].id)}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(batch)}
                        disabled={processing === (batch.batch_id || batch.requests[0].id)}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showApprovalModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Request
              </h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedBatch(null);
                  setSignature('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  {selectedBatch.requests.length} Item{selectedBatch.requests.length !== 1 ? 's' : ''} to {approvalAction}
                </p>
                {selectedBatch.requests.map((request, idx) => (
                  <div key={request.id} className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                    <p>
                      <span className="font-medium">Item:</span> {request.items.item_description} ({request.items.item_code})
                    </p>
                    <p>
                      <span className="font-medium">Quantity:</span> {request.quantity} {request.items.unit}
                    </p>
                  </div>
                ))}
                <p className="text-sm text-slate-600 pt-2 border-t">
                  <span className="font-medium">Requested by:</span> {selectedBatch.requester_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approver Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {approverNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  This name will appear on the approval record
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Signature <span className="text-red-500">*</span>
                </label>
                {signature ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
                    <img src={signature} alt="Signature" className="h-20 mx-auto" />
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => setShowSignaturePad(true)}
                        className="flex-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                      >
                        Draw New
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                      >
                        Upload New
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                    >
                      <PenTool className="w-6 h-6" />
                      <span className="text-sm font-medium">Draw Signature</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">Upload Image</span>
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedBatch(null);
                    setSignature('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitApproval}
                  disabled={!approverName.trim() || processing === (selectedBatch.batch_id || selectedBatch.requests[0].id)}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    approvalAction === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && batchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Delete Request</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setBatchToDelete(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-red-800 font-medium">
                  Are you sure you want to delete this request with {batchToDelete.requests.length} item{batchToDelete.requests.length !== 1 ? 's' : ''}?
                </p>
                {batchToDelete.requests.map((request) => (
                  <p key={request.id} className="text-sm text-red-700">
                    • {request.items.item_description} - {request.quantity} {request.items.unit}
                  </p>
                ))}
                <p className="text-sm text-red-700 pt-2 border-t border-red-200">
                  <span className="font-medium">Requested by:</span> {batchToDelete.requester_name}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                This action cannot be undone. The request will be permanently deleted.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setBatchToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={processing === (batchToDelete.batch_id || batchToDelete.requests[0].id)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && batchToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Edit Request</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setBatchToEdit(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-blue-800 font-medium">
                  Reset request to pending status?
                </p>
                {batchToEdit.requests.map((request) => (
                  <p key={request.id} className="text-sm text-blue-700">
                    • {request.items.item_description} - {request.quantity} {request.items.unit}
                  </p>
                ))}
                <p className="text-sm text-blue-700 pt-2 border-t border-blue-200">
                  <span className="font-medium">Current Status:</span>{' '}
                  <span className="capitalize font-semibold">{batchToEdit.status}</span>
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Requested by:</span> {batchToEdit.requester_name}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                This will reset the request back to pending status, removing the approval/rejection and allowing it to be processed again.
                {batchToEdit.status === 'approved' && ' The associated stock out records will also be deleted.'}
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setBatchToEdit(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={processing === (batchToEdit.batch_id || batchToEdit.requests[0].id)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset to Pending
                </button>
              </div>
            </div>
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
    </div>
  );
}
