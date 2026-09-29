import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText } from 'lucide-react';

type StockBalanceReport = {
  item_code: string;
  item_description: string;
  unit: string;
  total_in: number;
  total_out: number;
  balance: number;
};

export function ReportsPage() {
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<StockBalanceReport[]>([]);
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);

    let startDate: string;
    let endDate: string;

    if (reportType === 'monthly') {
      startDate = `${month}-01`;
      const date = new Date(month);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, item_code, item_description, unit')
      .order('item_code');

    if (itemsError || !items) {
      setLoading(false);
      return;
    }

    const reportResults: StockBalanceReport[] = [];

    for (const item of items) {
      const { data: stockInData } = await supabase
        .from('stock_in')
        .select('quantity')
        .eq('item_id', item.id)
        .gte('date', startDate)
        .lte('date', endDate);

      const { data: stockOutData } = await supabase
        .from('stock_out')
        .select('quantity')
        .eq('item_id', item.id)
        .gte('date', startDate)
        .lte('date', endDate);

      const totalIn = stockInData?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const totalOut = stockOutData?.reduce((sum, record) => sum + record.quantity, 0) || 0;

      reportResults.push({
        item_code: item.item_code,
        item_description: item.item_description,
        unit: item.unit,
        total_in: totalIn,
        total_out: totalOut,
        balance: totalIn - totalOut,
      });
    }

    setReportData(reportResults);
    setLoading(false);
  }

  function exportToCSV() {
    const headers = ['Item Code', 'Item Description', 'Unit', 'Stock In', 'Stock Out', 'Balance'];
    const rows = reportData.map((item) => [
      item.item_code,
      item.item_description,
      item.unit,
      item.total_in,
      item.total_out,
      item.balance,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-balance-report-${reportType === 'monthly' ? month : year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function printReport() {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const title =
      reportType === 'monthly'
        ? `Stock Balance Report - ${new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        : `Stock Balance Report - Year ${year}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1e293b; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #64748b; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; font-weight: 600; color: #334155; }
            tr:hover { background-color: #f8fafc; }
            .text-right { text-align: right; }
            .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Faafu Atoll School</h1>
          <div class="subtitle">${title}</div>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Description</th>
                <th>Unit</th>
                <th class="text-right">Stock In</th>
                <th class="text-right">Stock Out</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${reportData
                .map(
                  (item) => `
                <tr>
                  <td>${item.item_code}</td>
                  <td>${item.item_description}</td>
                  <td>${item.unit}</td>
                  <td class="text-right">${item.total_in}</td>
                  <td class="text-right">${item.total_out}</td>
                  <td class="text-right">${item.balance}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Stock Balance Reports</h2>
        <p className="text-sm text-slate-600 mt-1">Generate monthly or yearly inventory reports</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'monthly' | 'yearly')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Yearly Report</option>
            </select>
          </div>

          {reportType === 'monthly' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="2000"
                max="2100"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={printReport}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition"
            >
              <FileText className="w-4 h-4" />
              Print Report
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Unit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock In</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock Out</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {reportData.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-800">{item.item_code}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{item.item_description}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{item.unit}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                        +{item.total_in}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                        -{item.total_out}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-medium ${
                          item.balance > 0
                            ? 'bg-blue-100 text-blue-700'
                            : item.balance === 0
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.balance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
