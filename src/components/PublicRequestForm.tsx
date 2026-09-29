import { useState, useEffect, useRef } from 'react';
import { supabase, Item } from '../lib/supabase';
import { FileText, CheckCircle, ChevronDown, X, MoreVertical, Shield, ArrowLeft } from 'lucide-react';

interface AuthorizedRequester {
  id: string;
  name: string;
  email: string | null;
  id_card_number: string | null;
  department: string | null;
}

interface RequestItem {
  item: Item;
  quantity: number;
}

type ViewMode = 'landing' | 'form';

const logoSrc = `${import.meta.env.BASE_URL}png.png`;

export function PublicRequestForm() {
  const [items, setItems] = useState<Item[]>([]);
  const [authorizedRequesters, setAuthorizedRequesters] = useState<AuthorizedRequester[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempQuantity, setTempQuantity] = useState('1');
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const emailDropdownRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const idCardDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    id_card_number: '',
    requester_name: '',
    requester_email: '',
    section: '',
  });
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [idCardLoading, setIdCardLoading] = useState(false);

  useEffect(() => {
    loadItems();
    loadAuthorizedRequesters();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(event.target as Node)) {
        setShowEmailDropdown(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (idCardDebounceRef.current) {
        clearTimeout(idCardDebounceRef.current);
      }
    };
  }, []);

  async function loadItems() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('item_code');

    if (error) {
      setDataError('Unable to load inventory data. Please check the hosted database connection.');
      return;
    }

    if (data) {
      setItems(data);
    }
  }

  async function loadAuthorizedRequesters() {
    const { data, error } = await supabase
      .from('authorized_requesters')
      .select('id, name, email, id_card_number, department')
      .order('name');

    if (error) {
      setDataError('Unable to load requester data. Please check the hosted database connection.');
      return;
    }

    if (data) {
      setAuthorizedRequesters(data);
    }
  }

  function handleIdCardChange(idCard: string) {
    setFormData(prev => ({ ...prev, id_card_number: idCard }));

    if (idCardDebounceRef.current) {
      clearTimeout(idCardDebounceRef.current);
    }

    if (idCard.trim().length === 0) {
      setFormData({
        id_card_number: '',
        requester_name: '',
        requester_email: '',
        section: '',
      });
      setSelectedEmail('');
      setIsAutoFilled(false);
      setIdCardLoading(false);
      return;
    }

    if (idCard.trim().length < 3) {
      setIsAutoFilled(false);
      setIdCardLoading(false);
      return;
    }

    setIdCardLoading(true);

    idCardDebounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('authorized_requesters')
        .select('name, email, department')
        .ilike('id_card_number', idCard.trim())
        .maybeSingle();

      setIdCardLoading(false);

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          id_card_number: idCard.toUpperCase(),
          requester_name: data.name || '',
          requester_email: data.email || '',
          section: data.department || '',
        }));
        setSelectedEmail(data.email || '');
        setIsAutoFilled(true);
      } else {
        setFormData(prev => ({
          ...prev,
          requester_name: '',
          requester_email: '',
          section: '',
        }));
        setSelectedEmail('');
        setIsAutoFilled(false);
      }
    }, 500);
  }

  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.item_code.toLowerCase().includes(search) ||
      item.item_description.toLowerCase().includes(search)
    );
  });

  const filteredEmails = authorizedRequesters.filter((req) => {
    if (!req.email) return false;
    const search = emailSearchTerm.toLowerCase();
    return (
      req.email.toLowerCase().includes(search) ||
      req.name.toLowerCase().includes(search)
    );
  });

  function handleItemSelect(item: Item) {
    const quantity = parseInt(tempQuantity) || 1;

    const existingIndex = requestItems.findIndex(ri => ri.item.id === item.id);
    if (existingIndex >= 0) {
      const updated = [...requestItems];
      updated[existingIndex].quantity += quantity;
      setRequestItems(updated);
    } else {
      setRequestItems([...requestItems, { item, quantity }]);
    }

    setSearchTerm('');
    setTempQuantity('1');
    setShowDropdown(false);
  }

  function removeItem(index: number) {
    setRequestItems(requestItems.filter((_, i) => i !== index));
  }

  function handleEmailSelect(requester: AuthorizedRequester) {
    setFormData({ ...formData, requester_email: requester.email! });
    setSelectedEmail(requester.email!);
    setEmailSearchTerm('');
    setShowEmailDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (requestItems.length === 0) {
      alert('Please add at least one item to your request');
      return;
    }

    if (!formData.requester_email) {
      alert('Please select your email from the dropdown');
      return;
    }

    setLoading(true);

    const batchId = crypto.randomUUID();

    const requests = requestItems.map(requestItem => ({
      item_id: requestItem.item.id,
      quantity: requestItem.quantity,
      section: formData.section,
      requester_name: formData.requester_name,
      requester_email: formData.requester_email,
      requested_by: null,
      purpose: '',
      batch_id: batchId,
    }));

    const { error } = await supabase.from('stock_requests').insert(requests);

    setLoading(false);

    if (error) {
      console.error('Submission error:', error);
      alert(`Error submitting request: ${error.message}`);
      return;
    }

    setSubmitted(true);
    setFormData({
      id_card_number: '',
      requester_name: '',
      requester_email: '',
      section: '',
    });
    setRequestItems([]);
    setSearchTerm('');
    setEmailSearchTerm('');
    setSelectedEmail('');
    setTempQuantity('1');
    setIsAutoFilled(false);

    setTimeout(() => {
      setSubmitted(false);
    }, 5000);
  }

  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="absolute top-4 right-4 z-50" ref={adminMenuRef}>
          <button
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition backdrop-blur-sm"
            title="Menu"
          >
            <MoreVertical className="w-6 h-6" />
          </button>

          {showAdminMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-slate-200 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  window.location.href = `${import.meta.env.BASE_URL}admin`;
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition text-sm font-medium text-slate-700 hover:text-blue-600"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            </div>
          )}
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-5xl">
            <div className="text-center mb-8 lg:mb-12">
              <div className="flex items-center justify-center mb-6">
                <img src={logoSrc} alt="Faafu Atoll School" className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-contain" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
                Faafu Atoll School
              </h1>
              <p className="text-lg sm:text-xl text-blue-200">
                Stock Inventory Management System
              </p>
            </div>

            <div className="grid md:grid-cols-1 gap-4 sm:gap-6 max-w-md mx-auto">
              <button
                onClick={() => setViewMode('form')}
                className="group bg-white hover:bg-blue-50 rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                    Submit Request
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600">
                    Request stock items and stationery
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-400 mb-6">
                Secure inventory management for Faafu Atoll School
              </p>

              <div className="inline-block rounded-xl p-4 text-center">
                <p className="text-xs text-slate-300 mb-3 font-medium">Scan to access on mobile</p>
                <div className="flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.origin)}`}
                    alt="QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <button
              onClick={() => setViewMode('landing')}
              className="flex items-center gap-1.5 sm:gap-2 text-slate-600 hover:text-blue-600 transition px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-blue-50"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Back</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logoSrc} alt="Faafu Atoll School" className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-full" />
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-slate-800">Faafu Atoll School</h1>
                <p className="text-xs text-slate-600 hidden sm:block">Stock Request System</p>
              </div>
            </div>

            <div className="relative" ref={adminMenuRef}>
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-slate-200 rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setShowAdminMenu(false);
                      window.location.href = `${import.meta.env.BASE_URL}admin`;
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition text-sm font-medium text-slate-700 hover:text-blue-600"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Portal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="text-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Request Stock Items</h2>
          <p className="text-xs sm:text-sm text-slate-600">Fill out the form to request items</p>
        </div>

        {dataError && (
          <div className="mb-3 bg-red-50 border-2 border-red-200 rounded-lg p-3 mx-1 sm:mx-0">
            <p className="text-sm font-semibold text-red-700">{dataError}</p>
            <p className="text-xs text-red-600 mt-1">The app is online, but it cannot reach the shared school records.</p>
          </div>
        )}

        {submitted && (
          <div className="mb-3 bg-green-50 border-2 border-green-200 rounded-lg p-3 mx-1 sm:mx-0">
            <div className="flex items-start gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Request submitted successfully!</p>
                <p className="text-xs mt-0.5">Your request will be reviewed by the admin staff.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 sm:p-6 mx-1 sm:mx-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                ID Card Number <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.id_card_number}
                onChange={(e) => handleIdCardChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your ID card number"
              />
              {idCardLoading && (
                <p className="text-xs text-blue-600 mt-1">Searching...</p>
              )}
              {isAutoFilled && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Information loaded successfully
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                readOnly={isAutoFilled}
                className={`w-full px-3 py-2.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  isAutoFilled ? 'bg-slate-100 border-slate-300 cursor-not-allowed' : 'border-slate-300'
                }`}
                placeholder="Enter your name"
              />
            </div>

            <div className="relative" ref={emailDropdownRef}>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Your Email <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={selectedEmail || emailSearchTerm}
                  onChange={(e) => {
                    if (!isAutoFilled) {
                      setEmailSearchTerm(e.target.value);
                      setSelectedEmail('');
                      setFormData({ ...formData, requester_email: '' });
                      setShowEmailDropdown(true);
                    }
                  }}
                  onFocus={() => !isAutoFilled && setShowEmailDropdown(true)}
                  readOnly={isAutoFilled}
                  className={`w-full px-3 py-2.5 pr-9 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                    isAutoFilled ? 'bg-slate-100 border-slate-300 cursor-not-allowed' : 'border-slate-300'
                  }`}
                  placeholder="Search for your email..."
                />
                {!isAutoFilled && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
              </div>

              {showEmailDropdown && !isAutoFilled && (
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredEmails.length > 0 ? (
                    filteredEmails.map((requester, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmailSelect(requester)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-b-0 transition"
                      >
                        <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                          {requester.email}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {requester.name}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-slate-500 text-center text-xs">
                      No email found. Please contact admin to add your email.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Section/Department <span className="text-red-600">*</span>
              </label>
              {isAutoFilled ? (
                <input
                  type="text"
                  required
                  value={formData.section}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border-2 bg-slate-100 border-slate-300 rounded-lg cursor-not-allowed outline-none"
                />
              ) : (
                <select
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="">Select department</option>
                  <option value="Admin">Admin</option>
                  <option value="Academic">Academic</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                Add Items <span className="text-red-600">*</span>
              </label>

              <div className="relative" ref={dropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full px-3 py-2.5 pr-9 text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="Search for an item..."
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(e.target.value)}
                    className="w-16 px-2 py-2.5 text-sm border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-center"
                    placeholder="Qty"
                  />
                </div>

                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemSelect(item)}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-b-0 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                                {item.item_code}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                {item.item_description}
                              </div>
                            </div>
                            <span className="flex-shrink-0 inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium text-xs">
                              {item.stock_on_hand} {item.unit}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-slate-500 text-center text-xs">
                        {searchTerm ? 'No items found matching your search' : 'No items available'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {requestItems.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">Selected Items ({requestItems.length}):</p>
                  {requestItems.map((requestItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2.5 hover:bg-blue-100 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-xs">
                          {requestItem.item.item_code} - {requestItem.item.item_description}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Qty: <span className="font-semibold">{requestItem.quantity}</span> {requestItem.item.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="ml-2 p-1.5 text-red-600 hover:bg-red-100 rounded transition flex-shrink-0"
                        title="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || requestItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg text-sm shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : `Submit Request (${requestItems.length} item${requestItems.length !== 1 ? 's' : ''})`}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-3 px-4">
          Your request will be reviewed by the admin staff.
        </p>
      </div>
    </div>
  );
}
