import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StockInventory } from './StockInventory';
import { StockInPage } from './StockInPage';
import { StockOutPage } from './StockOutPage';
import { ReportsPage } from './ReportsPage';
import { RequestsPage } from './RequestsPage';
import { ApprovalsPage } from './ApprovalsPage';
import { ReportsGenerator } from './ReportsGenerator';
import { ChangePassword } from './ChangePassword';
import { SuperAdminPanel } from './SuperAdminPanel';
import { SupplierManagement } from './SupplierManagement';
import { Package, TrendingUp, TrendingDown, FileText, ShoppingCart, CheckSquare, LogOut, FileBarChart, ArrowLeft, Key, Shield, Truck } from 'lucide-react';

type Tab = 'inventory' | 'stock-in' | 'stock-out' | 'suppliers' | 'reports' | 'requests' | 'approvals' | 'generate-reports' | 'change-password' | 'super-admin';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBackToPublic = () => {
    window.location.href = '/';
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/png.png" alt="Faafu Atoll School" className="w-12 h-12 object-contain rounded-full" />
              <div>
                <h1 className="text-lg font-bold text-slate-800">Faafu Atoll School</h1>
                <p className="text-xs text-slate-600">Stock Inventory System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToPublic}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Back to Public Request Form"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Public Form</span>
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{profile?.full_name}</p>
                <p className="text-xs text-slate-600 capitalize">{profile?.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Stock Inventory
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('stock-in')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'stock-in'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Stock In
                  </button>

                  <button
                    onClick={() => setActiveTab('stock-out')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'stock-out'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Stock Out
                  </button>

                  <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'suppliers'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    Suppliers
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Reports
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'requests'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                My Requests
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'approvals'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Approvals
                  </button>

                  <button
                    onClick={() => setActiveTab('generate-reports')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'generate-reports'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <FileBarChart className="w-4 h-4" />
                    Generate Reports
                  </button>
                </>
              )}

              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('super-admin')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'super-admin'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Super Admin
                  </button>
                  <button
                    onClick={() => setActiveTab('change-password')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                      activeTab === 'change-password'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    Change Password
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'inventory' && <StockInventory />}
            {activeTab === 'stock-in' && isAdmin && <StockInPage />}
            {activeTab === 'stock-out' && isAdmin && <StockOutPage />}
            {activeTab === 'suppliers' && isAdmin && <SupplierManagement />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'requests' && <RequestsPage />}
            {activeTab === 'approvals' && isAdmin && <ApprovalsPage />}
            {activeTab === 'generate-reports' && isAdmin && <ReportsGenerator />}
            {activeTab === 'change-password' && isSuperAdmin && <ChangePassword />}
            {activeTab === 'super-admin' && isSuperAdmin && <SuperAdminPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
