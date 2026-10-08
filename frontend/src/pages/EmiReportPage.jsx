import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
 FileText, 
 Search, 
 Loader2, 
 Printer, 
 X, 
 CheckCircle, 
 CheckCircle2,
 Clock, 
 DollarSign, 
 TrendingUp, 
 Shield, 
 ShieldCheck,
 User,
 Users,
 CreditCard,
 AlertCircle,
 FileCheck,
 MessageCircle,
 Calendar,
 Receipt,
 ArrowRight
} from 'lucide-react';
import ActionDropdown from '../components/ActionDropdown';

export default function EmiReportPage() {
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const targetLoanId = searchParams.get('loan_id');
 const { settings } = useSettings();
 const [data, setData] = useState({
 kpis: { emi_received: 0, total_emi_count: 0, total_amount_received: 0, total_emi_pending: 0, due_emi_amount: 0 },
 loans: []
 });
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [showSoaModal, setShowSoaModal] = useState(false);
 const [selectedLoan, setSelectedLoan] = useState(null);
 const [soaStatement, setSoaStatement] = useState([]);
 const [soaLoading, setSoaLoading] = useState(false);

 const fetchEmiReport = async () => {
 setLoading(true);
 try {
 const res = await api.get('reports/emi-status');
 if (res.success) {
 setData(res.data);
 }
 } catch (err) {
 console.error('Error fetching EMI Report data:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchEmiReport();
 }, []);

 useEffect(() => {
 if (targetLoanId && data.loans && data.loans.length > 0) {
 const match = data.loans.find((l) => String(l.id) === String(targetLoanId));
 if (match) {
 openSoaModal(match);
 }
 }
 }, [targetLoanId, data.loans]);

 const openSoaModal = async (loan) => {
 setSelectedLoan(loan);
 setShowSoaModal(true);
 setSoaLoading(true);
 try {
 const res = await api.get(`emis/statement?loan_id=${loan.id}`);
 if (res.success) {
   setSoaStatement(res.data.statement || []);
   if (res.data?.loan) {
     setSelectedLoan((prev) => ({ ...(prev || {}), ...res.data.loan }));
   }
 }
 } catch (err) {
 console.error('Error fetching SOA statement:', err);
 } finally {
 setSoaLoading(false);
 }
 };

  const formatDocDate = (d) => {
    if (!d) return 'N/A';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(d);
    }
  };

  const getLoanMilestones = (loan) => {
    if (!loan) return { leadDate: null, applicationDate: null, approvalDate: null, disbursalDate: null };
    const leadDate = loan.lead_date || loan.created_at || null;
    const applicationDate = loan.application_date || loan.created_at || null;
    const approvalDate = loan.approval_date || (loan.status === 'Approved' || loan.status === 'Active' || loan.status === 'Closed' ? (loan.updated_at || loan.created_at) : null);
    const disbursalDate = loan.disbursement_date || (loan.status === 'Active' || loan.status === 'Closed' ? loan.disbursement_date : null);
    return { leadDate, applicationDate, approvalDate, disbursalDate };
  };

  const renderLifecycleMilestoneStrip = (loan, currentStage = 'soa') => {
    if (!loan) return null;
    const milestones = getLoanMilestones(loan);
    const stages = [
      { key: 'lead', title: '1. Lead Origination', date: milestones.leadDate, desc: 'Inquiry / Lead Registered', done: !!milestones.leadDate },
      { key: 'application', title: '2. Application Filed', date: milestones.applicationDate, desc: 'Dossier Filed', done: !!milestones.applicationDate },
      { key: 'approval', title: '3. Sanction Approved', date: milestones.approvalDate, desc: 'Credit Sanction Granted', done: !!milestones.approvalDate },
      { key: 'disbursal', title: '4. Funds Disbursed', date: milestones.disbursalDate, desc: 'Value Credited to A/C', done: !!milestones.disbursalDate }
    ];

    return (
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2 print:border-slate-300 print:bg-white print:p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-blue-900 dark:text-blue-200 print:text-black tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-blue-600 print:text-black" />
            <span>Loan Lifecycle & Compliance Milestones</span>
          </div>
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 print:text-black bg-white dark:bg-blue-900/40 print:bg-slate-100 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            Audit Trail
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stages.map((st) => (
            <div key={st.key} className={`rounded-lg p-2 border ${st.done ? 'bg-white dark:bg-slate-900/90 border-blue-200 dark:border-blue-800/80 shadow-xs' : 'bg-slate-50/60 dark:bg-slate-950/40 border-dashed border-slate-200 dark:border-slate-800'} print:bg-white print:border-slate-300`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300 print:text-black">{st.title}</span>
                <span className={`w-2 h-2 rounded-full ${st.done ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </div>
              <div className="font-extrabold text-[11px] text-slate-900 dark:text-white print:text-black">
                {st.date ? formatDocDate(st.date) : 'Pending Stage'}
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                {st.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleWhatsAppSoaShare = (loan) => {
    if (!loan) return;
    const rawPhone = loan.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const instName = settings?.institution_name || 'Microfinance Institution';
    const m = getLoanMilestones(loan);
    const lines = [
      `*${instName.toUpperCase()}*`,
      `*LOAN STATEMENT OF ACCOUNT (SOA)*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Borrower:* ${loan.customer_name}`,
      loan.father_husband_name ? `👨 *S/o, W/o:* ${loan.father_husband_name}` : null,
      loan.co_applicant_name ? `🤝 *Co-Applicant:* ${loan.co_applicant_name} (${loan.co_applicant_phone || 'N/A'})` : null,
      loan.guarantor_name ? `🛡️ *Guarantor:* ${loan.guarantor_name} (${loan.guarantor_phone || 'N/A'})` : null,
      `📋 *Agreement No:* ${loan.agreement_no || loan.loan_no}`,
      loan.customer_id ? `🆔 *Customer ID:* ${loan.customer_id}` : null,
      `💰 *Sanctioned Principal:* Rs. ${parseFloat(loan.loan_amount || 0).toLocaleString()}`,
      `💳 *Monthly EMI:* Rs. ${parseFloat(loan.emi_amount || 0).toLocaleString()}`,
      `💵 *Total Amount Paid:* Rs. ${parseFloat(loan.amount_paid || loan.actual_received || 0).toLocaleString()}`,
      `⚠️ *Remaining Balance:* Rs. ${parseFloat(loan.remaining_balance || 0).toLocaleString()}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `*LIFECYCLE MILESTONES:*`,
      m.leadDate ? `📅 Lead Date: ${formatDocDate(m.leadDate)}` : null,
      m.applicationDate ? `📝 Application Date: ${formatDocDate(m.applicationDate)}` : null,
      m.approvalDate ? `✅ Approval Date: ${formatDocDate(m.approvalDate)}` : null,
      m.disbursalDate ? `💰 Disbursal Date: ${formatDocDate(m.disbursalDate)}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Official Statement from ${instName}._`
    ].filter(Boolean);
    const message = lines.join('\n');
    const url = cleanPhone 
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

 const filteredLoans = (data?.loans || []).filter((l) => {
   if (!l) return false;
   const q = (search || '').toLowerCase().trim();
   if (!q) return true;
   return (
     String(l.loan_no || '').toLowerCase().includes(q) ||
     String(l.agreement_no || '').toLowerCase().includes(q) ||
     String(l.customer_id || '').toLowerCase().includes(q) ||
     String(l.customer_name || '').toLowerCase().includes(q) ||
     String(l.phone || '').toLowerCase().includes(q)
   );
 });

 const { emi_received, total_emi_count, total_amount_received, total_emi_pending, due_emi_amount } = data.kpis;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="teal-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-teal-600">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">EMI Management & Statement of Accounts (SOA)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Live repayment audit, SOA ledger vouchers, WhatsApp share & printable customer statements.</p>
        </div>

        <button onClick={() => window.print()} className="print:hidden btn-teal inline-flex items-center space-x-1.5 cursor-pointer whitespace-nowrap">
          <Printer className="h-4 w-4" />
          <span>Print All Accounts</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="teal-card p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">EMIs Received</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {emi_received || 0} <span className="text-xs font-semibold text-slate-400">/ {total_emi_count || 0}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Successful installments</p>
        </div>

        <div className="teal-card p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collected Amount</span>
            <div className="p-1 rounded-md bg-teal-50 text-teal-600">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-emerald-600 mt-1">
            ₹{Math.ceil(parseFloat(total_amount_received || 0)).toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Total collected so far</p>
        </div>

        <div className="teal-card p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending EMIs</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-amber-600 mt-1">
            {total_emi_pending || 0}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Remaining installments</p>
        </div>

        <div className="teal-card p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Amount</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-rose-600 mt-1">
            ₹{Math.ceil(parseFloat(due_emi_amount || 0)).toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Total overdue/due</p>
        </div>

        <div className="teal-card p-3 sm:p-3.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Accounts</span>
            <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <FileCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {data.loans.length}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Active loans audited</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="teal-card p-3 sm:p-3.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agreement no, CID, borrower name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full light-input pl-10"
          />
        </div>
      </div>

      {/* 12-Column SOA Table */}
      <div className="teal-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-2" />
            <p className="text-xs font-bold">Loading SOA Repayment Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Agreement / CID</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Principal</th>
                  <th className="py-2.5 px-3">Monthly EMI</th>
                  <th className="py-2.5 px-3">EMIs Paid</th>
                  <th className="py-2.5 px-3">Paid Amount</th>
                  <th className="py-2.5 px-3">Remaining</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Next Due</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredLoans.length > 0 ? (
                  filteredLoans.map((l, index) => {
                    const principal = Math.ceil(parseFloat(l.loan_amount || 0));
                    const emiAmt = Math.ceil(parseFloat(l.emi_amount || 0));
                    const paid = Math.ceil(parseFloat(l.amount_paid || l.actual_received || 0));
                    const remaining = Math.ceil(parseFloat(l.remaining_balance ?? Math.max(0, parseFloat(l.total_payment || 0) - paid)));

                    return (
                      <tr key={l.id} className="hover:bg-teal-50/50 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-bold">{index + 1}</td>
                        <td className="py-2 px-3 font-mono">
                          <span className="font-bold text-teal-700 dark:text-teal-400">{l.agreement_no || l.loan_no}</span>
                          {l.customer_id && <span className="block text-[10px] text-slate-400">CID: {l.customer_id}</span>}
                        </td>
                        <td className="py-2 px-3 font-black text-slate-900 dark:text-white uppercase">{l.customer_name}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-semibold">{l.phone}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">₹{principal.toLocaleString()}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">₹{emiAmt.toLocaleString()}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {l.emi_received} / {l.tenure_months}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-emerald-700 dark:text-emerald-400">₹{paid.toLocaleString()}</td>
                        <td className="py-2 px-3 font-extrabold text-teal-700 dark:text-teal-300">₹{remaining.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            l.status === 'Closed'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : l.status === 'Overdue'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {l.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                          {l.next_due_date || '24 Sep 2026'}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <ActionDropdown
                            label="Actions"
                            menuWidth={230}
                            items={[
                              {
                                header: 'Account Ledger'
                              },
                              {
                                label: 'Statement of Account (SOA)',
                                subLabel: 'Printable statement ledger',
                                icon: FileText,
                                iconColor: 'text-teal-600 dark:text-teal-400',
                                onClick: () => openSoaModal(l)
                              },
                              {
                                label: 'WhatsApp SOA Summary',
                                subLabel: 'Send statement on WhatsApp',
                                icon: MessageCircle,
                                iconColor: 'text-emerald-600 dark:text-emerald-400',
                                onClick: () => handleWhatsAppSoaShare(l)
                              },
                              { divider: true },
                              {
                                header: 'Repayment & Loans'
                              },
                              {
                                label: 'Collect EMI Payment',
                                subLabel: 'Record new installment receipt',
                                icon: Receipt,
                                iconColor: 'text-indigo-600 dark:text-indigo-400',
                                onClick: () => navigate('/emis', { state: { preselectLoanId: l.id } })
                              },
                              {
                                label: 'View Loan Application',
                                subLabel: 'Open loan management dossier',
                                icon: ArrowRight,
                                iconColor: 'text-slate-500 dark:text-slate-400',
                                onClick: () => navigate('/loans')
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="py-8 text-center text-slate-400 font-semibold">
                      No matching EMI records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 100% Exact Printable SOA & Payment Receipt Voucher Modal */}
      {showSoaModal && selectedLoan && (() => {
        const totalContractValue = Math.ceil(parseFloat(selectedLoan.total_payment || 0)) || 
          (Math.ceil(parseFloat(selectedLoan.loan_amount || 0)) + Math.ceil(parseFloat(selectedLoan.interest_amount || 0))) || 
          (Math.ceil(parseFloat(selectedLoan.emi_amount || 0)) * (parseInt(selectedLoan.tenure_months) || 24));

        let runningRemaining = totalContractValue;
        const installmentsWithBalance = (soaStatement || []).map((st, idx) => {
          const emiPaid = Math.ceil(parseFloat(st.emi_amount || st.total_paid || 0));
          runningRemaining = Math.max(0, runningRemaining - emiPaid);
          return {
            ...st,
            installment_no: idx + 1,
            balance_after: runningRemaining
          };
        });

        const totalEmiCollected = (soaStatement || []).reduce((sum, r) => sum + Math.ceil(parseFloat(r.emi_amount || 0)), 0);
        const totalPenaltyCollected = (soaStatement || []).reduce((sum, r) => sum + Math.ceil(parseFloat(r.penalty_amount || 0)), 0);
        const grandTotalCollected = (soaStatement || []).reduce((sum, r) => sum + Math.ceil(parseFloat(r.total_paid || 0)), 0);
        const currentBalanceOutstanding = Math.ceil(parseFloat(selectedLoan.actual_outstanding ?? selectedLoan.due_emi_amount ?? selectedLoan.remaining_balance ?? Math.max(0, totalContractValue - totalEmiCollected)));

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-3 overflow-y-auto">
            <div className="printable-voucher voucher-multipages bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:max-w-none">
              {/* Modal Top Bar (Hidden on Print) */}
              <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Official Statement of Account (SOA) & Loan Ledger</h3>
                    <p className="text-[11px] text-slate-400">Complete borrower profile, co-applicant & guarantor particulars, itemized payment ledger</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                    {soaStatement.length} Recorded Installments
                  </span>
                  <button onClick={() => setShowSoaModal(false)} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable SOA Document Container */}
              <div className="p-5 sm:p-7 space-y-4 text-xs font-sans text-slate-900 dark:text-white print:text-black print:p-2 max-h-[82vh] print:max-h-none overflow-y-auto print:overflow-visible">
                {/* 1. Header Letterhead */}
                <div className="text-center border-b-2 border-slate-900 dark:border-slate-200 print:border-black pb-3">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white print:text-black tracking-tight uppercase">
                    {settings.institution_name || 'Microfinance Institution'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">
                    {settings.tagline || settings.address || 'State Highway No.11, Kailash Nagar, Narnaul-123001 (Haryana)'}
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium">
                    CIN: {settings.cin_number || 'U65929RJ2024NPL089123'} | Phone: {settings.phone || '+91 99910 95051'} | Email: {settings.email || 'info@microfinance.com'}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 flex flex-wrap items-center justify-between text-[11px] gap-2">
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-300 print:text-black bg-emerald-50 dark:bg-emerald-950/40 print:bg-slate-100 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 print:border-slate-400">
                      STATEMENT OF ACCOUNT (SOA) & REPAYMENT LEDGER
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                      Agreement No: <span className="text-indigo-600 dark:text-indigo-400 print:text-black font-extrabold">{selectedLoan.agreement_no || selectedLoan.loan_no}</span>
                      {selectedLoan.customer_id && ` | CID: ${selectedLoan.customer_id}`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 print:text-slate-700 font-medium">
                      Generated On: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* 2. Key Account Summary Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 print:bg-slate-100 text-white print:text-black p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border print:border-slate-300 shadow-sm">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 print:text-black px-2 py-0.5 rounded border border-emerald-400/30">
                        Primary Borrower
                      </span>
                      <span className="text-[11px] text-slate-300 print:text-slate-600 font-mono">
                        App No: {selectedLoan.loan_no}
                      </span>
                    </div>
                    <h3 className="text-base font-black uppercase mt-1 print:text-black">
                      {selectedLoan.customer_name}
                    </h3>
                    <p className="text-xs text-slate-300 print:text-slate-700 font-medium">
                      {selectedLoan.father_husband_name ? `S/o, W/o ${selectedLoan.father_husband_name} · ` : ''}
                      Mobile: {selectedLoan.phone}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:text-right gap-x-4 gap-y-1 border-t sm:border-t-0 border-slate-700 pt-2 sm:pt-0">
                    <div>
                      <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Total Paid to Date</span>
                      <span className="font-extrabold text-emerald-400 print:text-emerald-700 text-sm">
                        ₹{(grandTotalCollected || selectedLoan.actual_received || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-semibold block">Balance Outstanding</span>
                      <span className="font-extrabold text-rose-400 print:text-rose-700 text-sm">
                        ₹{currentBalanceOutstanding.toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2 text-[10.5px] font-bold text-emerald-300 print:text-black mt-0.5">
                      Status: {selectedLoan.status || 'Active'} | Cleared {selectedLoan.emi_received || soaStatement.length} of {selectedLoan.tenure_months} EMIs
                    </div>
                  </div>
                </div>

                {/* 2B. LOAN LIFECYCLE MILESTONES (Lead, Application, Approval, Disbursal) */}
                {renderLifecycleMilestoneStrip(selectedLoan, 'soa')}

                {/* 3. BORROWER, CO-APPLICANT & GUARANTOR DETAILS (Complete Particulars) */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-slate-800 dark:text-slate-200 print:text-black tracking-wider">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Parties to the Loan Agreement</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                    {/* Primary Applicant Particulars */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-950/40 print:bg-white print:border-slate-300 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <User className="h-3.5 w-3.5 text-indigo-600" />
                            <h4 className="font-bold text-[11px] uppercase text-slate-900 dark:text-white print:text-black">1. Primary Borrower</h4>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Main Debtor
                          </span>
                        </div>
                        <div className="space-y-1 text-[10.5px]">
                          <div>
                            <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Full Name</span>
                            <span className="font-extrabold uppercase text-slate-900 dark:text-white print:text-black">{selectedLoan.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Father / Husband</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.father_husband_name || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Mobile</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.phone}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">DOB / Gender</span>
                              <span className="text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.dob || 'N/A'} ({selectedLoan.gender || 'Male'})</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Aadhaar</span>
                              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.aadhaar_number || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">PAN</span>
                              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.pan_number || 'N/A'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Residential Address</span>
                            <span className="text-slate-700 dark:text-slate-300 print:text-slate-800 text-[10px] leading-tight">
                              {[selectedLoan.address, selectedLoan.district, selectedLoan.state, selectedLoan.pin_code].filter(Boolean).join(', ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedLoan.bank_name && (
                        <div className="pt-1.5 mt-2 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Disbursed Bank A/C</span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 print:text-slate-800 font-mono">
                            {selectedLoan.bank_name} · A/C: {selectedLoan.bank_account_no} · IFSC: {selectedLoan.bank_ifsc}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Co-Applicant Particulars */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-950/40 print:bg-white print:border-slate-300 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <Users className="h-3.5 w-3.5 text-teal-600" />
                            <h4 className="font-bold text-[11px] uppercase text-slate-900 dark:text-white print:text-black">2. Co-Applicant</h4>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            selectedLoan.co_applicant_name 
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}>
                            {selectedLoan.co_applicant_name ? 'Joint Obligor' : 'Optional'}
                          </span>
                        </div>

                        {selectedLoan.co_applicant_name ? (
                          <div className="space-y-1 text-[10.5px]">
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Full Name</span>
                              <span className="font-extrabold uppercase text-slate-900 dark:text-white print:text-black">{selectedLoan.co_applicant_name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Father / Husband</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.co_applicant_father_husband || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Mobile</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.co_applicant_phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">DOB / Gender</span>
                                <span className="text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.co_applicant_dob || 'N/A'} ({selectedLoan.co_applicant_gender || 'Male'})</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Aadhaar</span>
                                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.co_applicant_aadhaar || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">PAN</span>
                                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.co_applicant_pan || 'N/A'}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Residential Address</span>
                              <span className="text-slate-700 dark:text-slate-300 print:text-slate-800 text-[10px] leading-tight">
                                {[selectedLoan.co_applicant_address, selectedLoan.co_applicant_district, selectedLoan.co_applicant_state, selectedLoan.co_applicant_pin].filter(Boolean).join(', ') || 'Same as Primary Borrower'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-10 text-center text-slate-400 italic text-[11px] bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-1">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Sole Borrower Facility</span>
                            <span className="text-[10px]">No co-applicant nominated</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guarantor Particulars */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-950/40 print:bg-white print:border-slate-300 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <h4 className="font-bold text-[11px] uppercase text-slate-900 dark:text-white print:text-black">3. Guarantor Particulars</h4>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            selectedLoan.guarantor_name 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}>
                            {selectedLoan.guarantor_name ? 'Surety Backed' : 'Optional'}
                          </span>
                        </div>

                        {selectedLoan.guarantor_name ? (
                          <div className="space-y-1 text-[10.5px]">
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Full Name</span>
                              <span className="font-extrabold uppercase text-slate-900 dark:text-white print:text-black">{selectedLoan.guarantor_name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Father / Husband</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.guarantor_father_husband || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Mobile</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.guarantor_phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">DOB / Gender</span>
                                <span className="text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.guarantor_dob || 'N/A'} ({selectedLoan.guarantor_gender || 'Male'})</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Aadhaar</span>
                                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.guarantor_aadhaar || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">PAN</span>
                                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedLoan.guarantor_pan || 'N/A'}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9.5px] block uppercase font-semibold">Residential Address</span>
                              <span className="text-slate-700 dark:text-slate-300 print:text-slate-800 text-[10px] leading-tight">
                                {[selectedLoan.guarantor_address, selectedLoan.guarantor_district, selectedLoan.guarantor_state, selectedLoan.guarantor_pin].filter(Boolean).join(', ') || 'N/A'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-10 text-center text-slate-400 italic text-[11px] bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-1">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Collateral-Free Facility</span>
                            <span className="text-[10px]">No guarantor nominated</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Sanctioned Terms & Financial Math Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-slate-800 dark:text-slate-200 print:text-black tracking-wider">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Sanction Terms & Financial Summary</span>
                  </div>

                  <div 
                    className="gap-2.5 bg-slate-50 dark:bg-slate-950/60 print:bg-white p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-[11px]"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))' }}
                  >
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Loan Sanctioned</span>
                      <span className="font-extrabold text-slate-900 dark:text-white print:text-black text-xs">₹{Math.ceil(parseFloat(selectedLoan.loan_amount || 0)).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Interest Rate</span>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">{selectedLoan.interest_rate || '14.5'}% p.a.</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Penal Charge</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 print:text-black">{settings?.annual_penalty_rate || '24.0'}% p.a.</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Monthly EMI</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 print:text-black text-xs">₹{Math.ceil(parseFloat(selectedLoan.emi_amount || 0)).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Loan Tenure</span>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">{selectedLoan.tenure_months} Months</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Total Value</span>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">₹{totalContractValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Lead Date</span>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">{formatDocDate(getLoanMilestones(selectedLoan).leadDate)}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Application Date</span>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">{formatDocDate(getLoanMilestones(selectedLoan).applicationDate)}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Approval Date</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 print:text-black">{formatDocDate(getLoanMilestones(selectedLoan).approvalDate)}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Disbursed Date</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 print:text-black">{formatDocDate(getLoanMilestones(selectedLoan).disbursalDate)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Complete Repayment History & Collection Ledger Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-slate-800 dark:text-slate-200 print:text-black tracking-wider">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Complete Repayment History & Collection Ledger</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-700 font-semibold">
                      {installmentsWithBalance.length > 0 ? `${installmentsWithBalance.length} Recorded Transactions` : 'Schedule Mode'}
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 print:border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/90 print:bg-slate-100 font-bold uppercase text-slate-700 dark:text-slate-200 print:text-black border-b border-slate-200 dark:border-slate-700 print:border-slate-300">
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-center w-10">#</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300">Receipt No</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300">Payment Date</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300">Mode</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right">EMI (₹)</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right">Late Penalty (₹)</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right">Total Paid (₹)</th>
                          <th className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right">Balance Outstanding (₹)</th>
                          <th className="p-2 text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                        {installmentsWithBalance.length > 0 ? (
                          installmentsWithBalance.map((st) => (
                            <tr key={st.id || st.installment_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 print:bg-white transition-colors">
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 font-bold text-center text-slate-500">{st.installment_no}</td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 font-mono font-bold text-indigo-700 dark:text-indigo-400 print:text-black">
                                {st.receipt_no || `RCPT-${st.installment_no}`}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 font-medium text-slate-700 dark:text-slate-300 print:text-black">
                                {st.payment_date}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 print:bg-transparent print:text-black">
                                  {st.payment_mode || 'Cash'}
                                </span>
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right font-semibold">
                                ₹{Math.ceil(parseFloat(st.emi_amount || selectedLoan.emi_amount || 0)).toLocaleString()}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right font-semibold text-rose-600 print:text-black">
                                ₹{Math.ceil(parseFloat(st.penalty_amount || 0)).toLocaleString()}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right font-extrabold text-emerald-700 dark:text-emerald-400 print:text-black">
                                ₹{Math.ceil(parseFloat(st.total_paid || selectedLoan.emi_amount || 0)).toLocaleString()}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                                ₹{st.balance_after.toLocaleString()}
                              </td>
                              <td className="p-1.5 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 print:bg-transparent print:text-black">
                                  Confirmed
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" className="py-8 text-center bg-slate-50/50 dark:bg-slate-950/30 print:bg-white">
                              <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Loan Sanctioned & Disbursed — Awaiting First Installment</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Scheduled 1st EMI of ₹{Math.ceil(parseFloat(selectedLoan.emi_amount || 0)).toLocaleString()} is due on {selectedLoan.start_date || selectedLoan.next_due_date || 'the upcoming monthly cycle'}.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white print:text-black border-t-2 border-slate-300 dark:border-slate-700 print:border-black text-[10.5px]">
                          <td colSpan="4" className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 uppercase tracking-wider text-[10px]">
                            Cumulative Account Total ({installmentsWithBalance.length} EMIs Cleared of {selectedLoan.tenure_months} Months)
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right">
                            ₹{totalEmiCollected.toLocaleString()}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right text-rose-600 print:text-black">
                            ₹{totalPenaltyCollected.toLocaleString()}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right text-emerald-600 dark:text-emerald-400 print:text-black font-extrabold">
                            ₹{grandTotalCollected.toLocaleString()}
                          </td>
                          <td className="p-2 border-r border-slate-200 dark:border-slate-700 print:border-slate-300 text-right text-rose-600 dark:text-rose-400 print:text-black font-extrabold">
                            ₹{currentBalanceOutstanding.toLocaleString()}
                          </td>
                          <td className="p-2 text-center text-emerald-700 print:text-black font-bold">
                            {currentBalanceOutstanding <= 0 ? 'Closed' : 'Active'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 6. Verification QR Code & Authorized Dual Signatures */}
                <div className="pt-3 flex flex-col sm:flex-row justify-between items-end border-t border-slate-200 dark:border-slate-700 print:border-slate-400 text-[10px] gap-4">
                  <div className="flex items-center space-x-3 max-w-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=${encodeURIComponent(
                        `NBFC-SOA:AGR:${selectedLoan.agreement_no || selectedLoan.loan_no}|BORROWER:${selectedLoan.customer_name}|CO_APP:${selectedLoan.co_applicant_name || 'NONE'}|GUARANTOR:${selectedLoan.guarantor_name || 'NONE'}|PAID:Rs${grandTotalCollected}|DUE:Rs${currentBalanceOutstanding}`
                      )}`}
                      alt="Verification QR"
                      className="w-14 h-14 p-0.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white shrink-0 shadow-xs"
                    />
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 print:text-black uppercase text-[10px] tracking-wide">
                        Official Verified Statement of Account
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium leading-tight text-[9.5px]">
                        {settings.receipt_terms || 'This document is an authentic certified statement of accounts generated under NBFC regulatory standards. For queries or no-due certificates, please contact branch operations.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 sm:space-x-8 pt-2">
                    <div className="text-center border-t border-slate-400 pt-1.5 px-3 min-w-[120px]">
                      <p className="font-bold text-slate-900 dark:text-white print:text-black uppercase text-[10px]">
                        Borrower / Guarantor
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600">
                        Signature / Thumb
                      </p>
                    </div>

                    <div className="text-center border-t border-slate-400 pt-1.5 px-3 min-w-[130px]">
                      <p className="font-black text-slate-900 dark:text-white print:text-black uppercase text-[10.5px]">
                        {settings.signatory_name || 'Authorized Signatory'}
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600 font-bold">
                        {settings.signatory_title || 'Authorized Signatory'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Controls (Hidden on Print) */}
              <div className="print:hidden bg-slate-100 dark:bg-slate-800 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleWhatsAppSoaShare(selectedLoan)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Share SOA via WhatsApp</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSoaModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Statement of Account (SOA)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
