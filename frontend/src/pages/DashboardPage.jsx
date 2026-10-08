import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown,
  PlusCircle, 
  Receipt, 
  Loader2,
  Shield,
  Activity,
  Users,
  Calendar,
  CreditCard,
  ArrowRight,
  PieChart,
  Sparkles,
  Scale,
  Clock,
  Wallet,
  Building2,
  LineChart
} from 'lucide-react';

export default function DashboardPage() {
  const { user, role, isAdmin, isManager, isStaff } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState(null);
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, loansRes] = await Promise.all([
          api.get('dashboard/stats').catch(() => ({ success: true, data: { stats: {} } })),
          api.get('loans').catch(() => ({ success: true, data: { loans: [] } }))
        ]);

        if (statsRes.success) setStats(statsRes.data.stats);
        if (loansRes.success) setRecentLoans(loansRes.data.loans.slice(0, 8));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Portfolio & Ledger Metrics...</p>
      </div>
    );
  }

  // Base operational metrics safe for all roles
  const totalLoans = parseInt(stats?.total_loans ?? 0, 10);
  const activeLoans = parseInt(stats?.active_loans ?? 0, 10);
  const pendingApprovals = parseInt(stats?.pending_approvals ?? 0, 10);
  const pendingDisbursements = parseInt(stats?.pending_disbursements ?? 0, 10);
  const emisCleared = parseInt(stats?.emis_cleared ?? 0, 10);
  const avgTenure = parseFloat(stats?.avg_tenure ?? 0);

  // Financial figures strictly for Admin
  const totalDisbursed = parseFloat(stats?.total_disbursed ?? 0);
  const totalReceived = parseFloat(stats?.total_received ?? 0);
  const totalOutstanding = parseFloat(stats?.total_outstanding ?? 0);
  const expectedInterest = parseFloat(stats?.expected_interest ?? 0);
  const totalIncome = parseFloat(stats?.total_income ?? 0);
  const totalExpense = parseFloat(stats?.total_expense ?? 0);
  const netProfit = parseFloat(stats?.net_profit ?? 0);

  const isEmpty = totalLoans === 0 && recentLoans.length === 0;

  const totalDemand = totalReceived + totalOutstanding;
  const efficiencyRate = totalDemand > 0 ? Math.min(100, Math.round((totalReceived / totalDemand) * 100)) : 0;

  // Role-Differentiated KPI Cards
  const kpiCards = isAdmin
    ? [
        {
          title: 'Total Disbursed Capital',
          value: `₹${Math.ceil(totalDisbursed).toLocaleString()}`,
          change: isEmpty ? 'Fresh Database' : '+14.2% MoM',
          desc: isEmpty ? 'Zero capital disbursed yet' : 'Active portfolio sanction',
          icon: DollarSign,
          trendType: isEmpty ? 'neutral' : 'positive'
        },
        {
          title: 'Total Recovered / Collected',
          value: `₹${Math.ceil(totalReceived).toLocaleString()}`,
          change: isEmpty ? '0 EMIs Received' : `${emisCleared} EMIs Received`,
          desc: isEmpty ? 'Zero collections recorded' : 'Realized collections',
          icon: CheckCircle2,
          trendType: emisCleared > 0 ? 'positive' : 'neutral'
        },
        {
          title: 'Outstanding Principal & Balances',
          value: `₹${Math.ceil(totalOutstanding).toLocaleString()}`,
          change: isEmpty ? 'Zero Outstanding' : 'On Repayment Schedule',
          desc: isEmpty ? 'No active loan debt' : 'Pending regular recovery',
          icon: FileText,
          trendType: 'neutral'
        },
        {
          title: 'Active Borrower Accounts',
          value: activeLoans,
          change: isEmpty ? '0 Active Accounts' : 'Standard Asset (SMA 0)',
          desc: isEmpty ? 'Awaiting initial application' : '0 Default risk flagged',
          icon: TrendingUp,
          trendType: isEmpty ? 'neutral' : 'positive'
        }
      ]
    : [
        {
          title: 'Total Loan Applications',
          value: totalLoans,
          change: isEmpty ? 'Fresh Database' : 'Registered Files',
          desc: isEmpty ? 'Zero applications logged' : 'Portfolio application intake',
          icon: FileText,
          trendType: isEmpty ? 'neutral' : 'positive'
        },
        {
          title: 'Active Borrower Accounts',
          value: activeLoans,
          change: isEmpty ? '0 Active Accounts' : 'Standard Asset (SMA 0)',
          desc: isEmpty ? 'Awaiting initial application' : 'Regular servicing accounts',
          icon: Users,
          trendType: isEmpty ? 'neutral' : 'positive'
        },
        {
          title: 'Pending Sanction Approvals',
          value: pendingApprovals,
          change: pendingApprovals > 0 ? `${pendingApprovals} Pending Action` : 'Queue Clear',
          desc: isManager ? 'Review & sanction decisions' : 'Awaiting managerial sign-off',
          icon: Clock,
          trendType: pendingApprovals > 0 ? 'positive' : 'neutral'
        },
        {
          title: 'Cleared Repayment Installments',
          value: emisCleared,
          change: isEmpty ? '0 EMIs' : `${emisCleared} Collections`,
          desc: 'Serviced borrower installments',
          icon: CheckCircle2,
          trendType: emisCleared > 0 ? 'positive' : 'neutral'
        }
      ];

  return (
    <div className="space-y-4">
      
      {/* Executive / Operational Header Bar */}
      <div className="crm-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {settings?.branch_code || 'BR-NNL-001'} • {isAdmin ? 'Executive Command Center' : isManager ? 'Branch Manager Workspace' : 'Field Staff Operations'}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isEmpty ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
            <span className={`text-[10px] font-medium ${isEmpty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isEmpty ? 'Database Empty (0 Records)' : 'Portfolio Synchronized'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? 'Executive Financial & P&L Dashboard' : 'Branch Operations & Servicing Dashboard'}
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isAdmin 
              ? 'Real-time microfinance portfolio monitoring, corporate profit/loss ledger, income/expense tracking, and repayment collections.' 
              : 'Branch portfolio workflow, loan application processing pipeline, KYC verification, and daily installment recovery servicing.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 z-10 flex-wrap sm:flex-nowrap">
          <Link
            to="/loans"
            className="crm-btn-primary h-8 px-3.5 text-xs whitespace-nowrap"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Application Wizard</span>
          </Link>
          <Link
            to="/emis"
            className="crm-btn-secondary h-8 px-3.5 text-xs whitespace-nowrap"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Record EMI Payment</span>
          </Link>
          {isAdmin && (
            <Link
              to="/total-profit-loss"
              className="inline-flex items-center space-x-1.5 h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors shadow-xs"
              title="View Total Profit & Loss Executive Statement"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Executive P&L</span>
            </Link>
          )}
        </div>
      </div>

      {/* Fresh Empty Database Onboarding Banner */}
      {isEmpty && (
        <div className="crm-card p-4 sm:p-5 bg-gradient-to-r from-teal-500/10 via-indigo-500/5 to-transparent border border-teal-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-teal-600/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Database is Clean & Ready for New Entries (0 Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All previous loan accounts, EMIs, and financial records were successfully cleared. You can start fresh by clicking "New Application Wizard".
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
            <Link to="/loans" className="crm-btn-primary h-8 px-4 text-xs w-full sm:w-auto justify-center">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Apply for First Loan</span>
            </Link>
          </div>
        </div>
      )}

      {/* ADMIN-ONLY: Executive Financial & Profit/Loss Command Strip */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total Income */}
          <div className="crm-card p-4 flex items-center justify-between bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Total Operating Income
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{Math.ceil(totalIncome).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Loan fees, interest income & recoveries
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          {/* Total Expense */}
          <div className="crm-card p-4 flex items-center justify-between bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent border-amber-500/30">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Total Operating Expenses
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{Math.ceil(totalExpense).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Overheads, branch ops & disbursements
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          {/* Net Profit / Loss */}
          <div className={`crm-card p-4 flex items-center justify-between bg-gradient-to-br ${netProfit >= 0 ? 'from-teal-500/10 border-teal-500/30' : 'from-rose-500/10 border-rose-500/30'} via-transparent to-transparent`}>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Corporate Net Profit / Loss
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {netProfit >= 0 ? 'PROFIT' : 'LOSS'}
                </span>
              </div>
              <h3 className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {netProfit >= 0 ? '+' : ''}₹{Math.ceil(netProfit).toLocaleString()}
              </h3>
              <div className="flex items-center space-x-2 pt-0.5">
                <Link to="/reports" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5">
                  <span>P&L Ledger</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Link to="/total-profit-loss" className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-0.5">
                  <span>Executive Statement</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${netProfit >= 0 ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'}`}>
              <Scale className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* 4 Clean Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="crm-card crm-card-interactive p-3.5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {card.title}
                </span>
                <div 
                  className="p-1.5 rounded-lg text-white"
                  style={{ background: 'var(--crm-gradient)' }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  {card.value}
                </h3>
                <div className="mt-1.5 flex items-center text-xs flex-wrap gap-1">
                  <span className={`px-1.5 py-0.5 rounded-md font-medium text-[10px] inline-flex items-center ${
                    card.trendType === 'positive' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    {card.change}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{card.desc}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio Health & Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Left Column: Health / Servicing Activity */}
        <div className="crm-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                {isAdmin ? 'Collection Health & Recovery' : 'Servicing & Repayment Health'}
              </h3>
            </div>
            {isAdmin ? (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                isEmpty 
                  ? 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
              }`}>
                {isEmpty ? '0.0% (Empty Ledger)' : `${efficiencyRate}% Efficiency`}
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md border text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800">
                {activeLoans} Active Portfolios
              </span>
            )}
          </div>

          <div className="space-y-4 pt-1">
            {isAdmin ? (
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                  <span className="font-medium">Monthly Collection Ratio</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{Math.ceil(totalReceived).toLocaleString()} / ₹{Math.ceil(totalDemand).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-2.5 rounded-full transition-all duration-500" 
                    style={{ 
                      background: 'var(--crm-gradient)',
                      width: `${isEmpty ? 0 : Math.min(100, Math.max(0, efficiencyRate))}%` 
                    }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                  <span className="font-medium">Cleared Repayments</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {emisCleared} EMI Payments Received
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-2.5 rounded-full transition-all duration-500 bg-emerald-500" 
                    style={{ width: emisCleared > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                <span className="font-medium">RBI Asset Classification</span>
                <span className={`font-bold ${isEmpty ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isEmpty ? '0 Accounts (No Active Exposure)' : `${activeLoans} Standard (SMA-0)`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`${isEmpty ? 'bg-slate-300 dark:bg-slate-700' : 'bg-emerald-500'} h-2.5 rounded-full transition-all duration-500`} 
                  style={{ width: isEmpty ? '0%' : '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Portfolio Sanction Summary Grid */}
        <div className="lg:col-span-2 crm-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                {isAdmin ? 'Portfolio Sanction Summary' : 'Branch Pipeline & Operational Status'}
              </h3>
            </div>
            <Link to="/loans" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1">
              <span>View All Accounts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center pt-1">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Active Sanctions</span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white mt-1 block">
                {activeLoans} Accounts
              </span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Average Tenure</span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white mt-1 block">
                {isEmpty ? 0 : avgTenure} Months
              </span>
            </div>
            
            {/* Third Metric: Admin gets Expected Interest Yield; Manager/Staff gets Pending Workflow Queue */}
            {isAdmin ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Expected Interest Yield</span>
                <span className="text-xl font-semibold text-teal-600 dark:text-teal-400 mt-1 block">
                  ₹{Math.ceil(expectedInterest).toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Sanction Action Queue</span>
                <span className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {pendingApprovals} Pending Review
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Loan Portfolio Activity Table */}
      <div className="crm-card overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              Recent Loan Sanctions & Applications
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live borrower onboarding and portfolio performance feed.
            </p>
          </div>
          <Link 
            to="/loans" 
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <span>Open Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3.5">Account Ref</th>
                <th className="py-2 px-3.5">Borrower Profile</th>
                <th className="py-2 px-3.5">Principal Amount</th>
                <th className="py-2 px-3.5">Monthly Installment</th>
                <th className="py-2 px-3.5">Outstanding Bal</th>
                <th className="py-2 px-3.5">Portfolio Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentLoans.length > 0 ? (
                recentLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3.5 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {loan.agreement_no || loan.loan_no}
                      </span>
                      {loan.customer_id && (
                        <span className="text-[10px] text-slate-400">CID: {loan.customer_id}</span>
                      )}
                    </td>
                    <td className="py-2 px-3.5">
                      <span className="font-bold uppercase text-slate-900 dark:text-white block">
                        {loan.customer_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">{loan.phone}</span>
                    </td>
                    <td className="py-2 px-3.5 font-bold text-slate-900 dark:text-white">
                      ₹{Math.ceil(parseFloat(loan.loan_amount || 0)).toLocaleString()}
                    </td>
                    <td className="py-2 px-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      ₹{Math.ceil(parseFloat(loan.emi_amount || 0)).toLocaleString()}
                    </td>
                    <td className="py-2 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                      ₹{Math.ceil(parseFloat(loan.remaining_balance || loan.total_payment || 0)).toLocaleString()}
                    </td>
                    <td className="py-2 px-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        loan.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : loan.status === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {loan.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Loans on File (Database Empty)</p>
                      <p className="text-[11px] text-slate-400">
                        There are currently zero active or pending loan accounts in the system.
                      </p>
                      <Link to="/loans" className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1">
                        <span>Go to Loan Application Directory &rarr;</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
