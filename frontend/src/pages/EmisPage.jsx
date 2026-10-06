import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  Receipt, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Printer, 
  X, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  FileText,
  Shield,
  ArrowUpRight,
  Calculator,
  QrCode,
  Share2,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function EmisPage() {
  const { settings } = useSettings();
  const [activeLoans, setActiveLoans] = useState([]);
  const [statement, setStatement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  
  // 8-Item Fee Breakdown State
  const [items, setItems] = useState({
    emi: 0,
    penal_charges: 0,
    cbc: 0,
    recovery_charges: 0,
    advance_emi: 0,
    current_penal: 0,
    other_charges: 0,
    foreclosure: 0
  });

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleWhatsAppShare = (data) => {
    if (!data) return;
    const rawPhone = data.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const instName = settings?.institution_name || 'Kaspr Microfinance';
    const lines = [
      `*${instName.toUpperCase()}*`,
      `*OFFICIAL EMI PAYMENT RECEIPT*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Borrower:* ${data.customer_name}`,
      `📄 *Receipt No:* ${data.receipt_no}`,
      `📋 *Agreement No:* ${data.agreement_no || data.loan_no}`,
      `💰 *Amount Received:* Rs. ${parseFloat(data.total_paid || 0).toLocaleString()}`,
      `🗓️ *Payment Date:* ${data.payment_date}`,
      `💳 *Payment Mode:* ${data.payment_mode}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *Status:* Received & Recorded in Portfolio`,
      `_Thank you for your prompt repayment._`
    ];
    const message = lines.join('\n');
    const url = cleanPhone 
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const calculateAutomatedOverdue = (loan, pDate) => {
    const annualRate = parseFloat(settings?.annual_penalty_rate || 36.0);
    const dailyRatePct = annualRate / 365;
    const grace = parseInt(settings?.grace_period ?? 0, 10);

    if (!loan) {
      return {
        overdueDays: 0,
        isOverdue: false,
        graceExceeded: false,
        annualRate,
        dailyRatePct: dailyRatePct.toFixed(4),
        overdueValues: {
          emi: 0,
          penal_charges: 0,
          cbc: 0,
          recovery_charges: 0,
          advance_emi: 0,
          current_penal: 0,
          other_charges: 0,
          foreclosure: 0
        },
        totalOverdueDemand: 0
      };
    }

    const balance = parseFloat(loan.balance_outstanding || 0);
    const emiAmt = parseFloat(loan.emi_amount || 0);

    let overdueDays = 0;
    if (loan.next_due_date) {
      const due = new Date(loan.next_due_date);
      const pay = new Date(pDate || new Date().toISOString().split('T')[0]);
      const diffTime = pay.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
      overdueDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const graceExceeded = overdueDays > grace;
    const effectiveDays = graceExceeded ? overdueDays : 0;

    // 1. EMI Installment Overdue Demand
    let overdueEmi = 0;
    if (balance > 0) {
      if (graceExceeded && overdueDays > 0) {
        const installmentsDue = Math.max(1, Math.min(parseInt(loan.pending_count || 1, 10), Math.ceil(overdueDays / 30)));
        overdueEmi = Math.min(balance, Math.ceil(installmentsDue * emiAmt));
      } else {
        overdueEmi = Math.min(balance, emiAmt);
      }
    }

    // 2. PENAL CHARGES (annual % p.a. pro-rated daily)
    let penalCharges = 0;
    if (graceExceeded && effectiveDays > 0 && emiAmt > 0) {
      penalCharges = Math.ceil(emiAmt * (dailyRatePct / 100) * effectiveDays);
    }

    // 3. CBC (Cheque Bounce / NACH Return Charges)
    let cbc = 0;
    if (graceExceeded && effectiveDays > 0) {
      cbc = 250;
    }

    // 4. Recovery Charges LEGAL
    let recoveryCharges = 0;
    if (graceExceeded && effectiveDays >= 15) {
      recoveryCharges = 500;
    } else if (graceExceeded && effectiveDays > 0) {
      recoveryCharges = 250;
    }

    // 5. Advance EMI
    const advanceEmi = 0;

    // 6. Current Month Penal Charge
    let currentPenal = 0;
    if (graceExceeded && effectiveDays > 0) {
      const currentDays = Math.min(30, effectiveDays);
      currentPenal = Math.ceil(emiAmt * (dailyRatePct / 100) * currentDays);
    }

    // 7. Other Charges
    let otherCharges = 0;
    if (graceExceeded && effectiveDays > 0) {
      otherCharges = 50;
    }

    // 8. Foreclosure (Full Account Payoff Demand)
    const foreclosure = Math.ceil(balance + (graceExceeded ? (penalCharges + cbc + recoveryCharges + otherCharges) : 0));

    const overdueValues = {
      emi: overdueEmi,
      penal_charges: penalCharges,
      cbc: cbc,
      recovery_charges: recoveryCharges,
      advance_emi: advanceEmi,
      current_penal: currentPenal,
      other_charges: otherCharges,
      foreclosure: foreclosure
    };

    const totalOverdueDemand = overdueEmi + penalCharges + cbc + recoveryCharges + currentPenal + otherCharges;

    return {
      overdueDays,
      isOverdue: overdueDays > 0,
      graceExceeded,
      annualRate,
      dailyRatePct: dailyRatePct.toFixed(4),
      overdueValues,
      totalOverdueDemand
    };
  };

  const fetchActiveLoans = async () => {
    try {
      const res = await api.get('emis/active-loans');
      if (res.success) {
        const loans = res.data.loans || [];
        setActiveLoans(loans);
        if (loans.length > 0 && !selectedLoanId) {
          const first = loans[0];
          setSelectedLoanId(first.id);
          setSelectedLoan(first);
          const auto = calculateAutomatedOverdue(first, paymentDate);
          setItems({
            emi: auto.overdueValues.emi,
            penal_charges: auto.overdueValues.penal_charges,
            cbc: auto.overdueValues.cbc,
            recovery_charges: auto.overdueValues.recovery_charges,
            advance_emi: 0,
            current_penal: auto.overdueValues.current_penal,
            other_charges: auto.overdueValues.other_charges,
            foreclosure: 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching active loans:', err);
    }
  };

  const fetchStatement = async (loanId) => {
    setLoading(true);
    try {
      const res = await api.get(`emis/statement?loan_id=${loanId}`);
      if (res.success) setStatement(res.data.statement || []);
    } catch (err) {
      console.error('Error fetching EMI statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    if (selectedLoanId) {
      const loan = activeLoans.find((l) => l.id == selectedLoanId);
      setSelectedLoan(loan || null);
      if (loan) {
        const auto = calculateAutomatedOverdue(loan, paymentDate);
        setItems({
          emi: auto.overdueValues.emi,
          penal_charges: auto.overdueValues.penal_charges,
          cbc: auto.overdueValues.cbc,
          recovery_charges: auto.overdueValues.recovery_charges,
          advance_emi: 0,
          current_penal: auto.overdueValues.current_penal,
          other_charges: auto.overdueValues.other_charges,
          foreclosure: 0
        });
      }
      fetchStatement(selectedLoanId);
    }
  }, [selectedLoanId, paymentDate]);

  // Live Auto-Calculated Total Amount
  const totalAmount = Object.values(items).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setSubmitting(true);
    try {
      const emiAmt = Math.ceil(parseFloat(items.emi || 0) + parseFloat(items.advance_emi || 0) + parseFloat(items.foreclosure || 0));
      const penAmt = Math.ceil(parseFloat(items.penal_charges || 0) + parseFloat(items.current_penal || 0) + parseFloat(items.cbc || 0) + parseFloat(items.recovery_charges || 0) + parseFloat(items.other_charges || 0));
      const totalPaid = Math.ceil(totalAmount);

      const itemNotes = [
        items.emi > 0 && `EMI: ₹${items.emi}`,
        items.penal_charges > 0 && `Penal: ₹${items.penal_charges}`,
        items.cbc > 0 && `CBC: ₹${items.cbc}`,
        items.recovery_charges > 0 && `Recovery: ₹${items.recovery_charges}`,
        items.advance_emi > 0 && `Advance: ₹${items.advance_emi}`,
        items.current_penal > 0 && `Curr Penal: ₹${items.current_penal}`,
        items.other_charges > 0 && `Other: ₹${items.other_charges}`,
        items.foreclosure > 0 && `Foreclosure: ₹${items.foreclosure}`,
        notes
      ].filter(Boolean).join(' | ');

      const res = await api.post('emis/pay', {
        loan_id: selectedLoan.id,
        emi_amount: emiAmt,
        penalty_amount: penAmt,
        total_paid: totalPaid,
        payment_mode: paymentMode,
        payment_date: paymentDate,
        notes: itemNotes
      });

      if (res.success) {
        setReceiptData({
          receipt_no: res.data.receipt_no || 'RCPT-84',
          customer_name: selectedLoan.customer_name,
          loan_no: selectedLoan.loan_no,
          agreement_no: selectedLoan.agreement_no,
          customer_id: selectedLoan.customer_id,
          phone: selectedLoan.phone,
          emi_amount: emiAmt,
          penalty_amount: penAmt,
          total_paid: totalPaid,
          items: { ...items },
          payment_mode: paymentMode,
          payment_date: paymentDate,
          remaining_balance: Math.max(0, Math.ceil(parseFloat(selectedLoan.balance_outstanding) - emiAmt))
        });
        setShowReceiptModal(true);
        setNotes('');
        fetchActiveLoans();
        fetchStatement(selectedLoan.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoricalReceipt = (st) => {
    if (!selectedLoan || !st) return;
    setReceiptData({
      receipt_no: st.receipt_no,
      customer_name: selectedLoan.customer_name,
      loan_no: selectedLoan.loan_no,
      agreement_no: selectedLoan.agreement_no,
      customer_id: selectedLoan.customer_id,
      phone: selectedLoan.phone,
      emi_amount: parseFloat(st.emi_amount || 0),
      penalty_amount: parseFloat(st.penalty_amount || 0),
      total_paid: parseFloat(st.total_paid || 0),
      items: {
        emi: parseFloat(st.emi_amount || 0),
        penal_charges: parseFloat(st.penalty_amount || 0),
        cbc: 0,
        recovery_charges: 0,
        advance_emi: 0,
        current_penal: 0,
        other_charges: 0,
        foreclosure: 0
      },
      payment_mode: st.payment_mode || 'Cash',
      payment_date: st.payment_date,
      remaining_balance: Math.max(0, Math.ceil(parseFloat(selectedLoan.balance_outstanding || 0)))
    });
    setShowReceiptModal(true);
  };

  const autoOverdue = calculateAutomatedOverdue(selectedLoan, paymentDate);
  const annualPenaltyRate = autoOverdue.annualRate;
  const dailyPenaltyRate = autoOverdue.dailyRatePct;

  const itemRows = [
    { 
      key: 'emi', 
      label: 'EMI Installment', 
      shortLabel: 'EMI Installment',
      desc: 'Regular monthly installment due',
      overdue: autoOverdue.overdueValues.emi 
    },
    { 
      key: 'penal_charges', 
      label: `Penal Charges (${annualPenaltyRate}% p.a.)`, 
      shortLabel: `Penal Charges (${annualPenaltyRate}% p.a.)`,
      desc: `${autoOverdue.overdueDays} days @ ${dailyPenaltyRate}%/day`,
      overdue: autoOverdue.overdueValues.penal_charges 
    },
    { 
      key: 'cbc', 
      label: 'CBC (Cheque Bounce / NACH Return)', 
      shortLabel: 'CBC (Bounce / NACH Return)',
      desc: 'Mandate return service charge',
      overdue: autoOverdue.overdueValues.cbc 
    },
    { 
      key: 'recovery_charges', 
      label: 'Recovery Charges (Legal Notice)', 
      shortLabel: 'Recovery Charges (Legal)',
      desc: 'Notice & recovery processing fee',
      overdue: autoOverdue.overdueValues.recovery_charges 
    },
    { 
      key: 'advance_emi', 
      label: 'Advance EMI', 
      shortLabel: 'Advance EMI',
      desc: 'Deposit for upcoming billing cycle',
      overdue: autoOverdue.overdueValues.advance_emi 
    },
    { 
      key: 'current_penal', 
      label: 'Current Month Penal Charge', 
      shortLabel: 'Current Month Penal Charge',
      desc: 'Ongoing cycle delayed interest',
      overdue: autoOverdue.overdueValues.current_penal 
    },
    { 
      key: 'other_charges', 
      label: 'Other Incidental Charges', 
      shortLabel: 'Other Charges',
      desc: 'Documentation & reminder fee',
      overdue: autoOverdue.overdueValues.other_charges 
    },
    { 
      key: 'foreclosure', 
      label: 'Foreclosure (Full Payoff Settlement)', 
      shortLabel: 'Foreclosure Settlement',
      desc: 'Complete loan account payoff demand',
      overdue: autoOverdue.overdueValues.foreclosure 
    },
  ];

  return (
    <>
      <div className={`space-y-4 ${showReceiptModal ? 'print:hidden' : ''}`}>
        {/* Header */}
        <div className="teal-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-teal-600">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Receipting & EMI Collection</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Record installment collections, automated fee breakdowns, print official vouchers, and audit borrower ledger.</p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* LEFT: Itemized Payment Entry Box (xl:col-span-5) */}
          <div className="xl:col-span-5 teal-card p-4 sm:p-5 space-y-4 border-t-4 border-t-teal-600">
            {/* Box Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-2xs">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">Add Payment</h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Automated overdue demand & ledger receipting</p>
                </div>
              </div>
              {selectedLoan && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedLoan.agreement_no || selectedLoan.loan_no}
                </span>
              )}
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3.5">
              {/* Select Loan Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Select Borrower Loan Account
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  <option value="">Choose borrower loan account...</option>
                  {activeLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.customer_name} ({l.agreement_no || l.loan_no}{l.customer_id ? ` · CID: ${l.customer_id}` : ''}) — EMI: ₹{parseFloat(l.emi_amount).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Borrower Due & Overdue Status Snapshot */}
              {selectedLoan && (
                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px]">Due Date: <strong className="text-slate-900 dark:text-white font-mono">{selectedLoan.next_due_date || 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Balance: <strong className="text-slate-800 dark:text-slate-200 font-mono">₹{Math.ceil(parseFloat(selectedLoan.balance_outstanding || 0)).toLocaleString()}</strong></span>
                    </div>
                  </div>

                  {autoOverdue.overdueDays > 0 ? (
                    <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      autoOverdue.graceExceeded
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-extrabold text-[11px] flex items-center gap-1.5">
                          <span>{autoOverdue.graceExceeded ? '⚠️ Overdue Penal Active' : 'ℹ️ Grace Period Active'}</span>
                          <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-white/70 dark:bg-slate-900/60 text-[10px]">
                            {autoOverdue.overdueDays} Days
                          </span>
                        </div>
                        <p className="text-[10px] opacity-85 leading-tight truncate">
                          Rate: {annualPenaltyRate}% p.a. ({dailyPenaltyRate}%/day) · Demand: ₹{autoOverdue.totalOverdueDemand.toLocaleString()}
                        </p>
                      </div>
                      {autoOverdue.graceExceeded && (
                        <button
                          type="button"
                          onClick={() => setItems({
                            emi: autoOverdue.overdueValues.emi,
                            penal_charges: autoOverdue.overdueValues.penal_charges,
                            cbc: autoOverdue.overdueValues.cbc,
                            recovery_charges: autoOverdue.overdueValues.recovery_charges,
                            advance_emi: 0,
                            current_penal: autoOverdue.overdueValues.current_penal,
                            other_charges: autoOverdue.overdueValues.other_charges,
                            foreclosure: 0
                          })}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition shadow-2xs shrink-0 whitespace-nowrap"
                        >
                          Apply Demand
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Account is current & on schedule
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Standard Installment</span>
                    </div>
                  )}
                </div>
              )}

              {/* 8-Item Fee Breakdown Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Itemized Particulars
                  </span>
                  {/* Preset Pills */}
                  <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setItems({
                        emi: autoOverdue.overdueValues.emi,
                        penal_charges: autoOverdue.overdueValues.penal_charges,
                        cbc: autoOverdue.overdueValues.cbc,
                        recovery_charges: autoOverdue.overdueValues.recovery_charges,
                        advance_emi: 0,
                        current_penal: autoOverdue.overdueValues.current_penal,
                        other_charges: autoOverdue.overdueValues.other_charges,
                        foreclosure: 0
                      })}
                      className="px-2 py-0.5 font-bold rounded text-rose-700 dark:text-rose-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Fill all overdue charges"
                    >
                      All Demand
                    </button>
                    <button
                      type="button"
                      onClick={() => setItems(prev => ({
                        ...prev,
                        emi: autoOverdue.overdueValues.emi,
                        penal_charges: autoOverdue.overdueValues.penal_charges
                      }))}
                      className="px-2 py-0.5 font-bold rounded text-indigo-700 dark:text-indigo-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Fill standard Due EMI and Penal Charges"
                    >
                      EMI + Penal
                    </button>
                    <button
                      type="button"
                      onClick={() => setItems({
                        emi: 0,
                        penal_charges: 0,
                        cbc: 0,
                        recovery_charges: 0,
                        advance_emi: 0,
                        current_penal: 0,
                        other_charges: 0,
                        foreclosure: autoOverdue.overdueValues.foreclosure
                      })}
                      className="px-2 py-0.5 font-bold rounded text-purple-700 dark:text-purple-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Full account foreclosure settlement payoff"
                    >
                      Foreclosure
                    </button>
                    <button
                      type="button"
                      onClick={() => setItems({
                        emi: 0,
                        penal_charges: 0,
                        cbc: 0,
                        recovery_charges: 0,
                        advance_emi: 0,
                        current_penal: 0,
                        other_charges: 0,
                        foreclosure: 0
                      })}
                      className="px-2 py-0.5 font-bold rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Clear all Actuals to zero"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Clean 3-Column Ledger Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-right w-28 whitespace-nowrap">Overdue (₹)</th>
                        <th className="py-2 px-3 text-right w-32 whitespace-nowrap">Actuals (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                      {itemRows.map((row) => {
                        const hasOverdue = row.overdue > 0;
                        const isFilled = (items[row.key] || 0) > 0;
                        return (
                          <tr key={row.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] leading-tight">
                                {row.shortLabel}
                              </div>
                              {row.desc && (
                                <div className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                  {row.desc}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              {hasOverdue ? (
                                <button
                                  type="button"
                                  onClick={() => setItems(prev => ({ ...prev, [row.key]: row.overdue }))}
                                  title="Click to copy into Actuals"
                                  className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800 px-2 py-0.5 rounded-md cursor-pointer transition shadow-2xs"
                                >
                                  <span>₹{row.overdue.toLocaleString()}</span>
                                  <span className="text-[9px] opacity-75 font-sans">+</span>
                                </button>
                              ) : (
                                <span className="font-mono text-slate-400 text-[11px]">₹0</span>
                              )}
                            </td>
                            <td className="py-1 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={items[row.key] === 0 ? '' : items[row.key]}
                                placeholder="0"
                                onChange={(e) => setItems({ ...items, [row.key]: parseFloat(e.target.value || 0) })}
                                className={`w-full text-right font-mono text-xs font-bold rounded-lg px-2.5 py-1 border transition-all focus:outline-none focus:ring-2 ${
                                  isFilled
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 focus:ring-emerald-500'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-teal-500'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}

                      {/* Total Summary Row */}
                      <tr className="bg-slate-900 dark:bg-slate-950 text-white font-extrabold border-t-2 border-slate-700">
                        <td className="py-2.5 px-3 uppercase tracking-wider text-[10.5px] text-slate-300">
                          Total Demand / Paid
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-300">
                          ₹{autoOverdue.totalOverdueDemand.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-400">
                          ₹{totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Date & Mode */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Compact UPI QR Code Panel */}
              {paymentMode === 'UPI' && totalAmount > 0 && selectedLoan && (
                <div className="p-3 bg-gradient-to-br from-indigo-50/80 to-teal-50/80 dark:from-indigo-950/40 dark:to-teal-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-3.5 animate-in fade-in duration-200">
                  <div className="p-1.5 bg-white rounded-lg shadow-xs border border-slate-200 shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                        `upi://pay?pa=${settings?.upi_id || '9991095051@okbizaxis'}&pn=${encodeURIComponent(settings?.institution_name || 'Kaspr Microfinance')}&am=${totalAmount}&tn=${encodeURIComponent(`${selectedLoan.agreement_no || selectedLoan.loan_no} EMI`)}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-20 h-20 rounded"
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                        <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                        Dynamic Collection QR
                      </span>
                      <span className="text-xs font-black text-emerald-600 font-mono">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate">
                      VPA: <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 font-bold">{settings?.upi_id || '9991095051@okbizaxis'}</code>
                    </p>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-tight">
                      Pre-filled with ₹{totalAmount.toLocaleString()} for agreement {selectedLoan.agreement_no || selectedLoan.loan_no}.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedLoan || totalAmount <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-700/20 flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    <span>Record ₹{totalAmount.toLocaleString()} & Generate Voucher</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Borrower Repayment Statement Ledger (xl:col-span-7) */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-4.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Borrower Repayment Statement</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Historical ledger records for {selectedLoan?.customer_name || 'selected account'}.</p>
              </div>
              {selectedLoan && (
                <div className="flex items-center gap-2">
                  {selectedLoan.customer_id && (
                    <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md">
                      CID: {selectedLoan.customer_id}
                    </span>
                  )}
                  <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/60">
                    {selectedLoan.agreement_no || selectedLoan.loan_no}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-6 w-6 text-teal-600 animate-spin mb-1.5" />
                  <p className="text-xs font-semibold">Loading statement ledger...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[10.5px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">EMI Amount</th>
                      <th className="py-2.5 px-3 text-right">Penalty</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {statement.length > 0 ? (
                      statement.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">{st.receipt_no}</td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-200">{st.payment_date}</td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                              {st.payment_mode}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-white">₹{Math.ceil(parseFloat(st.emi_amount)).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-rose-600 font-medium">₹{Math.ceil(parseFloat(st.penalty_amount || 0)).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-extrabold text-emerald-600">₹{Math.ceil(parseFloat(st.total_paid)).toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Received
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenHistoricalReceipt(st)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
                              title="Print / View Receipt Voucher"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-14 text-center text-slate-400 font-medium">
                          No installment payments received yet for this loan account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Voucher Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-3 overflow-y-auto">
          <div className="printable-voucher voucher-1page bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:max-w-none">
            {/* Modal Top Bar (Hidden on Print) */}
            <div className="print:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-teal-400" />
                <h3 className="font-bold text-sm">Official Payment Receipt & Voucher</h3>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                  Print Preview: 1 Page
                </span>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-5 sm:p-6 space-y-3.5 text-xs font-sans text-slate-900 dark:text-white print:text-black print:p-2">
              {/* Header Letterhead */}
              <div className="text-center border-b border-slate-200 dark:border-slate-700 print:border-slate-400 pb-2.5">
                <h2 className="text-base font-black text-slate-900 dark:text-white print:text-black tracking-tight uppercase">
                  {settings.institution_name || 'Kaspr Group of Microfinance'}
                </h2>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">
                  {settings.tagline || settings.address || 'State Highway No.11, Kailash Nagar, Narnaul-123001 (Haryana)'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600">
                  CIN: {settings.cin_number || 'U65929RJ2024NPL089123'} | Phone: {settings.phone || '+91 99910 95051'}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 print:border-slate-300 text-[11px]">
                  <span className="font-bold text-teal-800 dark:text-teal-400 print:text-black bg-teal-50 dark:bg-teal-950/40 print:bg-slate-100 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 print:border-slate-400">
                    Payment Receipt: {receiptData.receipt_no}
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 print:text-black">
                    Agreement No: {receiptData.agreement_no || receiptData.loan_no}
                    {receiptData.customer_id && ` | CID: ${receiptData.customer_id}`}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-700 font-medium">
                    Date: {receiptData.payment_date}
                  </span>
                </div>
              </div>

              {/* Key Account Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 print:bg-slate-100 text-white print:text-black p-3 rounded-lg flex items-center justify-between border print:border-slate-300">
                <div>
                  <h3 className="text-sm font-extrabold print:text-black uppercase">{receiptData.customer_name}</h3>
                  <p className="text-[11px] text-slate-300 print:text-slate-700">Mobile: {receiptData.phone}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-300 print:text-black font-semibold">
                    Total Collected: <span className="font-bold text-emerald-400 print:text-emerald-700 text-sm">₹{Math.ceil(receiptData.total_paid).toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 print:text-slate-700">
                    Payment Mode: <span className="font-bold text-white print:text-black">{receiptData.payment_mode}</span>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown Grid */}
              <div className="bg-slate-50 dark:bg-slate-950 print:bg-white p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300 text-[11px] space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">EMI Installment</span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black">₹{Math.ceil(parseFloat(receiptData.emi_amount || receiptData.total_paid)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Late Penalty / Fee</span>
                    <span className="font-bold text-rose-600 print:text-rose-700">₹{Math.ceil(parseFloat(receiptData.penalty_amount || 0)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Payment Status</span>
                    <span className="font-bold text-emerald-600 print:text-emerald-700">Confirmed Received</span>
                  </div>
                </div>

                {receiptData.items && (receiptData.items.cbc > 0 || receiptData.items.recovery_charges > 0 || receiptData.items.advance_emi > 0 || receiptData.items.foreclosure > 0 || receiptData.items.other_charges > 0) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 flex flex-wrap gap-2.5 text-[10.5px] text-slate-600 dark:text-slate-300">
                    {receiptData.items.cbc > 0 && <span>CBC: <strong className="text-slate-800 dark:text-slate-100 print:text-black">₹{receiptData.items.cbc}</strong></span>}
                    {receiptData.items.recovery_charges > 0 && <span>Legal Recovery: <strong className="text-slate-800 dark:text-slate-100 print:text-black">₹{receiptData.items.recovery_charges}</strong></span>}
                    {receiptData.items.advance_emi > 0 && <span>Advance: <strong className="text-teal-700 dark:text-teal-300 print:text-black">₹{receiptData.items.advance_emi}</strong></span>}
                    {receiptData.items.foreclosure > 0 && <span>Foreclosure: <strong className="text-purple-700 dark:text-purple-300 print:text-black">₹{receiptData.items.foreclosure}</strong></span>}
                    {receiptData.items.other_charges > 0 && <span>Other Charges: <strong className="text-slate-800 dark:text-slate-100 print:text-black">₹{receiptData.items.other_charges}</strong></span>}
                  </div>
                )}
              </div>

              {/* Verification QR Code & Authorized Signature */}
              <div className="pt-2.5 flex justify-between items-end border-t border-slate-200 dark:border-slate-700 print:border-slate-400 text-[10px]">
                <div className="flex items-center space-x-2.5 max-w-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(
                      `NBFC-RECEIPT:${receiptData.receipt_no}|AGR:${receiptData.agreement_no || receiptData.loan_no}|PAID:Rs${receiptData.total_paid}|DATE:${receiptData.payment_date}`
                    )}`}
                    alt="Verification QR"
                    className="w-12 h-12 p-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white shrink-0"
                  />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase text-[9.5px]">Official Digital Voucher</p>
                    <p className="text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium leading-tight">
                      {settings.receipt_terms || 'This is an official system generated receipt for the payment recorded against this loan account.'}
                    </p>
                  </div>
                </div>
                <div className="text-center border-t border-slate-400 pt-1 px-3">
                  <p className="font-black text-slate-900 dark:text-white print:text-black uppercase text-[10.5px]">
                    {settings.signatory_name || 'Authorized Signature'}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600 font-bold">
                    {settings.signatory_title || 'Managing Director'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Controls (Hidden on Print) */}
            <div className="print:hidden bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const summary = `Receipt No: ${receiptData.receipt_no}\nAgreement: ${receiptData.agreement_no || receiptData.loan_no}\nAmount: Rs. ${receiptData.total_paid}\nDate: ${receiptData.payment_date}`;
                  navigator.clipboard.writeText(summary);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleWhatsAppShare(receiptData)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print 1-Page Voucher</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
