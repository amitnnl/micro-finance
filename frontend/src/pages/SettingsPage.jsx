import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
 Settings, 
 Building2, 
 Phone, 
 Percent, 
 Printer, 
 Save, 
 CheckCircle2, 
 Loader2, 
 ShieldCheck, 
 HelpCircle,
 Sparkles,
 MapPin,
 Mail,
 FileText,
 AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { settings: globalSettings, refreshSettings, updateLocalSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('branding');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState(globalSettings || {
    institution_name: 'Microfinance Institution',
    tagline: 'Registered Non-Banking Financial Company (NBFC - MFI)',
    cin_number: 'U65929RJ2024NPL089123',
    branch_code: 'BR-001',
    phone: '+91 99910 95051',
    email: 'info@microfinance.com',
    address: 'Main Branch Office',
    city: 'Narnaul',
    state: 'Haryana',
    pincode: '123001',
    default_interest_rate: '14.5',
    default_processing_fee: '2.0',
    annual_penalty_rate: '24.0',
    default_penalty_rate: '0.0658',
    grace_period: '5',
    max_loan_limit: '200000',
    receipt_terms: 'All payments are non-refundable. Please keep this official receipt for future reference.',
    signatory_name: 'Authorized Signatory',
    signatory_title: 'Authorized Officer'
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync state initially from globalSettings ONCE
  useEffect(() => {
    if (!isLoaded && globalSettings && Object.keys(globalSettings).length > 0) {
      setSettings((prev) => ({ ...prev, ...globalSettings }));
      setIsLoaded(true);
    }
  }, [globalSettings, isLoaded]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('settings');
      if (res.success && res.data && res.data.settings) {
        if (!isDirty) {
          setSettings((prev) => ({ ...prev, ...res.data.settings }));
        }
        if (updateLocalSettings) {
          updateLocalSettings(res.data.settings);
        }
        setIsLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setIsDirty(true);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnnualPenaltyChange = (val) => {
    setIsDirty(true);
    const num = parseFloat(val);
    const daily = !isNaN(num) && num >= 0 ? (num / 365).toFixed(4) : '';
    setSettings((prev) => ({
      ...prev,
      annual_penalty_rate: val,
      default_penalty_rate: daily
    }));
  };

  const handleDailyPenaltyChange = (val) => {
    setIsDirty(true);
    const num = parseFloat(val);
    const annual = !isNaN(num) && num >= 0 ? (num * 365).toFixed(2) : '';
    setSettings((prev) => ({
      ...prev,
      default_penalty_rate: val,
      annual_penalty_rate: annual
    }));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMsg('');
    try {
      const res = await api.post('settings', settings);
      if (res.success) {
        const savedData = res.data?.settings || settings;
        setSavedSuccess(true);
        setSettings(savedData);
        setIsDirty(false);
        if (updateLocalSettings) {
          updateLocalSettings(savedData);
        }
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setErrorMsg(res.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setErrorMsg(err.message || 'Failed to save settings: Server Error');
    } finally {
      setSaving(false);
    }
  };

 const tabs = [
 { id: 'branding', label: 'Branding & Profile', icon: Building2 },
 { id: 'contact', label: 'Contact & Location', icon: Phone },
 { id: 'financial', label: 'Financial & Rates', icon: Percent },
 { id: 'receipt', label: 'SOA & Receipt Template', icon: Printer },
 ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="light-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-600">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              SYSTEM CONFIGURATION
            </span>
            <span className="inline-flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 space-x-1">
              <Sparkles className="h-3 w-3 text-emerald-600 fill-emerald-600" />
              <span className="text-[11px]">Real-Time Persistence</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Institution Settings & Customization</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Configure institution branding, contact details, loan interest parameters, and printable SOA letterheads.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="emerald-btn cursor-pointer whitespace-nowrap"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="bg-teal-50 border border-teal-300 text-teal-950 p-3 rounded-xl flex items-center space-x-2.5 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Institution customization settings saved successfully to system database!</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-950 p-3 rounded-xl flex items-center space-x-2.5 text-xs font-bold animate-fade-in shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Navigation & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3 space-y-2">
          <div className="light-card p-1.5 space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="light-card p-3 space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px]">RBAC Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Only authorized Administrators can update institution financial terms and letterhead parameters.
            </p>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSave} className="light-card p-4 sm:p-5 space-y-4">
            {/* 1. Branding & Profile Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Institution Branding & Profile</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define your institution legal entity name, tagline, registration number, and branch identity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Institution Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.institution_name}
                      onChange={(e) => handleChange('institution_name', e.target.value)}
                      placeholder="e.g. Microfinance Institution Ltd"
                      className="w-full light-input font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => handleChange('tagline', e.target.value)}
                      placeholder="e.g. State Highway No.11, Kailash Nagar, Narnaul-123001"
                      className="w-full light-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Registration / CIN Number
                    </label>
                    <input
                      type="text"
                      value={settings.cin_number}
                      onChange={(e) => handleChange('cin_number', e.target.value)}
                      placeholder="U65929RJ2024NPL089123"
                      className="w-full light-input font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Primary Branch Code
                    </label>
                    <input
                      type="text"
                      value={settings.branch_code}
                      onChange={(e) => handleChange('branch_code', e.target.value)}
                      placeholder="BR-JPR-001"
                      className="w-full light-input font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Contact & Location Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Contact & Location Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">These contact details will appear on official SOA vouchers, loan agreements, and customer receipts.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Official Mobile / Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={settings.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="9876543210"
                      className="w-full light-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Support Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="info@yourcompany.com"
                      className="w-full light-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                    Branch Office Address
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="State Highway No.11, Opp. KIA Show Room, Kailash Nagar"
                    className="w-full light-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={settings.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Jaipur"
                      className="w-full light-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={settings.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="Rajasthan"
                      className="w-full light-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={settings.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      placeholder="302011"
                      className="w-full light-input font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Financial & Interest Rates Tab */}
            {activeTab === 'financial' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Financial & Default Loan Parameters</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Default values used when generating new 6-step loan applications and itemized collection fee calculations.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Default Interest Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.default_interest_rate}
                      onChange={(e) => handleChange('default_interest_rate', e.target.value)}
                      placeholder="14.5"
                      className="w-full light-input font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Processing / Documentation Fee (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.default_processing_fee}
                      onChange={(e) => handleChange('default_processing_fee', e.target.value)}
                      placeholder="2.0"
                      className="w-full light-input font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Annual Penal Charge (% / Year - p.a.)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={settings.annual_penalty_rate ?? ''}
                        onChange={(e) => handleAnnualPenaltyChange(e.target.value)}
                        placeholder="24.0"
                        className="w-full light-input font-bold text-rose-600 dark:text-rose-400 pr-14"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">% p.a.</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Overdue penalty calculated per annum.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Penal Charge (% / Day)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.default_penalty_rate ?? ''}
                        onChange={(e) => handleDailyPenaltyChange(e.target.value)}
                        placeholder="0.0658"
                        className="w-full light-input font-bold pr-14"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-indigo-500 pointer-events-none">%/day</span>
                    </div>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                      = Annual ÷ 365 days
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      EMI Grace Period (Days)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={settings.grace_period}
                        onChange={(e) => handleChange('grace_period', e.target.value)}
                        placeholder="5"
                        className="w-full light-input pr-14"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 pointer-events-none">Days</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Days before penal charge applies.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Max Loan Limit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                      <input
                        type="number"
                        value={settings.max_loan_limit}
                        onChange={(e) => handleChange('max_loan_limit', e.target.value)}
                        placeholder="200000"
                        className="w-full light-input font-bold text-emerald-700 dark:text-emerald-400 pl-7"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Microfinance default threshold.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SOA & Receipt Template Tab */}
            {activeTab === 'receipt' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">SOA Voucher & Receipt Templates</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize authorized signatory lines and payment terms printed on official Statement of Account (SOA) vouchers.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Authorized Signatory Name
                    </label>
                    <input
                      type="text"
                      value={settings.signatory_name}
                      onChange={(e) => handleChange('signatory_name', e.target.value)}
                      placeholder="YOGENDER SINGH"
                      className="w-full light-input font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Signatory Designation / Title
                    </label>
                    <input
                      type="text"
                      value={settings.signatory_title}
                      onChange={(e) => handleChange('signatory_title', e.target.value)}
                      placeholder="Authorized Signatory"
                      className="w-full light-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
                    Receipt Footnote & Terms and Conditions
                  </label>
                  <textarea
                    rows="3"
                    value={settings.receipt_terms}
                    onChange={(e) => handleChange('receipt_terms', e.target.value)}
                    placeholder="All payments are non-refundable. Please keep this official receipt for future reference."
                    className="w-full light-input h-auto py-2 leading-relaxed"
                  ></textarea>
                </div>
              </div>
            )}

            {/* Submit Action Row */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="emerald-btn cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
