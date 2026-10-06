import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
 TrendingUp, 
 DollarSign, 
 ArrowUpRight, 
 ArrowDownRight, 
 Loader2, 
 Calendar, 
 PieChart, 
 CheckCircle2, 
 Receipt,
 FileSpreadsheet,
 Search,
 Printer,
 Shield,
 FileCheck
} from 'lucide-react';

export default function TotalProfitLossPage() {
 const [data, setData] = useState({
 loan_count: 0,
 metrics: {
 total_receivable: 0,
 total_disbursed: 0,
 interest_and_charges: 0,
 total_received: 0,
 total_pending: 0,
 total_interest: 0,
 doc_fee: 0,
 service_charge: 0,
 penalty_scheduled: 0,
 penalty_received: 0,
 cbc_received: 0,
 total_fees: 0
 }
 });
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');

 const fetchTotalPl = async () => {
 setLoading(true);
 try {
 const res = await api.get('reports/total-profit-loss');
 if (res.success) {
 setData(res.data);
 }
 } catch (err) {
 console.error('Error fetching Total P&L Executive Statement:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchTotalPl();
 }, []);

 const { metrics, loan_count } = data;

 const recoveryRows = [
 {
 meaning: 'Total loan disbursed',
 amount: metrics.total_disbursed,
 explanation: 'Total loan amount issued to clients.'
 },
 {
 meaning: 'Total amount received so far',
 amount: metrics.total_received,
 explanation: 'Total payments collected so far.'
 },
 {
 meaning: 'Amount pending to receive',
 amount: metrics.total_pending,
 explanation: 'Pending recovery from the expected receivable amount.'
 },
 {
 meaning: 'Total interest receivable',
 amount: metrics.total_interest,
 explanation: 'Calculated interest across all selected loans.'
 },
 {
 meaning: 'Documentation fee receivable',
 amount: metrics.doc_fee,
 explanation: 'Total documentation or processing fee.'
 },
 {
 meaning: 'Service charge receivable',
 amount: metrics.service_charge,
 explanation: 'Total service charge amount.'
 },
 {
 meaning: 'Scheduled penalty charge',
 amount: metrics.penalty_scheduled,
 explanation: 'Penalty charge added in loan financials.'
 },
 {
 meaning: 'Penalty already received',
 amount: metrics.penalty_received,
 explanation: 'Penalty collected through EMI payments.'
 },
 {
 meaning: 'CBC and other charges received',
 amount: metrics.cbc_received,
 explanation: 'CBC and other charges collected through payment receipts.'
 },
 {
 meaning: 'Total fees and charges',
 amount: metrics.total_fees,
 explanation: 'Combined documentation fee, service charge, penalty, CBC and other charges.'
 },
 {
 meaning: 'Total expected receivable',
 amount: metrics.total_receivable,
 explanation: 'Total amount expected from loan amount, interest, fees and charges.',
 highlight: true
 }
 ];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="navy-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Total Profit & Loss Executive Statement</h1>
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
              {loan_count} loans
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Total Profit & Loss Summary, total expected receivables, disbursed capital, and fee breakdowns.</p>
        </div>

        <button onClick={() => window.print()} className="print:hidden navy-btn cursor-pointer whitespace-nowrap">
          <Printer className="h-4 w-4 text-emerald-400" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Search & Date Filter Bar */}
      <div className="print:hidden navy-card p-3 sm:p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search application no, name, mobile, receipt no, mode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full navy-input pl-10"
          />
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-[8px] border border-slate-300 h-[36px]">
          <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ml-1" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
          />
          <span className="text-xs text-slate-400 font-bold">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 gap-3">
        <div className="bg-slate-950 text-white rounded-xl p-3.5 shadow-md border border-slate-800">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Total Expected Receivable</span>
          <h3 className="text-xl font-black text-white mt-1">Rs. {Math.ceil(metrics.total_receivable || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Total loan plus interest & charges.</p>
        </div>

        <div className="navy-card p-3.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Loan Given</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">Rs. {Math.ceil(metrics.total_disbursed || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Principal amount issued to customers</p>
        </div>

        <div className="navy-card p-3.5">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Interest + Charges</span>
          <h3 className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-1">Rs. {Math.ceil(metrics.interest_and_charges || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Interest, fees and charges</p>
        </div>

        <div className="navy-card p-3.5">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Amount Received</span>
          <h3 className="text-xl font-black text-emerald-600 mt-1">Rs. {Math.ceil(metrics.total_received || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Total payment collected so far</p>
        </div>

        <div className="navy-card p-3.5">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Amount Pending</span>
          <h3 className="text-xl font-black text-teal-600 mt-1">Rs. {Math.ceil(metrics.total_pending || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Amount still pending</p>
        </div>
      </div>

      {/* Total Loan Recovery Summary Table */}
      <div className="navy-card overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Total Loan Recovery Summary</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Simple view of loan given, recovery, pending amount, interest and charges.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-7 w-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Generating Executive Recovery Audit...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3.5">What this means</th>
                  <th className="py-2.5 px-3.5">Amount</th>
                  <th className="py-2.5 px-3.5">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recoveryRows.map((row) => (
                  <tr
                    key={row.meaning}
                    className={`transition-colors ${row.highlight ? 'bg-indigo-900 text-white font-bold' : 'hover:bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white'}`}
                  >
                    <td className={`py-2.5 px-3.5 font-semibold ${row.highlight ? 'text-white font-extrabold text-sm' : 'text-slate-900 dark:text-white'}`}>
                      {row.meaning}
                    </td>
                    <td className={`py-2.5 px-3.5 font-extrabold font-mono text-sm whitespace-nowrap ${row.highlight ? 'text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      Rs. {Math.ceil(parseFloat(row.amount || 0)).toLocaleString()}
                    </td>
                    <td className={`py-2.5 px-3.5 text-xs ${row.highlight ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                      {row.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
