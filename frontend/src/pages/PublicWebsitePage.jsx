import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Shield, 
  Calculator, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Mail, 
  Building2, 
  Users, 
  Send, 
  Search, 
  Sparkles, 
  Loader2, 
  LogIn,
  Award,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Zap,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  FileCheck,
  CheckCircle,
  Star,
  DollarSign,
  X,
  HelpCircle,
  Compass,
  Sun,
  Moon
} from 'lucide-react';

export default function PublicWebsitePage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { settings } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const maxLimit = parseInt(settings?.max_loan_limit || '200000', 10);

  // EMI Calculator State
  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcTenure, setCalcTenure] = useState(24);
  const [calcRate, setCalcRate] = useState(parseFloat(settings?.default_interest_rate || '14.5'));

  // Dynamically synchronize calculator interest rate and ceiling with Admin Settings
  useEffect(() => {
    if (settings?.default_interest_rate) {
      const parsed = parseFloat(settings.default_interest_rate);
      if (!isNaN(parsed) && parsed > 0) {
        setCalcRate(parsed);
      }
    }
  }, [settings?.default_interest_rate]);

  useEffect(() => {
    if (calcAmount > maxLimit) {
      setCalcAmount(maxLimit);
    }
  }, [maxLimit]);

  useEffect(() => {
    if (settings?.institution_name) {
      document.title = `${settings.institution_name} — Public Portal & Loan Calculator`;
    }
  }, [settings?.institution_name]);

  // Calculation Math with Round Off Increasing (Math.ceil) - zero paisa
  const monthlyRate = (calcRate / 12) / 100;
  const emi = Math.ceil(
    (calcAmount * monthlyRate * Math.pow(1 + monthlyRate, calcTenure)) /
    (Math.pow(1 + monthlyRate, calcTenure) - 1)
  );
  const totalPayable = Math.ceil(emi * calcTenure);
  const totalInterest = Math.max(0, totalPayable - calcAmount);
  const principalRatio = Math.round((calcAmount / totalPayable) * 100) || 70;

  // Application Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: settings?.city || '',
    amount: '100000',
    loan_type: 'Microfinance Loan',
    notes: ''
  });

  useEffect(() => {
    if (settings?.city && !formData.city) {
      setFormData(prev => ({ ...prev, city: settings.city }));
    }
  }, [settings?.city]);
  const [submitting, setSubmitting] = useState(false);
  const [inquiryResult, setInquiryResult] = useState(null);

  // Status Tracking State
  const [searchPhone, setSearchPhone] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [searchingStatus, setSearchingStatus] = useState(false);

  // Staff Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@microfinance.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const applyRef = useRef(null);
  const calculatorRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pre-fill calculator parameters into application form
  const handleUseCalculatedPlan = () => {
    setFormData(prev => ({
      ...prev,
      amount: calcAmount.toString(),
      notes: `Requested via loan calculator: ₹${calcAmount.toLocaleString()} for ${calcTenure} months tenure.`
    }));
    scrollToSection(applyRef);
  };

  // Submit Lead Application
  const handleOnlineApplication = async (e) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount || 0);
    if (amt < 1000 || amt > 200000) {
      alert('Microfinance Compliance: Requested loan amount must be between ₹1,00,0 and ₹2,00,000 (2 Lakhs maximum).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('leads', formData);
      if (res.success) {
        const refNo = `INQ-${Math.floor(10000 + Math.random() * 90000)}`;
        setInquiryResult({
          refNo,
          name: formData.name,
          phone: formData.phone,
          amount: formData.amount,
          type: formData.loan_type
        });
        setFormData({ name: '', phone: '', city: '', amount: '100000', loan_type: 'Microfinance Loan', notes: '' });
      }
    } catch (err) {
      alert(err.message || 'Failed to submit online application');
    } finally {
      setSubmitting(false);
    }
  };

  // Track Application Status
  const handleTrackStatus = async (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setSearchingStatus(true);
    setTrackingResult(null);
    try {
      const res = await api.get('leads');
      if (res.success && res.data.leads) {
        const found = res.data.leads.find((l) => l.phone.trim() === searchPhone.trim());
        setTrackingResult(found ? found : { notFound: true });
      } else {
        setTrackingResult({ notFound: true });
      }
    } catch (err) {
      setTrackingResult({ notFound: true });
    } finally {
      setSearchingStatus(false);
    }
  };

  // Handle Staff Login
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        setShowLoginModal(false);
        navigate('/');
      } else {
        setLoginError(res.message || 'Invalid staff credentials');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-600 selection:text-white relative overflow-hidden transition-colors duration-200"
    >
      {/* 1. TOP FLAT NAVIGATION BAR - High Performance & Crisp */}
      <header className="sticky top-0 z-50 px-3 sm:px-5 py-2.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-[1.5px] shadow-sm transition-transform group-hover:scale-105">
              <div className="h-full w-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">{settings.institution_name || 'Kaspr Group of Microfinance'}</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">NBFC MFI</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">Credit Up To ₹{maxLimit.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button onClick={() => scrollToSection(calculatorRef)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              Loan Calculator
            </button>
            <a href="#products" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              Loan Products
            </a>
            <a href="#tracking" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              Track Status
            </a>
            <button onClick={() => scrollToSection(applyRef)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              Apply Online
            </button>
          </nav>

          <div className="flex items-center space-x-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all cursor-pointer hover:border-emerald-500/50"
            >
              <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Officer Portal</span>
            </button>

            <button
              onClick={() => scrollToSection(applyRef)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <span>Instant Apply</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION - High-Performance Financial Overview */}
      <section className="relative pt-4 sm:pt-6 pb-8 sm:pb-10 px-3 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>RBI Regulated Microfinance Limit: Strictly Up to ₹{maxLimit.toLocaleString('en-IN')}</span>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Next-Generation <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                Microfinance Credit
              </span> <br />
              For Growing Ambitions
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Transparent, reducing-balance loans with <strong className="text-slate-900 dark:text-white">zero hidden charges</strong>, 100% paperless verification, and fast same-day bank account disbursement directly to rural and urban entrepreneurs.
            </p>

            {/* Micro Badges - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Max ₹{maxLimit.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">RBI Microfinance Limit</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
                <div className="flex items-center space-x-1.5 text-teal-600 dark:text-teal-400 font-bold text-xs sm:text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>15-Min Decision</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Rapid Digital Approval</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs col-span-2 sm:col-span-1">
                <div className="flex items-center space-x-1.5 text-cyan-600 dark:text-cyan-400 font-bold text-xs sm:text-sm">
                  <Award className="h-3.5 w-3.5" />
                  <span>Zero Collateral</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Guarantor Backed</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2.5 pt-1.5">
              <button
                onClick={() => scrollToSection(applyRef)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Apply for Loan Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => scrollToSection(calculatorRef)}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-white/15 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Estimate EMI</span>
              </button>
            </div>
          </div>

          {/* Right Column: Key Operational Performance Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl">
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">Verified Microfinance NBFC</h3>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{settings.city && settings.state ? `${settings.city}, ${settings.state} Operations` : (settings.tagline || 'Regional Operations')}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black border border-emerald-500/40">
                    LIVE
                  </span>
                </div>

                {/* Performance Metrics - Clean & Compact */}
                <div className="py-4 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Total Capital Disbursed</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white font-display mt-0.5">₹15,40,00,000+</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Active Borrowers</span>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-display mt-0.5">10,240+</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">Repayment Rate</span>
                      <p className="text-lg font-black text-teal-600 dark:text-teal-300 font-display mt-0.5">99.2%</p>
                    </div>
                  </div>
                </div>

                {/* Active Sanction Simulation */}
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-800 border border-emerald-300/80 dark:border-emerald-600/30 text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1.5">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-[11px]">Fast Sanction Protocol</span>
                    <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400">100% Transparent</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full w-[85%]" />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Direct payout into borrower bank account with printable official Statement of Account (SOA).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE LOAN CALCULATOR SECTION */}
      <section ref={calculatorRef} className="py-8 sm:py-10 px-3 sm:px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/10 relative">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
            <Calculator className="h-3 w-3" />
            <span>Interactive Financial Modeler</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Microfinance Loan EMI Calculator
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
            Adjust your desired loan amount and tenure. Calculations use standard reducing balance interest with zero hidden fee surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          
          {/* Controls Card */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              
              {/* Slider 1: Loan Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Loan Amount Required
                  </label>
                  <span className="font-display font-black text-xl text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    ₹{calcAmount.toLocaleString()}
                  </span>
                </div>

                <input
                  type="range"
                  min="5000"
                  max={maxLimit}
                  step="5000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseInt(e.target.value, 10))}
                  className="w-full slider-flat"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>Min: ₹5,000</span>
                  <span>₹50,000</span>
                  <span>₹1,00,000</span>
                  <span>Max Limit: ₹{maxLimit.toLocaleString()}</span>
                </div>

                {/* Quick Select Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[25000, 50000, 100000, 150000, maxLimit].filter((v, i, a) => v <= maxLimit && a.indexOf(v) === i).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcAmount(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        calcAmount === preset
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ₹{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: Tenure */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Repayment Tenure
                  </label>
                  <span className="font-display font-black text-xl text-teal-600 dark:text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                    {calcTenure} Months
                  </span>
                </div>

                <input
                  type="range"
                  min="6"
                  max="36"
                  step="6"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(parseInt(e.target.value, 10))}
                  className="w-full slider-flat"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>6 Months</span>
                  <span>12 Months</span>
                  <span>24 Months</span>
                  <span>36 Months</span>
                </div>
              </div>

              {/* Fixed Interest Rate Disclosure */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Annual Interest Rate</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Admin Benchmark Reducing Rate</p>
                </div>
                <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">{calcRate.toFixed(1)}% p.a.</span>
              </div>
            </div>
          </div>

          {/* Visual Output Display Card - Clean Flat FinTech */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl">
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-3.5">
                
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">
                    Calculated Monthly Installment
                  </span>
                  <h3 className="font-display font-black text-3xl text-slate-900 dark:text-white tracking-tight">
                    ₹{emi.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ mo</span>
                  </h3>
                </div>

                {/* Donut Visualization */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Principal Sanctioned</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{calcAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400">Total Interest Charge</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">₹{totalInterest.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Total Repayment</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">₹{totalPayable.toLocaleString()}</span>
                  </div>

                  {/* Ratio bar */}
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${principalRatio}%` }} 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title="Principal Ratio"
                    />
                    <div 
                      style={{ width: `${100 - principalRatio}%` }} 
                      className="bg-teal-400 h-full transition-all duration-300"
                      title="Interest Ratio"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    <span className="flex items-center"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" /> Principal ({principalRatio}%)</span>
                    <span className="flex items-center"><span className="h-1.5 w-1.5 rounded-full bg-teal-400 mr-1" /> Interest ({100 - principalRatio}%)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCalculatedPlan}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Apply with This Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT PORTFOLIO BENTO GRID SECTION */}
      <section id="products" className="py-8 sm:py-10 px-3 sm:px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px] font-bold">
            <Shield className="h-3 w-3" />
            <span>Targeted Micro-Financing</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Microfinance Loan Portfolio
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
            Specially structured credit facilities crafted for livelihood generation, women empowerment, and small village & township enterprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[
            {
              title: 'Women Empowerment',
              code: 'WE',
              limit: '₹2,00,000',
              amountNum: 200000,
              badge: 'Highest Limit',
              badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
              desc: 'Financial support for women entrepreneurs, self-help groups (SHG), boutique, tailoring, and trade.',
              highlights: ['No collateral needed', 'Flexible 24-month tenure', 'Joint liability group option']
            },
            {
              title: 'Animal Husbandry & Dairy',
              code: 'AH',
              limit: '₹1,50,000',
              amountNum: 150000,
              badge: 'Rural Growth',
              badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
              desc: 'Dedicated livestock loan for cow, buffalo, dairy shed construction, and fodder storage setup.',
              highlights: ['Quick livestock verification', 'Direct farm payout', 'Subsidized terms']
            },
            {
              title: 'Small Business / Kirana',
              code: 'SB',
              limit: '₹1,00,000',
              amountNum: 100000,
              badge: 'Working Capital',
              badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
              desc: 'Fast working capital for local shops, grocery stores, auto-rickshaw repairs, and artisans.',
              highlights: ['Daily cashflow friendly', 'Instant KYC check', 'Repeat loan top-up']
            },
            {
              title: 'Home Repair & Sanitation',
              code: 'HR',
              limit: '₹50,000',
              amountNum: 50000,
              badge: 'Community Need',
              badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
              desc: 'Affordable financing for roof repair, toilet installation, solar lighting, and home maintenance.',
              highlights: ['Minimal paperwork', '12-month tenure', 'Fast 24-hour disbursal']
            }
          ].map((prod) => (
            <div key={prod.code} className="h-full">
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col justify-between h-full group shadow-xs hover:shadow-md">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${prod.badgeColor}`}>
                      {prod.badge}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 font-bold">{prod.code}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {prod.title}
                  </h3>

                  <div className="mt-2 mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Maximum Limit</span>
                    <span className="font-display font-black text-xl text-emerald-600 dark:text-emerald-400">{prod.limit}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {prod.desc}
                  </p>

                  <ul className="space-y-1.5 mb-4">
                    {prod.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mr-1.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      amount: prod.amountNum.toString(),
                      loan_type: prod.title
                    }));
                    scrollToSection(applyRef);
                  }}
                  className="w-full py-2 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 dark:bg-slate-800 dark:hover:bg-emerald-600 dark:hover:text-white dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Quick Apply</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ONLINE APPLICATION & LIVE STATUS TRACKER - Compact */}
      <section ref={applyRef} className="py-8 sm:py-10 px-3 sm:px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          
          {/* Online Application Form */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 mb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Instant Digital Submission</span>
                  </div>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                    Apply Online for Microfinance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    No branch visits needed. A representative will contact you within 2 hours.
                  </p>
                </div>
              </div>

              {inquiryResult ? (
                <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h4 className="font-display font-black text-lg text-slate-900 dark:text-white">Application Received!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Thank you <strong className="text-slate-900 dark:text-white">{inquiryResult.name}</strong>. Your inquiry has been assigned Reference ID:
                  </p>
                  <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-wider inline-block">
                    {inquiryResult.refNo}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Our field officer will contact <span className="text-slate-900 dark:text-white font-bold">{inquiryResult.phone}</span> for quick KYC verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInquiryResult(null)}
                    className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                  >
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOnlineApplication} className="space-y-3 text-xs font-medium">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                        Applicant Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sunita Devi"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                        City / Village / District *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. ${settings.city || 'Narnaul'}, ${settings.state || 'Haryana'}`}
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                        Requested Amount (Max ₹{maxLimit.toLocaleString('en-IN')}) *
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max={maxLimit}
                        required
                        placeholder="e.g. 100000"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                      Remarks / Specific Need
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Describe purpose of loan..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Submit Free Loan Inquiry</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Live Status Tracker & Micro-FAQ */}
          <div id="tracking" className="lg:col-span-5 space-y-4">
            
            {/* Status Tracker Card */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center border border-teal-500/30">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">Live Application Tracker</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Check current verification & approval status</p>
                </div>
              </div>

              <form onSubmit={handleTrackStatus} className="flex space-x-2">
                <input
                  type="tel"
                  placeholder="Enter registered mobile no."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={searchingStatus}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer flex items-center space-x-1"
                >
                  {searchingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  <span>Search</span>
                </button>
              </form>

              {trackingResult && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
                  {trackingResult.notFound ? (
                    <div className="text-center py-1.5 text-rose-500 dark:text-rose-400 text-xs font-semibold">
                      No application found for this number. Please check the digits or submit a new inquiry.
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
                        <span className="font-bold text-slate-900 dark:text-white uppercase">{trackingResult.name}</span>
                        <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${
                          trackingResult.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                          trackingResult.status === 'Rejected' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        }`}>
                          {trackingResult.status || 'In Review'}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>Requested Amount:</span>
                        <span className="text-slate-900 dark:text-white font-bold">₹{parseFloat(trackingResult.amount || 50000).toLocaleString()}</span>
                      </div>

                      {/* 4-Step Timeline */}
                      <div className="pt-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Stage Progression</span>
                        <div className="flex items-center justify-between relative">
                          {['Applied', 'Verified', 'Sanctioned', 'Disbursed'].map((step, idx) => {
                            const isDone = trackingResult.status === 'Approved' ? idx <= 2 : idx === 0;
                            return (
                              <div key={step} className="flex flex-col items-center relative z-10">
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                  isDone ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Micro FAQ Trust Card */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center space-x-1.5 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                <HelpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Eligibility Requirements</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <li className="flex items-start">
                  <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">•</span>
                  <span>Indian citizen aged 18-65 years with valid Aadhaar and PAN.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">•</span>
                  <span>Active bank savings account in any nationalized or rural bank.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-bold">•</span>
                  <span>Household annual income aligned with RBI microfinance guidelines.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER - Compact */}
      <footer className="py-6 sm:py-8 px-3 sm:px-6 border-t border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-950/80 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-display font-black text-slate-900 dark:text-white text-sm sm:text-base">{settings.institution_name || 'Kaspr Group of Microfinance'}</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{settings.tagline || 'Regulated Microfinance Lending Service'} • Limit ₹{maxLimit.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{settings.phone}</span>
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{settings.email}</span>
              </a>
            )}
            <button onClick={() => setShowLoginModal(true)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              Staff Portal
            </button>
            <Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Login Page
            </Link>
          </div>
        </div>
      </footer>

      {/* 7. INTEGRATED STAFF LOGIN MODAL - Fast & Clean */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md">
            <div>
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-base text-slate-900 dark:text-white">{settings.institution_name || 'Staff Control Portal'}</h3>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Authorized Officer Access Only</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Toggle Theme"
                    >
                      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {loginError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/30 dark:border-rose-500/40 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleStaffLogin} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                      Staff Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@microfinance.com"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Demo Login Helper */}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@microfinance.com');
                      setLoginPassword('admin123');
                    }}
                    className="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ Fill Admin Demo Credentials (admin@microfinance.com)
                  </button>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {loginLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Sign In to Dashboard</span>
                  </button>
                </form>

                <div className="text-center pt-1.5">
                  <Link
                    to="/login"
                    onClick={() => setShowLoginModal(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    Or open full-screen login page →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
