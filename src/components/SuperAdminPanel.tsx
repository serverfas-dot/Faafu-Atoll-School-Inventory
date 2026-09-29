import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Key, UserCheck, Users, Shield, Database, Download, Upload, RefreshCw, PenTool } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

type ApproverName = {
  id: string;
  name: string;
  created_at: string;
  signature_data?: string;
};

type AuthorizedRequester = {
  id: string;
  name: string;
  email: string | null;
  id_card_number: string | null;
  department: string | null;
  created_at: string;
};

type UserAccount = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

type Backup = {
  id: string;
  backup_type: string;
  backup_date: string;
  created_at: string;
  notes: string | null;
};

export function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState<'password' | 'users' | 'approvers' | 'requesters' | 'backups'>('password');
  const [approverNames, setApproverNames] = useState<ApproverName[]>([]);
  const [authorizedRequesters, setAuthorizedRequesters] = useState<AuthorizedRequester[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newApproverName, setNewApproverName] = useState('');
  const [newRequesterName, setNewRequesterName] = useState('');
  const [newRequesterEmail, setNewRequesterEmail] = useState('');
  const [newRequesterIdCard, setNewRequesterIdCard] = useState('');
  const [newRequesterDepartment, setNewRequesterDepartment] = useState('');
  const [editingApprover, setEditingApprover] = useState<ApproverName | null>(null);
  const [editingRequester, setEditingRequester] = useState<AuthorizedRequester | null>(null);
  const [changingUserPassword, setChangingUserPassword] = useState<string | null>(null);
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupType, setBackupType] = useState<'weekly' | 'monthly' | 'manual'>('manual');
  const [backupNotes, setBackupNotes] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentSignatureApprover, setCurrentSignatureApprover] = useState<string | null>(null);
  const [currentSignature, setCurrentSignature] = useState<string | undefined>(undefined);
  const { user } = useAuth();

  useEffect(() => {
    loadApproverNames();
    loadAuthorizedRequesters();
    loadUserAccounts();
    loadBackups();
  }, []);

  async function loadApproverNames() {
    const { data: approvers, error: approversError } = await supabase
      .from('approver_names')
      .select('*')
      .order('name');

    if (approversError || !approvers) {
      console.error('Error loading approvers:', approversError);
      return;
    }

    const { data: signatures, error: signaturesError } = await supabase
      .from('signatures')
      .select('person_name, signature_data');

    if (signaturesError) {
      console.error('Error loading signatures:', signaturesError);
    }

    const signatureMap = new Map(
      signatures?.map(sig => [sig.person_name, sig.signature_data]) || []
    );

    const approversWithSignatures = approvers.map(approver => ({
      ...approver,
      signature_data: signatureMap.get(approver.name),
    }));

    setApproverNames(approversWithSignatures);
  }

  async function loadAuthorizedRequesters() {
    const { data, error } = await supabase
      .from('authorized_requesters')
      .select('*')
      .order('name');

    if (!error && data) {
      setAuthorizedRequesters(data);
    }
  }

  async function loadUserAccounts() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');

    if (!error && data) {
      setUserAccounts(data);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error) {
      alert('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      alert('Error changing password: ' + error.message);
    }

    setChangingPassword(false);
  }

  async function handleAddApprover() {
    if (!newApproverName.trim()) {
      alert('Please enter a name');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('approver_names')
      .insert({ name: newApproverName.trim() });

    if (!error) {
      setNewApproverName('');
      await loadApproverNames();
    } else {
      alert('Error adding approver: ' + error.message);
    }

    setLoading(false);
  }

  async function handleUpdateApprover() {
    if (!editingApprover || !editingApprover.name.trim()) {
      alert('Please enter a name');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('approver_names')
      .update({ name: editingApprover.name.trim() })
      .eq('id', editingApprover.id);

    if (!error) {
      setEditingApprover(null);
      await loadApproverNames();
    } else {
      alert('Error updating approver: ' + error.message);
    }

    setLoading(false);
  }

  async function handleDeleteApprover(id: string) {
    if (!confirm('Are you sure you want to delete this approver?')) {
      return;
    }

    setLoading(true);

    const approver = approverNames.find(a => a.id === id);

    if (approver) {
      await supabase
        .from('signatures')
        .delete()
        .eq('person_name', approver.name);
    }

    const { error } = await supabase
      .from('approver_names')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadApproverNames();
    } else {
      alert('Error deleting approver: ' + error.message);
    }

    setLoading(false);
  }

  function handleOpenSignaturePad(approverName: string, existingSignature?: string) {
    setCurrentSignatureApprover(approverName);
    setCurrentSignature(existingSignature);
    setShowSignaturePad(true);
  }

  async function handleSaveSignature(signatureData: string) {
    if (!currentSignatureApprover) return;

    setLoading(true);

    const { data: existing } = await supabase
      .from('signatures')
      .select('id')
      .eq('person_name', currentSignatureApprover)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          updated_at: new Date().toISOString()
        })
        .eq('person_name', currentSignatureApprover);
      error = result.error;
    } else {
      const result = await supabase
        .from('signatures')
        .insert({
          person_name: currentSignatureApprover,
          signature_data: signatureData,
          role: 'approver'
        });
      error = result.error;
    }

    if (!error) {
      setShowSignaturePad(false);
      setCurrentSignatureApprover(null);
      setCurrentSignature(undefined);
      await loadApproverNames();
    } else {
      alert('Error saving signature: ' + error.message);
    }

    setLoading(false);
  }

  function handleCancelSignature() {
    setShowSignaturePad(false);
    setCurrentSignatureApprover(null);
    setCurrentSignature(undefined);
  }

  async function handleAddRequester() {
    if (!newRequesterName.trim()) {
      alert('Please enter a name');
      return;
    }

    if (!newRequesterEmail.trim()) {
      alert('Please enter an email');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('authorized_requesters')
      .insert({
        name: newRequesterName.trim(),
        email: newRequesterEmail.trim(),
        id_card_number: newRequesterIdCard.trim() || null,
        department: newRequesterDepartment.trim() || null
      });

    if (!error) {
      setNewRequesterName('');
      setNewRequesterEmail('');
      setNewRequesterIdCard('');
      setNewRequesterDepartment('');
      await loadAuthorizedRequesters();
    } else {
      alert('Error adding requester: ' + error.message);
    }

    setLoading(false);
  }

  async function handleUpdateRequester() {
    if (!editingRequester || !editingRequester.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (!editingRequester.email || !editingRequester.email.trim()) {
      alert('Please enter an email');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('authorized_requesters')
      .update({
        name: editingRequester.name.trim(),
        email: editingRequester.email.trim(),
        id_card_number: editingRequester.id_card_number?.trim() || null,
        department: editingRequester.department?.trim() || null
      })
      .eq('id', editingRequester.id);

    if (!error) {
      setEditingRequester(null);
      await loadAuthorizedRequesters();
    } else {
      alert('Error updating requester: ' + error.message);
    }

    setLoading(false);
  }

  async function handleDeleteRequester(id: string) {
    if (!confirm('Are you sure you want to delete this authorized requester?')) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('authorized_requesters')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadAuthorizedRequesters();
    } else {
      alert('Error deleting requester: ' + error.message);
    }

    setLoading(false);
  }

  async function handleChangeUserPassword(userId: string) {
    if (userNewPassword !== userConfirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (userNewPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

      if (sessionError || !session) {
        alert('Error: Not authenticated. Please login again.');
        setLoading(false);
        return;
      }

      console.log('Current session user:', session.user.id, session.user.email);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId,
            newPassword: userNewPassword,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Password updated successfully');
        setChangingUserPassword(null);
        setUserNewPassword('');
        setUserConfirmPassword('');
      } else {
        const errorMsg = result.error || 'Unknown error';
        const details = result.details ? ` (${result.details})` : '';
        const role = result.role ? ` [Role: ${result.role}]` : '';
        const userId = result.userId ? ` [User ID: ${result.userId}]` : '';
        const profileFound = result.profileFound !== undefined ? ` [Profile Found: ${result.profileFound}]` : '';
        alert('Error updating password: ' + errorMsg + details + role + userId + profileFound);
        console.error('Password update failed:', result);
      }
    } catch (error) {
      alert('Error updating password: ' + error);
      console.error('Password update exception:', error);
    }

    setLoading(false);
  }

  async function loadBackups() {
    const { data, error } = await supabase
      .from('backups')
      .select('id, backup_type, backup_date, created_at, notes')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBackups(data);
    }
  }

  async function handleCreateBackup() {
    setCreatingBackup(true);

    try {
      const [itemsData, stockInData, stockOutData, stockRequestsData] = await Promise.all([
        supabase.from('items').select('*'),
        supabase.from('stock_in').select('*'),
        supabase.from('stock_out').select('*'),
        supabase.from('stock_requests').select('*'),
      ]);

      const backupData = {
        items: itemsData.data || [],
        stock_in: stockInData.data || [],
        stock_out: stockOutData.data || [],
        stock_requests: stockRequestsData.data || [],
        backup_timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.from('backups').insert({
        backup_type: backupType,
        backup_data: backupData,
        notes: backupNotes || null,
        created_by: user?.id,
      });

      if (!error) {
        alert('Backup created successfully');
        setBackupNotes('');
        await loadBackups();
      } else {
        alert('Error creating backup: ' + error.message);
      }
    } catch (error) {
      alert('Error creating backup: ' + error);
    }

    setCreatingBackup(false);
  }

  async function handleDownloadBackup(backupId: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .maybeSingle();

    if (!error && data) {
      const blob = new Blob([JSON.stringify(data.backup_data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${data.backup_type}-${new Date(data.backup_date).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('Error downloading backup');
    }

    setLoading(false);
  }

  async function handleRestoreBackup(backupId: string) {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data!')) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('backups')
        .select('backup_data')
        .eq('id', backupId)
        .maybeSingle();

      if (error || !data) {
        alert('Error loading backup data');
        setLoading(false);
        return;
      }

      const backupData = data.backup_data as any;

      await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_in').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_out').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (backupData.items?.length) {
        await supabase.from('items').insert(backupData.items);
      }
      if (backupData.stock_in?.length) {
        await supabase.from('stock_in').insert(backupData.stock_in);
      }
      if (backupData.stock_out?.length) {
        await supabase.from('stock_out').insert(backupData.stock_out);
      }
      if (backupData.stock_requests?.length) {
        await supabase.from('stock_requests').insert(backupData.stock_requests);
      }

      alert('Backup restored successfully! Please refresh the page.');
    } catch (error) {
      alert('Error restoring backup: ' + error);
    }

    setLoading(false);
  }

  async function handleDeleteBackup(backupId: string) {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', backupId);

    if (!error) {
      await loadBackups();
    } else {
      alert('Error deleting backup');
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Super Admin Panel</h2>
        <p className="text-sm text-slate-600 mt-1">Manage system settings and authorized users</p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Change Password
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Manage Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab('approvers')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'approvers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Approver Names
            </div>
          </button>
          <button
            onClick={() => setActiveTab('requesters')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'requesters'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Authorized Requesters
            </div>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-3 font-medium transition border-b-2 ${
              activeTab === 'backups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Backup System
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'password' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md">
          <h3 className="text-md font-semibold text-slate-800 mb-4">Change Your Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Confirm new password"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-md font-semibold text-slate-800">User Accounts</h3>
            <p className="text-sm text-slate-600 mt-1">Manage user accounts and reset passwords</p>
          </div>
          <div className="divide-y divide-slate-200">
            {userAccounts.map((userAccount) => (
              <div key={userAccount.id} className="p-4 hover:bg-slate-50 transition">
                {changingUserPassword === userAccount.id ? (
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-slate-800 mb-3">{userAccount.email}</div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={userNewPassword}
                        onChange={(e) => setUserNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={userConfirmPassword}
                        onChange={(e) => setUserConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleChangeUserPassword(userAccount.id)}
                        disabled={loading || !userNewPassword || !userConfirmPassword}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {loading ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        onClick={() => {
                          setChangingUserPassword(null);
                          setUserNewPassword('');
                          setUserConfirmPassword('');
                        }}
                        className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{userAccount.email}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {userAccount.full_name} - {userAccount.role}
                      </div>
                    </div>
                    <button
                      onClick={() => setChangingUserPassword(userAccount.id)}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Key className="w-4 h-4" />
                      Change Password
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'approvers' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Add New Approver</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newApproverName}
                onChange={(e) => setNewApproverName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddApprover()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter approver name"
              />
              <button
                onClick={handleAddApprover}
                disabled={loading || !newApproverName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Approver
              </button>
              <p className="text-sm text-slate-600">
                After adding an approver, you can add their signature using the signature button.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-md font-semibold text-slate-800">Approver List</h3>
              <p className="text-sm text-slate-600 mt-1">Manage approvers and their signatures</p>
            </div>
            <div className="divide-y divide-slate-200">
              {approverNames.map((approver) => (
                <div key={approver.id} className="p-4 hover:bg-slate-50 transition">
                  {editingApprover?.id === approver.id ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={editingApprover.name}
                        onChange={(e) =>
                          setEditingApprover({ ...editingApprover, name: e.target.value })
                        }
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={handleUpdateApprover}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingApprover(null)}
                        className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{approver.name}</div>
                          {approver.signature_data ? (
                            <div className="mt-2">
                              <img
                                src={approver.signature_data}
                                alt={`${approver.name} signature`}
                                className="h-12 border border-slate-200 rounded px-2 bg-white"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 mt-1">No signature added</div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleOpenSignaturePad(approver.name, approver.signature_data)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title={approver.signature_data ? "Edit signature" : "Add signature"}
                          >
                            <PenTool className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingApprover(approver)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteApprover(approver.id)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete approver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requesters' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Add New Authorized Requester</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newRequesterName}
                onChange={(e) => setNewRequesterName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter requester name"
              />
              <input
                type="email"
                value={newRequesterEmail}
                onChange={(e) => setNewRequesterEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter requester email"
              />
              <input
                type="text"
                value={newRequesterIdCard}
                onChange={(e) => setNewRequesterIdCard(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter ID card number (optional)"
              />
              <select
                value={newRequesterDepartment}
                onChange={(e) => setNewRequesterDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Select department (optional)</option>
                <option value="Admin">Admin</option>
                <option value="Academic">Academic</option>
              </select>
              <button
                onClick={handleAddRequester}
                disabled={loading || !newRequesterName.trim() || !newRequesterEmail.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Requester
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-md font-semibold text-slate-800">Authorized Requester List</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {authorizedRequesters.map((requester) => (
                <div key={requester.id} className="p-4 hover:bg-slate-50 transition">
                  {editingRequester?.id === requester.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingRequester.name}
                        onChange={(e) =>
                          setEditingRequester({ ...editingRequester, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Name"
                      />
                      <input
                        type="email"
                        value={editingRequester.email || ''}
                        onChange={(e) =>
                          setEditingRequester({ ...editingRequester, email: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editingRequester.id_card_number || ''}
                        onChange={(e) =>
                          setEditingRequester({ ...editingRequester, id_card_number: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="ID Card Number (optional)"
                      />
                      <select
                        value={editingRequester.department || ''}
                        onChange={(e) =>
                          setEditingRequester({ ...editingRequester, department: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      >
                        <option value="">Select department (optional)</option>
                        <option value="Admin">Admin</option>
                        <option value="Academic">Academic</option>
                      </select>
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateRequester}
                          disabled={loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRequester(null)}
                          className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 px-4 py-2 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{requester.name}</div>
                        <div className="text-sm text-slate-600 mt-0.5">{requester.email || 'No email'}</div>
                        {requester.id_card_number && (
                          <div className="text-xs text-slate-500 mt-1">
                            <span className="font-medium">ID:</span> {requester.id_card_number}
                          </div>
                        )}
                        {requester.department && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className="font-medium">Dept:</span> {requester.department}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRequester(requester)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRequester(requester.id)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-md font-semibold text-slate-800 mb-4">Create Backup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Backup Type
                </label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value as 'weekly' | 'monthly' | 'manual')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="manual">Manual Backup</option>
                  <option value="weekly">Weekly Backup</option>
                  <option value="monthly">Monthly Backup</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={backupNotes}
                  onChange={(e) => setBackupNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Add notes about this backup..."
                />
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                {creatingBackup ? 'Creating Backup...' : 'Create Backup'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-md font-semibold text-slate-800">Backup History</h3>
              <p className="text-sm text-slate-600 mt-1">Manage and restore previous backups</p>
            </div>
            <div className="divide-y divide-slate-200">
              {backups.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  No backups found. Create your first backup above.
                </div>
              ) : (
                backups.map((backup) => (
                  <div key={backup.id} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            backup.backup_type === 'weekly'
                              ? 'bg-blue-100 text-blue-700'
                              : backup.backup_type === 'monthly'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {backup.backup_type.charAt(0).toUpperCase() + backup.backup_type.slice(1)}
                          </span>
                          <span className="text-sm text-slate-600">
                            {new Date(backup.backup_date).toLocaleString()}
                          </span>
                        </div>
                        {backup.notes && (
                          <p className="text-sm text-slate-600 mt-2">{backup.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadBackup(backup.id)}
                          disabled={loading}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                          title="Download backup"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={loading}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                          title="Restore backup"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Delete backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad
          onSave={handleSaveSignature}
          onCancel={handleCancelSignature}
          initialSignature={currentSignature}
        />
      )}
    </div>
  );
}
