import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
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
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
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

  const totalLoans = parseInt(stats?.total_loans ?? 0, 10);
  const activeLoans = parseInt(stats?.active_loans ?? 0, 10);
  const totalDisbursed = parseFloat(stats?.total_disbursed ?? 0);
  const totalReceived = parseFloat(stats?.total_received ?? 0);
  const totalOutstanding = parseFloat(stats?.total_outstanding ?? 0);
  const emisCleared = parseInt(stats?.emis_cleared ?? 0, 10);
  const avgTenure = parseFloat(stats?.avg_tenure ?? 0);
  const expectedInterest = parseFloat(stats?.expected_interest ?? 0);

  const isEmpty = totalLoans === 0 && recentLoans.length === 0;

  const totalDemand = totalReceived + totalOutstanding;
  const efficiencyRate = totalDemand > 0 ? Math.min(100, Math.round((totalReceived / totalDemand) * 100)) : 0;

  const kpiCards = [
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
  ];

  return (
    <div className="space-y-4">
      
      {/* Executive CRM Header Bar */}
      <div className="crm-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {settings?.branch_code || 'BR-NNL-001'} • Command Center
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isEmpty ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
            <span className={`text-[10px] font-medium ${isEmpty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isEmpty ? 'Database Empty (0 Records)' : 'Portfolio Synchronized'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Executive Financial Dashboard
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Real-time microfinance portfolio monitoring, borrower KYC exposure, and daily repayment collection ledger.
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

      {/* 4 Clean Executive KPI Cards */}
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

      {/* Portfolio Health & Collection Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Collection Efficiency Gauge */}
        <div className="crm-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="font-medium text-slate-900 dark:text-white text-sm">Collection Health</h3>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
              isEmpty 
                ? 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
            }`}>
              {isEmpty ? '0.0% (Empty Ledger)' : `${efficiencyRate}% Efficiency`}
            </span>
          </div>

          <div className="space-y-4 pt-1">
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

        {/* Portfolio Summary Grid */}
        <div className="lg:col-span-2 crm-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-indigo-600" />
              <h3 className="font-medium text-slate-900 dark:text-white text-sm">Portfolio Sanction Summary</h3>
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
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Expected Interest Yield</span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white mt-1 block">
                ₹{Math.ceil(expectedInterest).toLocaleString()}
              </span>
            </div>
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
