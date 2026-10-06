import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { TrendingUp, ArrowUpRight, ArrowDownRight, PlusCircle, Loader2, X, Printer, FileText } from 'lucide-react';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState({
    summary: { total_income: 0, total_expense: 0, net_profit: 0 },
    records: []
  });
  const [emiLoans, setEmiLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'EXPENSE',
    category: 'Office Expense',
    amount: '',
    description: ''
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('reports/profit-loss');
      if (res.success) setReport(res.data);

      const emiRes = await api.get('reports/emi-status');
      if (emiRes.success) setEmiLoans(emiRes.data.loans || []);
    } catch (err) {
      console.error('Error fetching financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('reports/entry', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          type: 'EXPENSE',
          category: 'Office Expense',
          amount: '',
          description: ''
        });
        fetchReport();
      }
    } catch (err) {
      console.error('Error creating financial record:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const { total_income = 0, total_expense = 0, net_profit = 0 } = report.summary || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="teal-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-teal-600">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Financial Accounting & Profit / Loss Statement</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Application financial status, disbursed capital, expected interest profit, and net bottom line P/L ledger.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-teal inline-flex items-center space-x-2 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Record Income / Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="teal-card p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenues (Income)</span>
            <div className="p-1.5 rounded-lg text-teal-700 bg-teal-50 border border-teal-200">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">₹{Math.ceil(parseFloat(total_income || 0)).toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Collected from EMI interest, fees & penalty charges</p>
        </div>

        <div className="teal-card p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</span>
            <div className="p-1.5 rounded-lg text-rose-600 bg-rose-50 border border-rose-100">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">₹{Math.ceil(parseFloat(total_expense || 0)).toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Salaries, office rent & operational overheads</p>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 shadow-lg relative overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Net Profit / Loss</span>
            <div className="p-1.5 rounded-lg text-teal-400 bg-teal-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-black mt-2 ${net_profit >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            ₹{Math.ceil(parseFloat(net_profit || 0)).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Net operational bottom line balance</p>
        </div>
      </div>

      {/* 10-Column Financial Accounting Table */}
      <div className="teal-card overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Application Profit & Loss Accounting Table</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Disbursed principal, expected profit, collections, and net P/L breakdown per loan.</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-950 cursor-pointer">
            <Printer className="h-3.5 w-3.5" />
            <span>Print P/L</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-7 w-7 text-teal-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Calculating Profit & Loss Statement...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Application No.</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Application Status</th>
                  <th className="py-2.5 px-3">Finance Status</th>
                  <th className="py-2.5 px-3">Disbursed</th>
                  <th className="py-2.5 px-3">Received</th>
                  <th className="py-2.5 px-3">Expected Profit</th>
                  <th className="py-2.5 px-3">Outstanding</th>
                  <th className="py-2.5 px-3">Net P/L</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {emiLoans.length > 0 ? (
                  emiLoans.map((l) => {
                    const disbursed = Math.ceil(parseFloat(l.loan_amount || 0));
                    const received = Math.ceil(parseFloat(l.actual_received || 0));
                    const expectedProfit = Math.ceil(parseFloat(l.interest_amount || 0));
                    const outstanding = Math.ceil(parseFloat(l.actual_outstanding ?? Math.max(0, parseFloat(l.total_payment || 0) - received)));
                    const netPl = received - disbursed;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50 dark:bg-slate-950/50 transition-colors">
                        <td className="py-2 px-3 font-mono">
                          <div className="font-bold text-teal-600 dark:text-teal-400">{l.agreement_no || l.loan_no}</div>
                          {l.customer_id && <div className="text-[10px] text-slate-400">CID: {l.customer_id}</div>}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white uppercase">{l.customer_name}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'Active' || l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            l.status === 'Closed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {l.status === 'Pending' ? 'In Review' : 'Approved'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">{l.status || 'Active'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">₹{disbursed.toLocaleString()}</td>
                        <td className="py-2 px-3 font-extrabold text-emerald-700 dark:text-emerald-400">₹{received.toLocaleString()}</td>
                        <td className="py-2 px-3 font-bold text-teal-700 dark:text-teal-300">₹{expectedProfit.toLocaleString()}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">₹{outstanding.toLocaleString()}</td>
                        <td className={`py-2 px-3 font-extrabold ${netPl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {netPl >= 0 ? '+' : ''}₹{netPl.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button 
                            onClick={() => navigate(`/emi-report?loan_id=${l.id}`)} 
                            className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-700 transition-colors cursor-pointer"
                          >
                            Statement
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-400">
                      No loan P/L accounting records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white">
              <h3 className="font-bold text-base">Record Income / Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${formData.type === 'INCOME' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}
                  >
                    INCOME (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                    className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${formData.type === 'EXPENSE' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}
                  >
                    EXPENSE (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Processing Fee / Office Salary"
                  className="w-full light-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="10000"
                  className="w-full light-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full light-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Transaction notes..."
                  className="w-full light-input h-auto py-1.5"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-teal flex items-center space-x-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Ledger Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
