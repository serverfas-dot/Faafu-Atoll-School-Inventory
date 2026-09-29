import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, PenTool, Upload } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

type ReportType = 'daily' | 'monthly' | 'yearly';

type ReportRequest = {
  id: string;
  requested_at: string;
  requester_name: string;
  section: string;
  item_description: string;
  item_code: string;
  quantity: number;
  unit: string;
  purpose: string;
  status: string;
  approved_at: string | null;
  approver_name: string | null;
  requester_signature: string | null;
  approver_signature: string | null;
  authorized_signature: string | null;
};

type AuthorizedRequester = {
  id: string;
  name: string;
};

export function ReportsGenerator() {
  const authorizedFileInputRef = useRef<HTMLInputElement>(null);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [authorizedRequesters, setAuthorizedRequesters] = useState<AuthorizedRequester[]>([]);
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [authorizedSignature, setAuthorizedSignature] = useState<string>('');
  const [showAuthorizedSignaturePad, setShowAuthorizedSignaturePad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Load authorized requesters
  useEffect(() => {
    loadAuthorizedRequesters();
    loadLogo();
  }, []);

  // Load signature when authorized person changes
  useEffect(() => {
    if (authorizedBy) {
      loadSignature(authorizedBy, setAuthorizedSignature);
    }
  }, [authorizedBy]);

  async function loadLogo() {
    try {
      const response = await fetch('/png.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  async function loadAuthorizedRequesters() {
    const { data, error } = await supabase
      .from('authorized_requesters')
      .select('*')
      .order('name');

    if (!error && data && data.length > 0) {
      setAuthorizedRequesters(data);
      setAuthorizedBy(data[0].name);
    }
  }

  async function loadSignature(personName: string, setSig: (sig: string) => void) {
    const { data, error } = await supabase
      .from('signatures')
      .select('signature_data')
      .eq('person_name', personName)
      .maybeSingle();

    if (!error && data) {
      setSig(data.signature_data);
    } else {
      setSig('');
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

  async function handleSaveAuthorizedSignature(sig: string) {
    setAuthorizedSignature(sig);
    setShowAuthorizedSignaturePad(false);
    await saveSignature(authorizedBy, sig);
  }

  async function handleAuthorizedFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setAuthorizedSignature(result);
      await saveSignature(authorizedBy, result);
    };
    reader.readAsDataURL(file);
  }

  async function generateReport() {
    if (!authorizedSignature) {
      alert('Please add authorized signature before generating the report');
      return;
    }

    setLoading(true);

    let startDate: string;
    let endDate: string;

    if (reportType === 'daily') {
      startDate = `${selectedDate}T00:00:00`;
      endDate = `${selectedDate}T23:59:59`;
    } else if (reportType === 'monthly') {
      startDate = `${selectedMonth}-01T00:00:00`;
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = parseInt(selectedMonth.split('-')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}T23:59:59`;
    } else {
      startDate = `${selectedYear}-01-01T00:00:00`;
      endDate = `${selectedYear}-12-31T23:59:59`;
    }

    const { data: requests, error } = await supabase
      .from('stock_requests')
      .select('*, items(item_code, item_description, unit)')
      .gte('requested_at', startDate)
      .lte('requested_at', endDate)
      .order('requested_at', { ascending: true });

    if (error) {
      alert('Error fetching data');
      setLoading(false);
      return;
    }

    if (!requests || requests.length === 0) {
      alert('No requests found for the selected period');
      setLoading(false);
      return;
    }

    await Promise.all(
      requests.map((req) =>
        supabase
          .from('stock_requests')
          .update({
            authorized_signature: authorizedSignature
          })
          .eq('id', req.id)
      )
    );

    const reportData: ReportRequest[] = requests.map((req) => ({
      id: req.id,
      requested_at: req.requested_at,
      requester_name: req.requester_name || 'N/A',
      section: req.section,
      item_description: req.items.item_description,
      item_code: req.items.item_code,
      quantity: req.quantity,
      unit: req.items.unit,
      purpose: req.purpose,
      status: req.status,
      approved_at: req.approved_at,
      approver_name: req.approver_name,
      requester_signature: req.requester_signature,
      approver_signature: req.approver_signature,
      authorized_signature: authorizedSignature,
    }));

    generatePrintableReport(reportData, reportType, startDate, endDate, authorizedBy, logoBase64);
    setLoading(false);
  }

  function generatePrintableReport(
    data: ReportRequest[],
    type: ReportType,
    startDate: string,
    endDate: string,
    authorizedBy: string,
    logoData: string
  ) {
    const title =
      type === 'daily'
        ? `Daily Stock Request Report - ${new Date(startDate).toLocaleDateString()}`
        : type === 'monthly'
        ? `Monthly Stock Request Report - ${new Date(startDate).toLocaleDateString('default', {
            month: 'long',
            year: 'numeric',
          })}`
        : `Yearly Stock Request Report - ${new Date(startDate).getFullYear()}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              @page { size: A4; margin: 15mm; }
              body { margin: 0; }
              .no-print { display: none; }
              .page-break { page-break-after: always; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .request-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              background: #fff;
              break-inside: avoid;
            }
            .request-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .request-number {
              font-weight: bold;
              font-size: 14px;
              color: #333;
            }
            .status {
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status.approved { background: #d4edda; color: #155724; }
            .status.rejected { background: #f8d7da; color: #721c24; }
            .status.pending { background: #fff3cd; color: #856404; }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .detail-item {
              font-size: 13px;
            }
            .detail-label {
              font-weight: 600;
              color: #555;
              display: block;
              margin-bottom: 3px;
            }
            .detail-value {
              color: #333;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .signature-box {
              text-align: center;
              display: flex;
              flex-direction: column;
            }
            .signature-content {
              min-height: 60px;
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
              align-items: center;
            }
            .signature-name {
              font-weight: 600;
              font-size: 13px;
              margin-bottom: 5px;
            }
            .signature-image {
              max-height: 50px;
              max-width: 150px;
              margin: 5px 0;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin: 0 20px;
              height: 60px;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
              margin-top: 10px;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 12px 24px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .print-button:hover {
              background: #0056b3;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">Print Report</button>

          <div class="header">
            ${logoData ? `<img src="${logoData}" alt="FAFU Atoll School Logo" style="width: 100px; height: 100px; margin: 0 auto 15px; display: block;" />` : ''}
            <h1>${title}</h1>
            <p>FAFU Atoll School - Inventory Management System</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
            <p>Total Requests: ${data.length}</p>
          </div>

          ${data
            .map(
              (request, index) => `
            <div class="request-card">
              <div class="request-header">
                <span class="request-number">Request #${index + 1}</span>
                <span class="status ${request.status}">${request.status}</span>
              </div>

              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Date Requested:</span>
                  <span class="detail-value">${new Date(request.requested_at).toLocaleDateString()} ${new Date(
                request.requested_at
              ).toLocaleTimeString()}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Item Code:</span>
                  <span class="detail-value">${request.item_code}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Item Description:</span>
                  <span class="detail-value">${request.item_description}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Quantity:</span>
                  <span class="detail-value">${request.quantity} ${request.unit}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Section:</span>
                  <span class="detail-value">${request.section}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Purpose:</span>
                  <span class="detail-value">${request.purpose}</span>
                </div>
              </div>

              <div class="signatures">
                <div class="signature-box">
                  <div class="signature-content">
                    <div class="signature-name">${request.requester_name}</div>
                    ${
                      request.requester_signature
                        ? `<img src="${request.requester_signature}" alt="Signature" class="signature-image" />`
                        : '<div style="height: 50px; display: flex; align-items: center; color: #999;">No signature</div>'
                    }
                  </div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Requested By (Signature)</div>
                </div>
                <div class="signature-box">
                  <div class="signature-content">
                    <div class="signature-name">${
                    request.status !== 'pending' ? request.approver_name : '___________________'
                  }</div>
                    ${
                      request.status !== 'pending' && request.approver_signature
                        ? `<img src="${request.approver_signature}" alt="Signature" class="signature-image" />`
                        : request.status !== 'pending'
                        ? '<div style="height: 50px; display: flex; align-items: center; color: #999;">No signature</div>'
                        : ''
                    }
                  </div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Approved By (Signature)</div>
                  ${
                    request.approved_at
                      ? `<div class="signature-label" style="margin-top: 3px;">Date: ${new Date(
                          request.approved_at
                        ).toLocaleDateString()}</div>`
                      : ''
                  }
                </div>
                <div class="signature-box">
                  <div class="signature-content">
                    <div class="signature-name">${authorizedBy}</div>
                    ${
                      request.authorized_signature
                        ? `<img src="${request.authorized_signature}" alt="Signature" class="signature-image" />`
                        : '<div style="height: 50px; display: flex; align-items: center; color: #999;">No signature</div>'
                    }
                  </div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Authorized By (Signature)</div>
                </div>
              </div>
            </div>
          `
            )
            .join('')}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Generate Reports</h2>
        <p className="text-sm text-slate-600 mt-1">
          Generate stock request reports with signatures
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Authorized By</label>
            <select
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={authorizedRequesters.length === 0}
            >
              {authorizedRequesters.length === 0 ? (
                <option value="">No authorized requesters available</option>
              ) : (
                authorizedRequesters.map((requester) => (
                  <option key={requester.id} value={requester.name}>
                    {requester.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Authorized Signature *</label>
            {authorizedSignature ? (
              <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
                <img src={authorizedSignature} alt="Signature" className="h-20 mx-auto" />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAuthorizedSignaturePad(true)}
                    className="flex-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                  >
                    Draw New
                  </button>
                  <button
                    type="button"
                    onClick={() => authorizedFileInputRef.current?.click()}
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
                  onClick={() => setShowAuthorizedSignaturePad(true)}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                >
                  <PenTool className="w-6 h-6" />
                  <span className="text-sm font-medium">Draw Signature</span>
                </button>
                <button
                  type="button"
                  onClick={() => authorizedFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-slate-600 hover:text-blue-600"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">Upload Image</span>
                </button>
              </div>
            )}
            <input
              ref={authorizedFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAuthorizedFileUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setReportType('daily')}
                className={`flex-1 px-4 py-2 rounded-lg border transition ${
                  reportType === 'daily'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`flex-1 px-4 py-2 rounded-lg border transition ${
                  reportType === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setReportType('yearly')}
                className={`flex-1 px-4 py-2 rounded-lg border transition ${
                  reportType === 'yearly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          {reportType === 'yearly' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2000"
                max="2100"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Report Features:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Includes all request details and status</li>
              <li>• Shows requester signature on each request</li>
              <li>• Shows approver signature from approvals</li>
              <li>• Shows authorized signature (auto-filled from selected person)</li>
              <li>• Print-ready format</li>
            </ul>
          </div>
        </div>
      </div>

      {showAuthorizedSignaturePad && (
        <SignaturePad
          onSave={handleSaveAuthorizedSignature}
          onCancel={() => setShowAuthorizedSignaturePad(false)}
          initialSignature={authorizedSignature}
        />
      )}
    </div>
  );
}
