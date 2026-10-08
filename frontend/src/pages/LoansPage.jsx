import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { 
 FileText, 
 Plus, 
 Search, 
 Loader2, 
 X, 
 CheckCircle2, 
 User, 
 Users, 
 ShieldCheck, 
 DollarSign, 
 Briefcase, 
 Upload, 
 ArrowRight, 
 ArrowLeft,
 Check,
 Printer,
 Shield,
 FileCheck,
 Copy,
 Sparkles,
 Save,
 AlertTriangle,
 AlertCircle,
 ShieldAlert,
 ChevronDown,
 ChevronUp,
 History,
 Info,
 Calendar,
 Clock,
 Share2,
 QrCode,
 Download,
 UploadCloud,
 FileSpreadsheet,
 Eye,
 Trash2,
 Image as ImageIcon,
 Camera,
 ZoomIn,
 MapPin,
 Receipt,
 MessageCircle,
 Edit3,
 Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ActionDropdown from '../components/ActionDropdown';
import { lookupPincode } from '../services/pincodeService';

export default function LoansPage() {
  const { user, role, isAdmin, isManager, isStaff, permissions } = useAuth();
  const { settings } = useSettings();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showKfsModal, setShowKfsModal] = useState(false);
  const [selectedKfsLoan, setSelectedKfsLoan] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successLoanData, setSuccessLoanData] = useState(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [selectedAgreementLoan, setSelectedAgreementLoan] = useState(null);
  const [agreementModalTab, setAgreementModalTab] = useState('application'); // 'application' | 'sanction' | 'kfs' | 'agreement' | 'schedule' | 'disbursal'
  const [showAmortization, setShowAmortization] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [draftBanner, setDraftBanner] = useState(null);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // CSV Import & Export States
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvParsedRows, setCsvParsedRows] = useState([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvParseError, setCsvParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Auto PIN Code Lookup State
  const [pinLoading, setPinLoading] = useState({ borrower: false, co_applicant: false, guarantor: false });
  const [pinMsg, setPinMsg] = useState({ borrower: '', co_applicant: '', guarantor: '' });

  const handlePinCodeChange = async (party, value) => {
    const cleanPin = String(value || '').replace(/\D/g, '').slice(0, 6);

    if (party === 'borrower') {
      setFormData((prev) => ({ ...prev, pin_code: cleanPin }));
    } else if (party === 'co_applicant') {
      setFormData((prev) => ({ ...prev, co_applicant_pin: cleanPin }));
    } else if (party === 'guarantor') {
      setFormData((prev) => ({ ...prev, guarantor_pin: cleanPin }));
    }

    if (cleanPin.length === 6) {
      setPinLoading((prev) => ({ ...prev, [party]: true }));
      setPinMsg((prev) => ({ ...prev, [party]: '' }));

      try {
        const info = await lookupPincode(cleanPin);
        if (info && (info.district || info.state)) {
          setFormData((prev) => {
            const updated = { ...prev };
            if (party === 'borrower') {
              if (info.district) updated.district = info.district;
              if (info.state) updated.state = info.state;
            } else if (party === 'co_applicant') {
              if (info.district) updated.co_applicant_district = info.district;
              if (info.state) updated.co_applicant_state = info.state;
            } else if (party === 'guarantor') {
              if (info.district) updated.guarantor_district = info.district;
              if (info.state) updated.guarantor_state = info.state;
            }
            return updated;
          });
          setPinMsg((prev) => ({
            ...prev,
            [party]: `✓ Auto-picked: ${info.district ? info.district + ', ' : ''}${info.state}`
          }));
        } else {
          setPinMsg((prev) => ({
            ...prev,
            [party]: 'Location not recognized. Please fill City & State manually.'
          }));
        }
      } catch (err) {
        setPinMsg((prev) => ({
          ...prev,
          [party]: 'Unable to auto-detect location. Please fill manually.'
        }));
      } finally {
        setPinLoading((prev) => ({ ...prev, [party]: false }));
      }
    } else {
      setPinMsg((prev) => ({ ...prev, [party]: '' }));
    }
  };

  // RFC-4180 compliant CSV parser supporting quotes, commas, and linebreaks
  const parseCsvText = (text) => {
    if (!text || !text.trim()) return { headers: [], rows: [] };
    let clean = text;
    if (clean.charCodeAt(0) === 0xFEFF) {
      clean = clean.slice(1);
    }

    const lines = [];
    let curLine = '';
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i];
      const nc = clean[i + 1];
      if (c === '"') {
        if (inQuotes && nc === '"') {
          curLine += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
          curLine += '"';
        }
      } else if (c === '\r' && nc === '\n' && !inQuotes) {
        lines.push(curLine);
        curLine = '';
        i++;
      } else if ((c === '\n' || c === '\r') && !inQuotes) {
        lines.push(curLine);
        curLine = '';
      } else {
        curLine += c;
      }
    }
    if (curLine.trim()) lines.push(curLine);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line) => {
      const parts = [];
      let val = '';
      let inside = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        const nc = line[i + 1];
        if (c === '"') {
          if (inside && nc === '"') {
            val += '"';
            i++;
          } else {
            inside = !inside;
          }
        } else if (c === ',' && !inside) {
          parts.push(val.trim());
          val = '';
        } else {
          val += c;
        }
      }
      parts.push(val.trim());
      return parts;
    };

    const headerParts = parseLine(lines[0]);
    const headers = headerParts.map(h => h.replace(/^["']|["']$/g, '').trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const rowLine = lines[i].trim();
      if (!rowLine) continue;
      const values = parseLine(rowLine).map(v => v.replace(/^["']|["']$/g, '').trim());
      const row = {};
      headers.forEach((h, idx) => {
        const val = values[idx] !== undefined ? values[idx] : '';
        row[h] = val;
        const cleanK = h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (cleanK && row[cleanK] === undefined) {
          row[cleanK] = val;
        }
      });
      if (Object.values(row).some(v => v !== '')) {
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const handleProcessCsvFile = (file) => {
    if (!file || !file.name) return;
    if (!String(file.name).toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv') && !file.type.includes('excel')) {
      setCsvParseError('Please upload a valid CSV (.csv) file.');
      return;
    }
    setCsvFile(file);
    setCsvFileName(file.name);
    setCsvParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target.result;
        const { headers, rows } = parseCsvText(content);
        if (headers.length === 0 || rows.length === 0) {
          setCsvParseError('The uploaded CSV file contains no readable data rows or valid column headers.');
          setCsvParsedRows([]);
          setCsvPreviewRows([]);
          setCsvHeaders([]);
          return;
        }
        setCsvHeaders(headers);
        setCsvParsedRows(rows);
        setCsvPreviewRows(rows.slice(0, 5));
      } catch (err) {
        setCsvParseError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.onerror = () => {
      setCsvParseError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!isAdmin) {
      alert('Access denied. Only Administrators can import loan data.');
      return;
    }
    if (!csvParsedRows || csvParsedRows.length === 0) {
      setCsvParseError('No rows available to import. Please select a valid CSV file.');
      return;
    }
    setImporting(true);
    setCsvParseError(null);
    try {
      const res = await api.post('loans/import-csv', { rows: csvParsedRows });
      if (res.success) {
        setImportResult(res.data);
        fetchLoans();
      } else {
        setCsvParseError(res.message || 'Import failed. Please check the file formatting.');
      }
    } catch (err) {
      setCsvParseError(err.response?.data?.message || err.message || 'Error occurred while importing CSV data.');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = async () => {
    if (!isAdmin) {
      alert('Access denied. Only Administrators can export loan data.');
      return;
    }
    try {
      setExporting(true);
      const res = await api.get(`loans/export-csv?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}`, {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `Loan_Directory_Export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Failed to export loans CSV: ' + (err.message || 'Server error'));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSampleCsv = async () => {
    if (!isAdmin) {
      alert('Access denied. Only Administrators can download import templates.');
      return;
    }
    try {
      setDownloadingSample(true);
      const res = await api.get('loans/sample-csv', {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'loan_import_sample_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download sample error:', err);
      alert('Failed to download sample CSV template: ' + (err.message || 'Server error'));
    } finally {
      setDownloadingSample(false);
    }
  };

  const handleResetImportModal = () => {
    setCsvFile(null);
    setCsvFileName('');
    setCsvParsedRows([]);
    setCsvPreviewRows([]);
    setCsvHeaders([]);
    setCsvParseError(null);
    setImportResult(null);
  };

  // Document Verification and Re-apply Alert States
  const [docAlerts, setDocAlerts] = useState({
    applicant: null,
    co_applicant: null,
    guarantor: null
  });
  const [checkingDocs, setCheckingDocs] = useState({
    applicant: false,
    co_applicant: false,
    guarantor: false
  });
  const [dismissedAlerts, setDismissedAlerts] = useState({
    applicant: false,
    co_applicant: false,
    guarantor: false
  });
  const [expandedLoans, setExpandedLoans] = useState({
    applicant: false,
    co_applicant: false,
    guarantor: false
  });

  const checkRoleDocuments = async (role, docs) => {
    setCheckingDocs(prev => ({ ...prev, [role]: true }));
    try {
      const res = await api.post('loans/check-documents', {
        aadhaar: docs.aadhaar,
        pan: docs.pan,
        phone: docs.phone,
        role: role
      });
      if (res.success && res.data?.has_history) {
        setDocAlerts(prev => ({ ...prev, [role]: res.data }));
        setDismissedAlerts(prev => ({ ...prev, [role]: false }));
      } else {
        setDocAlerts(prev => ({ ...prev, [role]: null }));
      }
    } catch (err) {
      console.warn('Doc check error:', err);
    } finally {
      setCheckingDocs(prev => ({ ...prev, [role]: false }));
    }
  };

  const generateAmortizationSchedule = (principal, annualRate, tenureMonths, monthlyEmi) => {
    const P = parseFloat(principal || 0);
    const r = (parseFloat(annualRate || 0) / 12) / 100;
    const n = parseInt(tenureMonths || 0, 10);
    const E = parseFloat(monthlyEmi || 0);
    if (!P || !n || !E) return [];

    const schedule = [];
    let balance = P;
    const today = new Date();

    for (let i = 1; i <= n; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i);

      const interestPortion = Math.ceil(balance * r);
      let principalPortion = Math.ceil(E - interestPortion);
      if (i === n || principalPortion > balance) {
        principalPortion = balance;
      }
      balance = Math.max(0, balance - principalPortion);

      schedule.push({
        installment: i,
        dueDate: dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        emi: E,
        principal: principalPortion,
        interest: interestPortion,
        closingBalance: balance
      });

      if (balance <= 0) break;
    }
    return schedule;
  };

  // Safe date formatter for document audit trails
  const formatDocDate = (d, fallback = 'Pending') => {
    if (!d) return fallback;
    try {
      const s = String(d).split('T')[0].split(' ')[0];
      const parts = s.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return String(d) || fallback;
  };

  // Helper extracting all 4 required lifecycle milestone dates with safe fallback normalization
  const getLoanMilestones = (loan) => {
    if (!loan) {
      return {
        leadDate: 'N/A',
        applicationDate: 'N/A',
        approvalDate: 'Pending',
        disbursalDate: 'Pending',
        hasLead: false,
        hasApp: false,
        hasApproval: false,
        hasDisbursal: false
      };
    }
    const rawLead = loan.lead_date || loan.application_date || loan.created_at;
    const rawApp = loan.application_date || loan.created_at;
    const rawApproval = loan.approval_date || (loan.status === 'Approved' || loan.status === 'Active' ? (loan.approved_at || loan.created_at) : null);
    const rawDisbursal = loan.disbursement_date || (loan.status === 'Active' ? loan.start_date : null);

    return {
      leadDate: formatDocDate(rawLead, 'N/A'),
      applicationDate: formatDocDate(rawApp, 'N/A'),
      approvalDate: rawApproval ? formatDocDate(rawApproval) : (loan.status === 'Rejected' ? 'Rejected' : 'Pending Sanction'),
      disbursalDate: rawDisbursal ? formatDocDate(rawDisbursal) : (loan.status === 'Active' ? 'Disbursed' : 'Pending Disbursal'),
      hasLead: Boolean(rawLead),
      hasApp: Boolean(rawApp),
      hasApproval: Boolean(rawApproval || loan.status === 'Approved' || loan.status === 'Active'),
      hasDisbursal: Boolean(rawDisbursal || loan.status === 'Active'),
      rawLead,
      rawApp,
      rawApproval,
      rawDisbursal
    };
  };

  // Reusable 4-milestone audit strip rendered across all document types
  const renderLifecycleMilestoneStrip = (loan, currentStage = 'all') => {
    const m = getLoanMilestones(loan);

    const stages = [
      {
        id: 'lead',
        key: 'lead_date',
        num: '1',
        title: 'Lead Date',
        subtitle: 'Origination & Inquiry',
        date: m.leadDate,
        isCurrentDoc: currentStage === 'lead',
        status: m.hasLead ? 'Originated' : 'Pending',
        badgeColor: 'text-amber-800 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800'
      },
      {
        id: 'application',
        key: 'application_date',
        num: '2',
        title: 'Application Date',
        subtitle: '6-Step Dossier Filing',
        date: m.applicationDate,
        isCurrentDoc: currentStage === 'application',
        status: m.hasApp ? 'Filed' : 'Draft',
        badgeColor: 'text-blue-800 bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800'
      },
      {
        id: 'approval',
        key: 'approval_date',
        num: '3',
        title: 'Approval Date',
        subtitle: 'Sanction & Credit Approval',
        date: m.approvalDate,
        isCurrentDoc: currentStage === 'approval' || currentStage === 'sanction',
        status: m.hasApproval ? 'Sanctioned' : (loan?.status === 'Rejected' ? 'Rejected' : 'Under Review'),
        badgeColor: m.hasApproval 
          ? 'text-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800'
          : 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-300'
      },
      {
        id: 'disbursal',
        key: 'disbursal_date',
        num: '4',
        title: 'Disbursal Date',
        subtitle: 'Fund Remittance & Value Date',
        date: m.disbursalDate,
        isCurrentDoc: currentStage === 'disbursal',
        status: m.hasDisbursal ? 'Disbursed' : 'Awaiting Disbursal',
        badgeColor: m.hasDisbursal
          ? 'text-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
          : 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-300'
      }
    ];

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 bg-slate-50/70 dark:bg-slate-950/50 print:bg-white p-2.5 sm:p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 print:text-black uppercase tracking-wider">
          <span className="flex items-center space-x-1.5">
            <Calendar className="h-3.5 w-3.5 text-teal-600 print:text-black" />
            <span>Document Milestone Timeline & Audit Trail</span>
          </span>
          <span className="text-[10px] text-slate-400 print:text-slate-600 font-semibold lowercase">
            institutional compliance record
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stages.map((st) => (
            <div 
              key={st.id}
              className={`p-2 rounded-lg border text-left transition-all ${
                st.isCurrentDoc
                  ? 'bg-teal-50/90 dark:bg-teal-950/40 border-teal-500/70 ring-1 ring-teal-500/50 print:bg-slate-50 print:border-black'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 print:bg-white print:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9px] font-mono font-extrabold text-slate-400 print:text-slate-500">
                  STAGE #{st.num}
                </span>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${st.badgeColor} print:border-none print:bg-transparent print:text-black`}>
                  {st.status}
                </span>
              </div>
              <p className="text-[10px] font-extrabold uppercase text-slate-800 dark:text-slate-200 print:text-black leading-tight">
                {st.title}
              </p>
              <p className="text-[11px] font-black font-mono text-teal-700 dark:text-teal-400 print:text-black mt-0.5">
                {st.date}
              </p>
              <p className="text-[8.5px] text-slate-400 print:text-slate-600 leading-none mt-0.5 truncate">
                {st.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  // Audit and pending details verification helper for loan applications
  const getLoanPendingAudit = (loan) => {
    if (!loan) return { pendingMandatory: [], pendingOptional: [], filledMandatory: 0, totalMandatory: 17, percent: 100, isComplete: true };

    const mandatoryList = [
      { key: 'customer_name', label: 'Borrower Full Name', step: 'Step 1: Personal' },
      { key: 'father_husband_name', label: 'Father / Husband Name', step: 'Step 1: Personal' },
      { key: 'phone', label: 'Primary Mobile Number', step: 'Step 1: Personal' },
      { key: 'dob', label: 'Date of Birth', step: 'Step 1: Personal' },
      { key: 'gender', label: 'Gender', step: 'Step 1: Personal' },
      { key: 'aadhaar_number', label: 'Aadhaar Number', step: 'Step 1: Personal' },
      { key: 'pan_number', label: 'PAN Card Number', step: 'Step 1: Personal' },
      { key: 'address', label: 'Residential Address', step: 'Step 1: Personal' },
      { key: 'district', label: 'District', step: 'Step 1: Personal' },
      { key: 'state', label: 'State', step: 'Step 1: Personal' },
      { key: 'pin_code', label: 'PIN Code', step: 'Step 1: Personal' },
      { key: 'loan_amount', label: 'Sanctioned Loan Amount', step: 'Step 4: Loan Terms' },
      { key: 'tenure_months', label: 'Repayment Tenure', step: 'Step 4: Loan Terms' },
      { key: 'emi_amount', label: 'Monthly EMI Amount', step: 'Step 4: Loan Terms' },
      { key: 'bank_name', label: 'Disbursement Bank Name', step: 'Step 5: Banking' },
      { key: 'bank_account_no', label: 'Bank Account Number', step: 'Step 5: Banking' },
      { key: 'bank_ifsc', label: 'Bank IFSC Code', step: 'Step 5: Banking' },
    ];

    const optionalList = [
      { key: 'alternate_phone', label: 'Alternate Mobile Phone', step: 'Step 1: Personal' },
      { key: 'co_applicant_name', label: 'Co-Applicant Name', step: 'Step 2: Co-Applicant' },
      { key: 'co_applicant_aadhaar', label: 'Co-Applicant Aadhaar', step: 'Step 2: Co-Applicant' },
      { key: 'co_applicant_phone', label: 'Co-Applicant Phone', step: 'Step 2: Co-Applicant' },
      { key: 'guarantor_name', label: 'Guarantor Name', step: 'Step 3: Guarantor' },
      { key: 'guarantor_aadhaar', label: 'Guarantor Aadhaar', step: 'Step 3: Guarantor' },
      { key: 'guarantor_phone', label: 'Guarantor Phone', step: 'Step 3: Guarantor' },
      { key: 'occupation', label: 'Occupation / Trade', step: 'Step 5: Income' },
      { key: 'monthly_income_range', label: 'Monthly Income Range', step: 'Step 5: Income' },
      { key: 'bank_micr', label: 'Bank MICR Code', step: 'Step 5: Banking' },
      { key: 'account_holder_name', label: 'Account Holder Name', step: 'Step 5: Banking' },
      { key: 'reference_name', label: 'Personal Reference Name', step: 'Step 5: Reference' },
      { key: 'reference_phone', label: 'Reference Phone Number', step: 'Step 5: Reference' },
    ];

    const pendingMandatory = mandatoryList.filter(item => {
      const val = loan[item.key];
      return val === undefined || val === null || String(val).trim() === '' || String(val).trim() === '0';
    });

    const pendingOptional = optionalList.filter(item => {
      const val = loan[item.key];
      return val === undefined || val === null || String(val).trim() === '' || String(val).trim() === '0';
    });

    const totalMandatory = mandatoryList.length;
    const filledMandatory = totalMandatory - pendingMandatory.length;
    const percent = Math.round((filledMandatory / totalMandatory) * 100);

    return {
      pendingMandatory,
      pendingOptional,
      filledMandatory,
      totalMandatory,
      percent,
      isComplete: pendingMandatory.length === 0
    };
  };

  // Draft Persistence Handlers
  const checkDraft = () => {
    try {
      const saved = localStorage.getItem('microfin_loan_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) {
          setHasExistingDraft(true);
          return parsed;
        }
      }
    } catch (e) {}
    setHasExistingDraft(false);
    return null;
  };

  useEffect(() => {
    if (!editingLoanId) {
      checkDraft();
    } else {
      setHasExistingDraft(false);
    }
  }, [showModal, editingLoanId]);

  const handleSaveDraft = () => {
    try {
      const displayTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const draftPayload = {
        formData,
        currentStep,
        savedAt: new Date().toISOString(),
        displayTime
      };
      localStorage.setItem('microfin_loan_draft', JSON.stringify(draftPayload));
      setIsDraftSaved(true);
      setHasExistingDraft(false);
      setDraftBanner(`Progress saved as draft at ${displayTime} (Step ${currentStep})`);
      setTimeout(() => {
        setIsDraftSaved(false);
      }, 2500);
    } catch (e) {
      alert('Failed to save draft to browser storage');
    }
  };

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem('microfin_loan_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) {
          setFormData(parsed.formData);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          setDraftBanner(`Restored saved draft from ${parsed.displayTime || 'earlier session'}!`);
          setHasExistingDraft(false);
        }
      }
    } catch (e) {}
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('microfin_loan_draft');
    setHasExistingDraft(false);
    setDraftBanner(null);
  };

 // Disbursement State
 const [showDisburseModal, setShowDisburseModal] = useState(false);
 const [selectedDisburseLoan, setSelectedDisburseLoan] = useState(null);
 const [disbursementData, setDisbursementData] = useState({
   disbursement_date: new Date().toISOString().split('T')[0],
   payment_mode: 'Bank Transfer',
   reference_no: ''
 });
 const [disbursing, setDisbursing] = useState(false);

 // Approval & Rejection States
 const [showApproveModal, setShowApproveModal] = useState(false);
 const [selectedApproveLoan, setSelectedApproveLoan] = useState(null);
 const [approvalNotes, setApprovalNotes] = useState('');
 const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
 const [approving, setApproving] = useState(false);

 const [showRejectModal, setShowRejectModal] = useState(false);
 const [selectedRejectLoan, setSelectedRejectLoan] = useState(null);
 const [rejectReason, setRejectReason] = useState('');
 const [rejecting, setRejecting] = useState(false);

 // Disbursed Success Modal State
 const [showDisbursedSuccessModal, setShowDisbursedSuccessModal] = useState(false);
 const [disbursedSuccessLoan, setDisbursedSuccessLoan] = useState(null);

  // Step 6 Document Upload & Preview Lightbox State
  const [docMeta, setDocMeta] = useState({});
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);

  const documentConfigs = [
    {
      key: 'doc_aadhaar',
      tag: 'ID',
      title: 'Applicant Aadhaar Card',
      desc: 'Front & Back photo / PDF',
      badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    },
    {
      key: 'doc_pan',
      tag: 'PAN',
      title: 'Applicant PAN Card',
      desc: 'Clear front photo / PDF',
      badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    },
    {
      key: 'doc_photo',
      tag: 'PH',
      title: 'Passport Size Photo',
      desc: 'Recent applicant portrait',
      badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    },
    {
      key: 'doc_passbook',
      tag: 'BK',
      title: 'Bank Passbook / Cheque',
      desc: 'Account details & IFSC visible',
      badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    },
    {
      key: 'doc_address_proof',
      tag: 'AD',
      title: 'Current Address Proof',
      desc: 'Electricity / Water / Voter ID',
      badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    },
    {
      key: 'doc_co_aadhaar',
      tag: 'CA',
      title: 'Co-Applicant Aadhaar Card',
      desc: 'Optional if co-applicant nominated',
      badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    },
    {
      key: 'doc_guarantor_aadhaar',
      tag: 'GA',
      title: 'Guarantor Aadhaar Card',
      desc: 'Optional if guarantor nominated',
      badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    }
  ];

  const compressAndReadDocument = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);

      // If PDF, read directly as data URL
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ dataUrl: e.target.result, isPdf: true });
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      // If image, compress via HTML5 canvas to keep size compact and ultra-fast
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200; // Optimal for sharp reading of Aadhaar/PAN text

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ dataUrl: compressedUrl, isPdf: false });
          } catch (err) {
            resolve({ dataUrl: e.target.result, isPdf: false });
          }
        };
        img.onerror = () => resolve({ dataUrl: e.target.result, isPdf: false });
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDocumentUpload = async (docKey, file) => {
    if (!file) return;
    setUploadingDocKey(docKey);
    try {
      const result = await compressAndReadDocument(file);
      if (result?.dataUrl) {
        setFormData(prev => ({ ...prev, [docKey]: result.dataUrl }));
        setDocMeta(prev => ({
          ...prev,
          [docKey]: {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(1) + ' KB',
            isPdf: result.isPdf,
            uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        }));
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to process document file. Please try another image or PDF.');
    } finally {
      setUploadingDocKey(null);
    }
  };

  const handleRemoveDocument = (docKey, e) => {
    if (e) e.stopPropagation();
    setFormData(prev => ({ ...prev, [docKey]: '' }));
    setDocMeta(prev => {
      const copy = { ...prev };
      delete copy[docKey];
      return copy;
    });
  };

  // Clean Form State Definition
  const emptyFormData = {
    // Step 1: Personal
    customer_name: '',
    father_husband_name: '',
    phone: '',
    alternate_phone: '',
    dob: '',
    gender: 'Male',
    aadhaar_number: '',
    pan_number: '',
    address: '',
    district: '',
    state: 'Haryana',
    pin_code: '',

    // Step 2: Co-Applicant
    co_applicant_name: '',
    co_applicant_father_husband: '',
    co_applicant_phone: '',
    co_applicant_dob: '',
    co_applicant_gender: 'Male',
    co_applicant_aadhaar: '',
    co_applicant_pan: '',
    co_applicant_address: '',
    co_applicant_district: '',
    co_applicant_state: 'Haryana',
    co_applicant_pin: '',

    // Step 3: Guarantor
    guarantor_name: '',
    guarantor_father_husband: '',
    guarantor_phone: '',
    guarantor_dob: '',
    guarantor_gender: 'Male',
    guarantor_aadhaar: '',
    guarantor_pan: '',
    guarantor_address: '',
    guarantor_district: '',
    guarantor_state: 'Haryana',
    guarantor_pin: '',

    // Step 4: Loan Details & Repayment Terms
    lead_date: new Date().toISOString().split('T')[0],
    application_date: new Date().toISOString().split('T')[0],
    loan_purpose_code: 'MICRO',
    loan_purpose_title: 'Microfinance Loan',
    loan_amount: '50000',
    interest_rate: settings?.default_interest_rate || '14.5',
    tenure_months: '24',

    // Step 5: Income & Employment
    employment_type: 'Salaried',
    occupation: '',
    monthly_income_range: 'Rs. 5,000 - Rs. 15,000',
    earning_members: '1',
    bank_account_no: '',
    bank_ifsc: '',
    bank_micr: '',
    bank_name: '',
    account_holder_name: '',
    reference_name: '',
    reference_phone: '',
    reference_relation: '',

    // Step 6: Documents & Consent
    doc_aadhaar: '',
    doc_pan: '',
    doc_photo: '',
    doc_passbook: '',
    doc_address_proof: '',
    doc_co_aadhaar: '',
    doc_guarantor_aadhaar: '',
    terms_accepted: false,
    additional_notes: '',
    lead_id: null
  };

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    if (settings?.default_interest_rate && !formData.interest_rate) {
      setFormData(prev => ({ ...prev, interest_rate: settings.default_interest_rate }));
    }
  }, [settings?.default_interest_rate]);



  useEffect(() => {
    if (location.state && location.state.prefillLead) {
      const lead = location.state.prefillLead;
      const amountVal = Math.min(200000, parseFloat(lead.amount || 50000)).toString();
      const rawLeadDate = lead.lead_date || (lead.created_at ? lead.created_at.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0]);
      setFormData(prev => ({
        ...prev,
        lead_id: lead.id || lead.lead_id || lead.appointment_id || null,
        customer_name: lead.name || prev.customer_name,
        phone: lead.phone || prev.phone,
        loan_amount: amountVal,
        address: lead.city || prev.address,
        aadhaar_number: lead.aadhaar || prev.aadhaar_number,
        lead_date: rawLeadDate,
        application_date: new Date().toISOString().split('T')[0],
        reference_name: lead.reference_name || prev.reference_name
      }));
      setEditingLoanId(null);
      setShowModal(true);
      setCurrentStep(1);
      // Clear the state so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleOpenCreateModal = () => {
    setEditingLoanId(null);
    setFormData(emptyFormData);
    setDocMeta({});
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleOpenEditModal = (loan) => {
    if (!loan) return;
    if (loan.status === 'Approved' || loan.status === 'Active' || loan.status === 'Closed') {
      alert(`This loan application is formally ${loan.status} and cannot be edited. Approved and active records are legally locked.`);
      return;
    }

    setEditingLoanId(loan.id);
    setFormData({
      ...emptyFormData,
      customer_name: loan.customer_name || '',
      father_husband_name: loan.father_husband_name || '',
      phone: loan.phone || '',
      alternate_phone: loan.alternate_phone || '',
      dob: loan.dob || '',
      gender: loan.gender || 'Male',
      aadhaar_number: loan.aadhaar_number || '',
      pan_number: loan.pan_number || '',
      address: loan.address || '',
      district: loan.district || '',
      state: loan.state || 'Haryana',
      pin_code: loan.pin_code || '',

      co_applicant_name: loan.co_applicant_name || '',
      co_applicant_father_husband: loan.co_applicant_father_husband || '',
      co_applicant_phone: loan.co_applicant_phone || '',
      co_applicant_dob: loan.co_applicant_dob || '',
      co_applicant_gender: loan.co_applicant_gender || 'Male',
      co_applicant_aadhaar: loan.co_applicant_aadhaar || '',
      co_applicant_pan: loan.co_applicant_pan || '',
      co_applicant_address: loan.co_applicant_address || '',
      co_applicant_district: loan.co_applicant_district || '',
      co_applicant_state: loan.co_applicant_state || 'Haryana',
      co_applicant_pin: loan.co_applicant_pin || '',

      guarantor_name: loan.guarantor_name || '',
      guarantor_father_husband: loan.guarantor_father_husband || '',
      guarantor_phone: loan.guarantor_phone || '',
      guarantor_dob: loan.guarantor_dob || '',
      guarantor_gender: loan.guarantor_gender || 'Male',
      guarantor_aadhaar: loan.guarantor_aadhaar || '',
      guarantor_pan: loan.guarantor_pan || '',
      guarantor_address: loan.guarantor_address || '',
      guarantor_district: loan.guarantor_district || '',
      guarantor_state: loan.guarantor_state || 'Haryana',
      guarantor_pin: loan.guarantor_pin || '',

      lead_date: loan.lead_date || (loan.created_at ? loan.created_at.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0]),
      application_date: loan.application_date || (loan.created_at ? loan.created_at.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0]),
      loan_purpose_code: loan.loan_purpose_code || 'MICRO',
      loan_purpose_title: loan.loan_purpose_title || 'Microfinance Loan',
      loan_amount: loan.loan_amount ? Math.ceil(parseFloat(loan.loan_amount)).toString() : '50000',
      interest_rate: loan.interest_rate ? parseFloat(loan.interest_rate).toString() : '14.5',
      tenure_months: loan.tenure_months ? parseInt(loan.tenure_months).toString() : '24',

      employment_type: loan.employment_type || 'Salaried',
      occupation: loan.occupation || '',
      monthly_income_range: loan.monthly_income_range || 'Rs. 5,000 - Rs. 15,000',
      earning_members: loan.earning_members?.toString() || '1',
      bank_account_no: loan.bank_account_no || '',
      bank_ifsc: loan.bank_ifsc || '',
      bank_micr: loan.bank_micr || '',
      bank_name: loan.bank_name || '',
      account_holder_name: loan.account_holder_name || loan.customer_name || '',
      reference_name: loan.reference_name || '',
      reference_phone: loan.reference_phone || '',
      reference_relation: loan.reference_relation || '',

      doc_aadhaar: loan.doc_aadhaar || '',
      doc_pan: loan.doc_pan || '',
      doc_photo: loan.doc_photo || '',
      doc_passbook: loan.doc_passbook || '',
      doc_address_proof: loan.doc_address_proof || '',
      doc_co_aadhaar: loan.doc_co_aadhaar || '',
      doc_guarantor_aadhaar: loan.doc_guarantor_aadhaar || '',
      terms_accepted: true,
      additional_notes: loan.additional_notes || '',
      lead_id: loan.lead_id || null,
      loan_no: loan.loan_no || '',
      agreement_no: loan.agreement_no || ''
    });
    setDocMeta({});
    setCurrentStep(1);
    setShowModal(true);
  };

  const fetchLoans = async () => {
 setLoading(true);
 try {
 const res = await api.get(`loans?status=${statusFilter}&search=${search}`);
 if (res.success) setLoans(res.data.loans || []);
 } catch (err) {
 console.error('Failed to fetch loans:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchLoans();
 }, [statusFilter, search]);

  // Debounced KYC Document Verification for Step 1 (Applicant)
  useEffect(() => {
    const timer = setTimeout(() => {
      const a = (formData.aadhaar_number || '').replace(/\D/g, '');
      const p = (formData.pan_number || '').trim();
      const ph = (formData.phone || '').replace(/\D/g, '');
      if (a.length >= 10 || p.length >= 8 || ph.length === 10) {
        checkRoleDocuments('applicant', {
          aadhaar: formData.aadhaar_number,
          pan: formData.pan_number,
          phone: formData.phone
        });
      } else {
        setDocAlerts(prev => ({ ...prev, applicant: null }));
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [formData.aadhaar_number, formData.pan_number, formData.phone]);

  // Debounced KYC Document Verification for Step 2 (Co-Applicant)
  useEffect(() => {
    const timer = setTimeout(() => {
      const a = (formData.co_applicant_aadhaar || '').replace(/\D/g, '');
      const p = (formData.co_applicant_pan || '').trim();
      const ph = (formData.co_applicant_phone || '').replace(/\D/g, '');
      if (a.length >= 10 || p.length >= 8 || ph.length === 10) {
        checkRoleDocuments('co_applicant', {
          aadhaar: formData.co_applicant_aadhaar,
          pan: formData.co_applicant_pan,
          phone: formData.co_applicant_phone
        });
      } else {
        setDocAlerts(prev => ({ ...prev, co_applicant: null }));
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [formData.co_applicant_aadhaar, formData.co_applicant_pan, formData.co_applicant_phone]);

  // Debounced KYC Document Verification for Step 3 (Guarantor)
  useEffect(() => {
    const timer = setTimeout(() => {
      const a = (formData.guarantor_aadhaar || '').replace(/\D/g, '');
      const p = (formData.guarantor_pan || '').trim();
      const ph = (formData.guarantor_phone || '').replace(/\D/g, '');
      if (a.length >= 10 || p.length >= 8 || ph.length === 10) {
        checkRoleDocuments('guarantor', {
          aadhaar: formData.guarantor_aadhaar,
          pan: formData.guarantor_pan,
          phone: formData.guarantor_phone
        });
      } else {
        setDocAlerts(prev => ({ ...prev, guarantor: null }));
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [formData.guarantor_aadhaar, formData.guarantor_pan, formData.guarantor_phone]);

  const renderDocumentAlert = (role, titleLabel) => {
    const alert = docAlerts[role];
    const isChecking = checkingDocs[role];
    const isDismissed = dismissedAlerts[role];
    const isExpanded = expandedLoans[role];

    if (isChecking) {
      return (
        <div className="flex items-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
          <span>Scanning NBFC portfolio records for {titleLabel} KYC documents...</span>
        </div>
      );
    }

    if (!alert || isDismissed) return null;

    const isDefault = alert.risk_level === 'DEFAULT_RISK';
    const isActiveExposure = alert.risk_level === 'ACTIVE_EXPOSURE';

    const bgStyles = isDefault
      ? 'bg-rose-50/95 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
      : isActiveExposure
      ? 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
      : 'bg-emerald-50/95 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';

    const badgeStyles = isDefault
      ? 'bg-rose-600 text-white'
      : isActiveExposure
      ? 'bg-amber-600 text-white'
      : 'bg-emerald-600 text-white';

    const icon = isDefault ? (
      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
    ) : isActiveExposure ? (
      <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
    ) : (
      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
    );

    const headingText = isDefault
      ? 'CRITICAL RISK: Previous Default or Written-Off Record Found!'
      : isActiveExposure
      ? `EXPOSURE NOTICE: Existing Active Loan Found (Outstanding: ₹${Number(alert.total_outstanding).toLocaleString()})`
      : 'VERIFIED HISTORY: Existing Customer in Good Standing';

    return (
      <div className={`p-3.5 rounded-xl border shadow-xs transition-all animate-in fade-in duration-200 ${bgStyles}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">{icon}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs uppercase tracking-wider">{headingText}</span>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${badgeStyles}`}>
                  {alert.risk_level.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed opacity-95">
                Matched via <strong>{alert.matched_fields?.join(', ')}</strong> across NBFC database. Found <strong>{alert.total_loans}</strong> previous loan record(s).
              </p>
              {alert.cross_role_warning && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-[11px] font-semibold mt-1">
                  <span>ℹ️</span>
                  <span>{alert.cross_role_warning}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedAlerts(prev => ({ ...prev, [role]: true }))}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
            title="Acknowledge & dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {alert.loans && alert.loans.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setExpandedLoans(prev => ({ ...prev, [role]: !isExpanded }))}
              className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <span>{isExpanded ? 'Hide' : 'Inspect'} {alert.loans.length} Associated Loan Record(s)</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                {alert.loans.map((ln, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {ln.loan_no}
                        </span>
                        {ln.agreement_no && (
                          <span className="text-[10px] text-slate-500 font-mono">({ln.agreement_no})</span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Role: {ln.matched_role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Borrower: <strong>{ln.customer_name}</strong> • Disbursed: {ln.disbursement_date || ln.created_at?.split(' ')[0] || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        ln.status === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                        ln.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {ln.status}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                        Bal: ₹{parseFloat(ln.remaining_balance || 0).toLocaleString()} / ₹{parseFloat(ln.loan_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

 // Financial Math Calculation
 const principal = Math.ceil(parseFloat(formData.loan_amount || 0));
 const rate = parseFloat(formData.interest_rate || 35);
 const months = parseInt(formData.tenure_months || 24, 10);

 let calculatedEmi = 0;
 if (principal > 0 && rate > 0 && months > 0) {
 const monthlyRate = (rate / 12) / 100;
 calculatedEmi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
 calculatedEmi = Math.ceil(calculatedEmi);
 }
 const totalPayment = Math.ceil(calculatedEmi * months);
 const interestAmount = Math.max(0, totalPayment - principal);

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.customer_name?.trim()) return "Applicant Full Name is mandatory (Step 1).";
      if (!formData.father_husband_name?.trim()) return "Father / Husband Name is mandatory (Step 1).";
      if (!formData.phone?.trim()) return "Primary Mobile Number is mandatory (Step 1).";
      // Note: Alternate Number is optional
      if (!formData.dob?.trim()) return "Applicant Date of Birth is mandatory (Step 1).";
      if (!formData.gender?.trim()) return "Gender selection is mandatory (Step 1).";
      if (!formData.aadhaar_number?.trim()) return "Aadhaar Card Number is mandatory (Step 1).";
      if (!formData.pan_number?.trim()) return "PAN Card Number is mandatory (Step 1).";
      if (!formData.address?.trim()) return "Current / Permanent Address is mandatory (Step 1).";
      if (!formData.district?.trim()) return "District is mandatory (Step 1).";
      if (!formData.state?.trim()) return "State is mandatory (Step 1).";
      if (!formData.pin_code?.trim()) return "PIN Code is mandatory (Step 1).";
      return null;
    }
    if (step === 2) {
      // Co-Applicant is optional - can be skipped for individual borrowers
      return null;
    }
    if (step === 3) {
      // Guarantor is optional - can be skipped when not required
      return null;
    }
    if (step === 4) {
      const amt = parseFloat(formData.loan_amount || 0);
      if (amt < 1000 || amt > 200000) {
        return "Microfinance Compliance: Loan amount must be between ₹1,000 and ₹2,00,000 (2 Lakhs maximum) (Step 4).";
      }
      if (!formData.interest_rate || parseFloat(formData.interest_rate) <= 0) {
        return "Annual Interest Rate is mandatory (Step 4).";
      }
      if (!formData.tenure_months || parseInt(formData.tenure_months, 10) <= 0) {
        return "Loan Tenure (months) is mandatory (Step 4).";
      }
      return null;
    }
    if (step === 5) {
      if (!formData.employment_type?.trim()) return "Employment Type is mandatory (Step 5).";
      if (!formData.bank_name?.trim()) return "Bank Name is mandatory (Step 5).";
      if (!formData.bank_account_no?.trim()) return "Bank Account Number is mandatory (Step 5).";
      if (!formData.bank_ifsc?.trim()) return "Bank IFSC Code is mandatory (Step 5).";
      return null;
    }
    if (step === 6) {
      if (!formData.terms_accepted) {
        return "You must accept the Loan Agreement, Terms & Declarations to complete the application (Step 6).";
      }
      if (!formData.additional_notes?.trim()) {
        return "Field Verification / Officer Remark Notes are mandatory (Step 6).";
      }
      return null;
    }
    return null;
  };

  const handleNextStep = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }
    setCurrentStep(prev => Math.min(6, prev + 1));
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (currentStep < 6) {
      handleNextStep();
      return;
    }
    for (let s = 1; s <= 6; s++) {
      const err = validateStep(s);
      if (err) {
        alert(err);
        setCurrentStep(s);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        lead_date: formData.lead_date || new Date().toISOString().split('T')[0],
        application_date: formData.application_date || new Date().toISOString().split('T')[0],
        loan_purpose_code: formData.loan_purpose_code || 'MICRO',
        loan_purpose_title: formData.loan_purpose_title || 'Microfinance Loan',
        account_holder_name: formData.account_holder_name?.trim() || formData.customer_name
      };

      if (editingLoanId) {
        payload.id = editingLoanId;
        const res = await api.put('loans', payload);
        if (res.success) {
          setShowModal(false);
          setEditingLoanId(null);
          setFormData(emptyFormData);
          setDocMeta({});
          fetchLoans();
          alert('Loan Application #' + (res.data?.loan?.agreement_no || res.data?.loan?.loan_no || formData.loan_no || '') + ' updated successfully.');
        } else {
          alert(res.message || 'Error updating loan application');
        }
        return;
      }

      const res = await api.post('loans', payload);
      if (res.success) {
        if (formData.lead_id) {
          try {
            await api.put('appointments/status', { id: formData.lead_id, status: 'Approved' });
          } catch (e) {
            console.error('Failed to update lead status upon loan confirmation:', e);
          }
        }
        setShowModal(false);
        setCurrentStep(1);
        const createdLoanData = {
          id: res.data?.id,
          loan_no: res.data?.loan_no,
          customer_id: res.data?.customer_id,
          agreement_no: res.data?.agreement_no,
          customer_name: formData.customer_name,
          father_husband_name: formData.father_husband_name,
          phone: formData.phone,
          alternate_phone: formData.alternate_phone,
          dob: formData.dob,
          gender: formData.gender,
          aadhaar_number: formData.aadhaar_number,
          pan_number: formData.pan_number,
          address: formData.address,
          district: formData.district,
          state: formData.state,
          pin_code: formData.pin_code,
          co_applicant_name: formData.co_applicant_name,
          co_applicant_father_husband: formData.co_applicant_father_husband,
          co_applicant_phone: formData.co_applicant_phone,
          co_applicant_aadhaar: formData.co_applicant_aadhaar,
          co_applicant_pan: formData.co_applicant_pan,
          guarantor_name: formData.guarantor_name,
          guarantor_father_husband: formData.guarantor_father_husband,
          guarantor_phone: formData.guarantor_phone,
          guarantor_aadhaar: formData.guarantor_aadhaar,
          guarantor_pan: formData.guarantor_pan,
          lead_date: formData.lead_date || new Date().toISOString().split('T')[0],
          application_date: formData.application_date || new Date().toISOString().split('T')[0],
          loan_purpose_code: formData.loan_purpose_code,
          loan_purpose_title: formData.loan_purpose_title,
          loan_amount: formData.loan_amount,
          interest_rate: formData.interest_rate,
          tenure_months: formData.tenure_months,
          emi_amount: res.data?.emi_amount || calculatedEmi,
          total_payment: res.data?.total_payment || totalPayment,
          interest_amount: res.data?.interest_amount || interestAmount,
          bank_name: formData.bank_name,
          bank_account_no: formData.bank_account_no,
          bank_ifsc: formData.bank_ifsc,
          bank_micr: formData.bank_micr,
          account_holder_name: formData.account_holder_name,
          status: res.data?.status || 'Pending Approval',
          created_at: new Date().toISOString(),
          doc_aadhaar: formData.doc_aadhaar,
          doc_pan: formData.doc_pan,
          doc_photo: formData.doc_photo,
          doc_passbook: formData.doc_passbook,
          doc_address_proof: formData.doc_address_proof,
          doc_co_aadhaar: formData.doc_co_aadhaar,
          doc_guarantor_aadhaar: formData.doc_guarantor_aadhaar
        };
        setFormData(emptyFormData);
        setDocMeta({});
        localStorage.removeItem('microfin_loan_draft');
        setHasExistingDraft(false);
        setDraftBanner(null);
        fetchLoans();

        // Launch Application Submitted & Sent for Approval Screen
        setSuccessLoanData(createdLoanData);
        setShowSuccessModal(true);
      }
    } catch (err) {
      alert(err.message || 'Error creating loan application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLoan = async (e) => {
    if (e) e.preventDefault();
    if (!selectedApproveLoan) return;
    if (!isAdmin && !isManager) {
      alert('Access denied. Only Branch Managers or Administrators can approve loan applications.');
      return;
    }
    setApproving(true);
    try {
      const res = await api.post('loans/approve', {
        id: selectedApproveLoan.id,
        approval_date: approvalDate || new Date().toISOString().split('T')[0],
        notes: approvalNotes || (isManager ? 'Sanctioned by Branch Manager' : 'Sanctioned by Administrator')
      });
      if (res.success) {
        setShowApproveModal(false);
        setSelectedApproveLoan(null);
        setApprovalNotes('');
        fetchLoans();
      }
    } catch (err) {
      alert(err.message || 'Error approving loan application');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectLoan = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRejectLoan) return;
    if (!isAdmin && !isManager) {
      alert('Access denied. Only Branch Managers or Administrators can reject loan applications.');
      return;
    }
    setRejecting(true);
    try {
      const res = await api.post('loans/reject', {
        id: selectedRejectLoan.id,
        reason: rejectReason || (isManager ? 'Application rejected by Branch Manager' : 'Application rejected by Administrator')
      });
      if (res.success) {
        setShowRejectModal(false);
        setSelectedRejectLoan(null);
        setRejectReason('');
        fetchLoans();
      }
    } catch (err) {
      alert(err.message || 'Error rejecting loan application');
    } finally {
      setRejecting(false);
    }
  };

 const handleDisburse = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access denied. Only System Administrators can disburse loan capital.');
      return;
    }
    setDisbursing(true);
    try {
      const payload = {
        id: selectedDisburseLoan.id,
        date: disbursementData.disbursement_date,
        mode: disbursementData.payment_mode,
        reference_no: disbursementData.reference_no,
        notes: disbursementData.reference_no ? `Ref/UTR: ${disbursementData.reference_no}` : ''
      };
      const res = await api.post('loans/disburse', payload);
      if (res.success) {
        const enrichedLoan = {
          ...selectedDisburseLoan,
          disbursement_date: disbursementData.disbursement_date,
          payment_mode: disbursementData.payment_mode,
          disbursement_mode: disbursementData.payment_mode,
          reference_no: disbursementData.reference_no,
          disbursement_reference: disbursementData.reference_no,
          status: 'Active'
        };
        setShowDisburseModal(false);
        setDisbursedSuccessLoan(enrichedLoan);
        setShowDisbursedSuccessModal(true);
        fetchLoans();
      }
    } catch (err) {
      alert(err.message || 'Error disbursing loan');
    } finally {
      setDisbursing(false);
    }
  };

  const handleSendDisbursalWhatsApp = (loan) => {
    if (!loan) return;
    const rawPhone = loan.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const instName = settings?.institution_name || 'Microfinance Institution';
    const lines = [
      `*${instName.toUpperCase()}*`,
      `*OFFICIAL LOAN DISBURSEMENT ADVICE*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${(loan.customer_name || '').toUpperCase()}*,`,
      `Your microfinance loan application has been approved and funds disbursed directly to your bank account.`,
      ``,
      `📋 *Official Agreement No:* ${loan.agreement_no || loan.loan_no}`,
      `🆔 *Customer ID (CIF):* ${loan.customer_id || 'CUST-N/A'}`,
      `💰 *Disbursed Capital:* Rs. ${parseFloat(loan.loan_amount || 0).toLocaleString()}`,
      `📅 *Disbursal Date:* ${loan.disbursement_date || new Date().toISOString().split('T')[0]}`,
      `🏦 *Payment Mode:* ${loan.payment_mode || loan.disbursement_mode || 'Bank Transfer'}`,
      `🧾 *UTR / Reference:* ${loan.reference_no || loan.disbursement_reference || 'DIRECT-CREDIT'}`,
      `💳 *Monthly EMI:* Rs. ${parseFloat(loan.emi_amount || 0).toLocaleString()} / month`,
      `🗓️ *Tenure:* ${loan.tenure_months || 24} Months`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `⚠️ *Important:* Please quote your Customer ID and Agreement No for all future repayments, queries, and NOC clearances.`,
      ``,
      `_Official notification from ${instName}._`
    ];
    const message = lines.join('\n');
    const url = cleanPhone 
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

 const steps = [
 { num: 1, label: 'Personal', icon: User },
 { num: 2, label: 'Co-Applicant (Optional)', icon: Users },
 { num: 3, label: 'Guarantor (Optional)', icon: ShieldCheck },
 { num: 4, label: 'Loan Details', icon: DollarSign },
 { num: 5, label: 'Income Details', icon: Briefcase },
 { num: 6, label: 'Docs & Consent', icon: Upload }
 ];

 return (
  <>
  <div className={`space-y-4 ${showKfsModal || showModal || showSuccessModal || showAgreementModal || showImportModal ? 'print:hidden' : ''}`}>
  {/* Header */}
  <div className="teal-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-teal-600">
  <div>
  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Loan Application Directory</h1>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Manage borrower accounts, tenure terms, RBI Key Fact Statements (KFS), and loan disbursements.</p>
  </div>
   <div className="flex flex-wrap items-center gap-2">
     {/* Export CSV Button (Admin Only) */}
     {isAdmin && (
       <button
         type="button"
         onClick={handleExportCsv}
         disabled={exporting}
         className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs disabled:opacity-50"
         title="Export filtered loan directory records to CSV file for Excel"
       >
         {exporting ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
         <span>Export CSV</span>
       </button>
     )}

     {/* Import CSV Button (Admin Only) */}
     {isAdmin && (
       <button
         type="button"
         onClick={() => {
           handleResetImportModal();
           setShowImportModal(true);
         }}
         className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all border border-teal-200/80 dark:border-teal-800/80 cursor-pointer shadow-xs"
         title="Import historical borrower records from Excel or CSV file"
       >
         <UploadCloud className="h-4 w-4 text-teal-600 dark:text-teal-400" />
         <span>Import CSV</span>
       </button>
     )}

     {/* New Loan Application */}
     <button
       type="button"
       onClick={handleOpenCreateModal}
       className="teal-btn cursor-pointer whitespace-nowrap"
     >
       <Plus className="h-4 w-4" />
       <span>New Loan Application</span>
     </button>
   </div>
   </div>

   {/* Filter & Search Bar */}
   <div className="teal-card p-3 sm:p-3.5 flex flex-col sm:flex-row gap-2.5">
   <div className="relative flex-1">
   <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
   <input
   type="text"
   placeholder="Search by customer name, application no, or phone..."
   value={search}
   onChange={(e) => setSearch(e.target.value)}
   className="w-full teal-input pl-9 text-xs"
   />
   </div>
   <select
   value={statusFilter}
   onChange={(e) => setStatusFilter(e.target.value)}
   className="teal-input font-bold text-xs"
   >
   <option value="">All Statuses</option>
   <option value="Pending Approval">Pending Approval (Sent for Sanction)</option>
   <option value="Approved">Approved (Ready for Disbursal)</option>
   <option value="Active">Active (Disbursed)</option>
   <option value="Closed">Closed</option>
   <option value="Rejected">Rejected</option>
  </select>
  </div>

  {/* Data Table */}
  <div className="teal-card overflow-hidden">
  {loading ? (
  <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
  <p className="text-sm font-medium">Fetching Loan Records...</p>
  </div>
  ) : (
  <div className="overflow-x-auto">
  <table className="w-full text-left border-collapse">
  <thead>
  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
  <th className="py-2 px-2.5">#</th>
  <th className="py-2 px-2.5">Agreement & Cust ID</th>
  <th className="py-2 px-2.5">Name</th>
  <th className="py-2 px-2.5">Mobile</th>
  <th className="py-2 px-2.5">Loan Amount</th>
  <th className="py-2 px-2.5">Status</th>
  <th className="py-2 px-2.5">EMI</th>
  <th className="py-2 px-2.5">Due EMI</th>
  <th className="py-2 px-2.5">Received EMI</th>
  <th className="py-2 px-2.5">Pending EMI</th>
  <th className="py-2 px-2.5">Received</th>
  {isAdmin && <th className="py-2 px-2.5">P/L</th>}
  <th className="py-2 px-2.5 text-right">Action</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-slate-100 text-xs">
  {loans.length > 0 ? (
  loans.map((loan, index) => {
  const receivedCount = parseInt(loan.received_count ?? 0, 10);
  const tenure = parseInt(loan.tenure_months || 24, 10);
  const pendingCount = parseInt(loan.pending_count ?? Math.max(0, tenure - receivedCount), 10);
  const emiAmount = Math.ceil(parseFloat(loan.emi_amount || 0));
  const loanAmount = Math.ceil(parseFloat(loan.loan_amount || 0));
  const totalPayment = Math.ceil(parseFloat(loan.total_payment || (emiAmount * tenure)));
  const dueEmiAmt = Math.ceil(parseFloat(loan.balance_outstanding !== undefined && loan.balance_outstanding !== null ? loan.balance_outstanding : totalPayment));
  const actualReceived = Math.max(0, totalPayment - dueEmiAmt);
  const profitLoss = actualReceived - loanAmount;

 return (
 <tr key={loan.id} className="hover:bg-slate-50 dark:bg-slate-950/50 transition-colors">
 <td className="py-2 px-2.5 text-slate-400 font-semibold">{index + 1}</td>
 <td className="py-2 px-2.5">
   <button
     type="button"
     onClick={() => { setSelectedAgreementLoan(loan); setAgreementModalTab('application'); setShowAgreementModal(true); }}
     className="text-left group cursor-pointer"
     title="Click to view full Application Dossier & KYC Document"
   >
     <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 group-hover:underline">
       {loan.agreement_no || loan.loan_no}
     </div>
     <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
       {loan.customer_id ? `CID: ${loan.customer_id}` : `App: ${loan.loan_no}`}
     </div>
   </button>
 </td>
 <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white uppercase">{loan.customer_name}</td>
 <td className="py-2 px-2.5 text-slate-700 dark:text-slate-200 font-medium">{loan.phone}</td>
 <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white">₹{loanAmount.toLocaleString()}</td>
 <td className="py-2 px-2.5">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
   (loan.status === 'Pending Approval' || loan.status === 'Draft' || loan.status === 'Pending') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
   loan.status === 'Approved' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800' :
   loan.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800' :
   loan.status === 'Closed' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
   'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
 }`}>
   {loan.status === 'Pending Approval' ? 'Pending Approval' :
    (loan.status === 'Draft' || loan.status === 'Pending') ? 'Draft' :
    loan.status === 'Approved' ? 'Approved' :
    loan.status || 'Active'}
 </span>
 </td>
 <td className="py-2 px-2.5 font-semibold text-slate-800 dark:text-slate-100">₹{emiAmount.toLocaleString()}</td>
 <td className="py-2 px-2.5 font-semibold text-teal-600">₹{dueEmiAmt.toLocaleString()}</td>
 <td className="py-2 px-2.5 font-bold text-emerald-600">{receivedCount}/{tenure}</td>
 <td className="py-2 px-2.5 font-bold text-teal-600">{pendingCount}</td>
 <td className="py-2 px-2.5 font-extrabold text-emerald-700">₹{actualReceived.toLocaleString()}</td>
 {isAdmin && (
   <td className={`py-2 px-2.5 font-extrabold ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
     {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString()}
   </td>
 )}
  <td className="py-2 px-2.5 text-right whitespace-nowrap">
    <ActionDropdown
      label="Actions"
      menuWidth={250}
      items={[
        // Decision & Approval Group
        (loan.status === 'Pending Approval' || loan.status === 'Approved') && {
          header: 'Loan Decision & Payout'
        },
        loan.status === 'Pending Approval' && (isAdmin || isManager) && {
          label: 'Approve Loan',
          subLabel: 'Verify & sanction application',
          icon: Check,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          badge: 'Sanction',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
          onClick: () => {
            setSelectedApproveLoan(loan);
            setApprovalNotes(isManager ? 'Sanctioned by Branch Manager' : 'Verified and sanctioned by Administrator');
            setShowApproveModal(true);
          }
        },
        loan.status === 'Pending Approval' && (isAdmin || isManager) && {
          label: 'Reject Application',
          subLabel: 'Decline and record reason',
          icon: X,
          iconColor: 'text-rose-600 dark:text-rose-400',
          danger: true,
          onClick: () => {
            setSelectedRejectLoan(loan);
            setRejectReason('');
            setShowRejectModal(true);
          }
        },
        loan.status === 'Pending Approval' && !isAdmin && !isManager && {
          label: 'Under Review',
          subLabel: 'Awaiting manager approval',
          icon: Clock,
          disabled: true
        },
        // Pre-Approval Edit (Permitted only before sanction)
        (loan.status === 'Pending Approval' || loan.status === 'Draft' || loan.status === 'Pending') && {
          label: 'Edit Application',
          subLabel: 'Modify terms & borrower details',
          icon: Edit3,
          iconColor: 'text-amber-600 dark:text-amber-400',
          badge: 'Editable',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
          onClick: () => handleOpenEditModal(loan)
        },
        loan.status === 'Approved' && isAdmin && {
          label: 'Disburse Funds',
          subLabel: 'Release funds & record UTR',
          icon: DollarSign,
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          badge: 'Payout',
          badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
          onClick: () => {
            setSelectedDisburseLoan(loan);
            setDisbursementData({
              ...disbursementData,
              disbursement_date: new Date().toISOString().split('T')[0]
            });
            setShowDisburseModal(true);
          }
        },
        loan.status === 'Approved' && !isAdmin && {
          label: 'Ready for Payout',
          subLabel: 'Waiting admin disbursement',
          icon: Clock,
          disabled: true
        },
        // Post-Approval Lock Indicator
        (loan.status === 'Approved' || loan.status === 'Active' || loan.status === 'Closed') && {
          label: 'Application Locked',
          subLabel: 'Non-editable post-approval',
          icon: Lock,
          iconColor: 'text-slate-400 dark:text-slate-500',
          badge: 'Locked',
          badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          disabled: true
        },
        (loan.status === 'Pending Approval' || loan.status === 'Approved') && {
          divider: true
        },

        // Official Documents Group
        { header: 'Official Documents' },
        {
          label: 'Loan Agreement',
          subLabel: 'Print legally binding contract',
          icon: FileText,
          iconColor: 'text-teal-600 dark:text-teal-400',
          onClick: () => {
            setSelectedAgreementLoan(loan);
            setAgreementModalTab('agreement');
            setShowAgreementModal(true);
          }
        },

        // Statements & Repayment Group
        { divider: true },
        { header: 'Repayment & Statement' },
        {
          label: 'Statement of Account (SOA)',
          subLabel: 'Full EMI schedule & receipt history',
          icon: FileSpreadsheet,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          onClick: () => navigate(`/emi-report?loan_id=${loan.id}`)
        },
        (loan.status === 'Active' || loan.status === 'Approved') && {
          label: 'Repayment',
          subLabel: 'Record installment receipt',
          icon: Receipt,
          iconColor: 'text-teal-600 dark:text-teal-400',
          onClick: () => navigate('/emis', { state: { preselectLoanId: loan.id } })
        },

        // Communication
        (loan.status === 'Active' || loan.disbursement_date) && { divider: true },
        (loan.status === 'Active' || loan.disbursement_date) && { header: 'Borrower Communication' },
        (loan.status === 'Active' || loan.disbursement_date) && {
          label: 'WhatsApp Loan Notice',
          subLabel: 'Share agreement ID & portal details',
          icon: MessageCircle,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          onClick: () => handleSendDisbursalWhatsApp(loan)
        }
      ]}
    />
  </td>
 </tr>
 );
 })
 ) : (
  <tr>
  <td colSpan={isAdmin ? 13 : 12} className="py-12 text-center text-slate-400 dark:text-slate-500">
    <div className="flex flex-col items-center justify-center space-y-3">
      <FileSpreadsheet className="h-10 w-10 text-slate-300 dark:text-slate-600" />
      <div>
        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No loan applications found</p>
        <p className="text-xs text-slate-400 mt-0.5">Start fresh with a new application or import old historical borrower records.</p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              handleResetImportModal();
              setShowImportModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Import CSV Records</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Application</span>
        </button>
      </div>
    </div>
  </td>
  </tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

  {/* RBI Key Fact Statement (KFS) Modal */}
  {showKfsModal && selectedKfsLoan && (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="printable-voucher voucher-1page bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden my-6 print:border-none print:shadow-none print:m-0 print:max-w-none print:rounded-none">
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-lg">RBI Key Fact Statement (KFS)</h3>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Print Preview: 1 Page
            </span>
          </div>
          <button onClick={() => setShowKfsModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable KFS Document Area */}
        <div className="p-6 print:p-4 space-y-3.5 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
          {/* Header Letterhead (Printed) */}
          <div className="text-center border-b border-slate-200 dark:border-slate-700 print:border-slate-400 pb-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white print:text-black uppercase tracking-tight">{settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'}</h2>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">{settings.tagline || 'Registered Non-Banking Financial Company (NBFC - MFI)'}</p>
            <p className="text-[10px] font-bold text-indigo-700 print:text-black mt-1 uppercase">Key Fact Statement (KFS) under RBI Master Direction 2026</p>
          </div>

          {/* Milestone Strip */}
          {renderLifecycleMilestoneStrip(selectedKfsLoan, 'kfs')}

          {/* Borrower Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
            <div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Loan Application No</p>
              <p className="font-mono font-bold text-indigo-600 print:text-black">{selectedKfsLoan.loan_no}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Agreement No</p>
              <p className="font-mono font-bold text-teal-600 print:text-black">{selectedKfsLoan.agreement_no || selectedKfsLoan.loan_no}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Borrower Name</p>
              <p className="font-bold text-slate-900 dark:text-white print:text-black uppercase">{selectedKfsLoan.customer_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Contact Phone</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100 print:text-black">{selectedKfsLoan.phone}</p>
            </div>
          </div>

          {/* Financial Disclosure Breakdown Table */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white print:text-black mb-1.5 uppercase text-[11px] tracking-wider">Loan & Financial Cost Disclosure</h4>
            <table className="w-full border border-slate-200 dark:border-slate-700 print:border-slate-300 text-left border-collapse">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">1. Sanctioned Principal Amount</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">₹{parseFloat(selectedKfsLoan.loan_amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">2. Processing Fee (1.5%) + GST (18%)</td>
                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-100 print:text-black text-right">₹{Math.ceil(parseFloat(selectedKfsLoan.loan_amount) * 0.0177).toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-50/60 print:bg-slate-100">
                  <td className="py-1.5 px-3 font-bold text-emerald-900 print:text-black">3. Net Disbursed Amount</td>
                  <td className="py-1.5 px-3 font-black text-emerald-700 print:text-black text-right">₹{Math.ceil(parseFloat(selectedKfsLoan.loan_amount) - Math.ceil(parseFloat(selectedKfsLoan.loan_amount) * 0.0177)).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">4. Annual Interest Rate (Reducing Balance)</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedKfsLoan.interest_rate}% p.a.</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">5. Effective Annual Percentage Rate (APR %)</td>
                  <td className="py-1.5 px-3 font-bold text-indigo-700 print:text-black text-right">{(parseFloat(selectedKfsLoan.interest_rate) + 2.1).toFixed(2)}% p.a.</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">6. Monthly Installment (EMI)</td>
                  <td className="py-1.5 px-3 font-black text-slate-900 dark:text-white print:text-black text-right">₹{parseFloat(selectedKfsLoan.emi_amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">7. Repayment Tenure</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedKfsLoan.tenure_months} Months</td>
                </tr>
                <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-black">
                  <td className="py-1.5 px-3 font-bold">8. Total Repayment Amount</td>
                  <td className="py-1.5 px-3 font-black text-right text-emerald-400 print:text-black">₹{parseFloat(selectedKfsLoan.total_payment || (selectedKfsLoan.emi_amount * selectedKfsLoan.tenure_months)).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-center border-t border-slate-200 dark:border-slate-700 print:border-slate-400">
            <div className="border-t border-dashed border-slate-400 pt-2">
              <p className="font-bold text-slate-900 dark:text-white print:text-black">Borrower Signature</p>
              <p className="text-[10px] text-slate-400 print:text-slate-600">I accept all KFS loan terms</p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-2">
              <p className="font-bold text-slate-900 dark:text-white print:text-black">{settings.signatory_name || 'Authorized NBFC Officer'}</p>
              <p className="text-[10px] text-slate-400 print:text-slate-600">{settings.signatory_title ? `${settings.signatory_title} - ${settings.institution_name || 'Institution'}` : (settings.institution_name || 'Authorized Signatory')}</p>
            </div>
          </div>
        </div>

        <div className="print:hidden bg-slate-100 dark:bg-slate-800 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official KFS Statement</span>
          </button>
        </div>
      </div>
    </div>
  )}

 {/* Disbursement Modal */}
 {showDisburseModal && selectedDisburseLoan && (
   <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
     <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
       <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
         <div className="flex items-center space-x-2">
           <DollarSign className="h-5 w-5" />
           <h3 className="font-bold text-lg">Disburse Funds</h3>
         </div>
         <button onClick={() => setShowDisburseModal(false)} className="text-emerald-100 hover:text-white">
           <X className="h-5 w-5" />
         </button>
       </div>
       <form onSubmit={handleDisburse} className="p-6 space-y-4">
         <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm mb-4">
           <div className="flex justify-between mb-1">
             <span className="text-slate-500 dark:text-slate-400">Loan No:</span>
             <span className="font-bold text-slate-900 dark:text-white">{selectedDisburseLoan.loan_no}</span>
           </div>
           <div className="flex justify-between mb-1">
             <span className="text-slate-500 dark:text-slate-400">Customer:</span>
             <span className="font-bold text-slate-900 dark:text-white">{selectedDisburseLoan.customer_name}</span>
           </div>
           <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
             <span className="text-slate-500 dark:text-slate-400">Amount to Disburse:</span>
             <span className="font-bold text-emerald-600 text-lg">₹{parseFloat(selectedDisburseLoan.loan_amount).toLocaleString()}</span>
           </div>
         </div>
         
         <div>
           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase mb-1">Disbursement Date</label>
           <input
             type="date"
             required
             value={disbursementData.disbursement_date}
             onChange={(e) => setDisbursementData({...disbursementData, disbursement_date: e.target.value})}
             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
           />
         </div>
         <div>
           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase mb-1">Payment Mode</label>
           <select
             required
             value={disbursementData.payment_mode}
             onChange={(e) => setDisbursementData({...disbursementData, payment_mode: e.target.value})}
             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
           >
             <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
             <option value="UPI">UPI</option>
             <option value="Cash">Cash</option>
             <option value="Cheque">Cheque</option>
           </select>
         </div>
         <div>
           <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase mb-1">Reference No (Optional)</label>
           <input
             type="text"
             placeholder="Txn ID or Cheque No"
             value={disbursementData.reference_no}
             onChange={(e) => setDisbursementData({...disbursementData, reference_no: e.target.value})}
             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
           />
         </div>
         <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
           <button
             type="button"
             onClick={() => setShowDisburseModal(false)}
             className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
           >
             Cancel
           </button>
           <button
             type="submit"
             disabled={disbursing}
             className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2"
           >
             {disbursing && <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>}
             <span>Confirm Disbursement</span>
           </button>
         </div>
       </form>
     </div>
   </div>
 )}

  {/* Loan Application Approval Modal */}
  {showApproveModal && selectedApproveLoan && (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight">Loan Application Approval</h3>
              <p className="text-[11px] text-emerald-100">Grant official institutional sanction for this loan</p>
            </div>
          </div>
          <button 
            onClick={() => setShowApproveModal(false)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleApproveLoan} className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Application & Agreement No:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {selectedApproveLoan.loan_no} • {selectedApproveLoan.agreement_no}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Applicant Name:</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase">{selectedApproveLoan.customer_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Sanction Amount:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{parseFloat(selectedApproveLoan.loan_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tenure & Installment:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedApproveLoan.tenure_months} Months • ₹{parseFloat(selectedApproveLoan.emi_amount || 0).toLocaleString()}/month
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Application & Lead Dates:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                App: {formatDocDate(selectedApproveLoan.application_date || selectedApproveLoan.created_at)} • Lead: {formatDocDate(selectedApproveLoan.lead_date || selectedApproveLoan.application_date || selectedApproveLoan.created_at)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Borrower Bank Account:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedApproveLoan.bank_name || 'Bank'} ({selectedApproveLoan.bank_account_no || 'N/A'})
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1 flex items-center justify-between">
              <span>Official Sanction / Approval Date <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Credit Sanction Effective Date</span>
            </label>
            <input
              type="date"
              required
              value={approvalDate}
              onChange={(e) => setApprovalDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Sanction Remarks / Approval Notes
            </label>
            <textarea
              rows="3"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g., KYC documents verified, CIBIL/bureau cleared, sanctioned for fund disbursal."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {approving && <span className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full"></span>}
              <Check className="h-4 w-4" />
              <span>Confirm & Approve Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Loan Application Reject Modal */}
  {showRejectModal && selectedRejectLoan && (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-bold text-lg">Reject Loan Application</h3>
          </div>
          <button 
            onClick={() => setShowRejectModal(false)}
            className="text-rose-100 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleRejectLoan} className="p-6 space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs space-y-1">
            <p className="font-bold text-rose-900 dark:text-rose-200">
              Rejecting Application: {selectedRejectLoan.loan_no} ({selectedRejectLoan.customer_name})
            </p>
            <p className="text-rose-700 dark:text-rose-300">
              This action will mark the application as Rejected.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
              Reason for Rejection *
            </label>
            <textarea
              required
              rows="3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Incomplete documentation, credit score threshold, or unverified address."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejecting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {rejecting && <span className="animate-spin h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full"></span>}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Application Submitted & Sent for Approval Confirmation Modal */}
  {showSuccessModal && successLoanData && (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-teal-600 to-indigo-600 text-white px-6 py-6 text-center relative">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 border border-white/30">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-black text-xl tracking-tight">Loan Application Submitted!</h3>
          <p className="text-xs text-amber-100 mt-1">Application successfully sent for Admin Approval. Official Agreement Draft & Customer ID have been generated.</p>
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Indicator Pill */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-bold text-amber-900 dark:text-amber-200">Current Status:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">Pending Approval (Sent to Admin for Sanction)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
              Stage 1 of 3
            </span>
          </div>

          {/* Highlighted Identifiers: Agreement No & Customer ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Agreement Number Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Official Agreement No</span>
                <button
                  type="button"
                  onClick={() => handleCopy(successLoanData.agreement_no, 'agreement')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'agreement' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'agreement' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono font-black text-base text-indigo-950 dark:text-indigo-200 select-all">
                {successLoanData.agreement_no}
              </p>
            </div>

            {/* Customer ID Box */}
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">Customer ID</span>
                <button
                  type="button"
                  onClick={() => handleCopy(successLoanData.customer_id, 'customer')}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'customer' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'customer' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono font-black text-base text-teal-950 dark:text-teal-200 select-all">
                {successLoanData.customer_id}
              </p>
            </div>
          </div>

          {/* Loan Summary Info Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Applicant Name</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase">{successLoanData.customer_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Primary Mobile</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{successLoanData.phone}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Requested Amount</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{parseFloat(successLoanData.loan_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Installment (EMI)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{parseFloat(successLoanData.emi_amount).toLocaleString()} / month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Tenure</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{successLoanData.tenure_months} Months @ {successLoanData.interest_rate}% p.a.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedAgreementLoan(successLoanData);
                setAgreementModalTab('agreement');
                setShowAgreementModal(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer transition-all"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>Print Official Loan Agreement & Application Form</span>
            </button>

            <div className={`grid ${(isAdmin || isManager) ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedKfsLoan(successLoanData);
                  setShowKfsModal(true);
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <FileCheck className="h-4 w-4 text-indigo-500" />
                <span>View RBI KFS</span>
              </button>

              {(isAdmin || isManager) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApproveLoan(successLoanData);
                    setApprovalNotes(isManager ? 'Immediate sanction upon branch review' : 'Immediate sanction upon submission review');
                    setShowSuccessModal(false);
                    setShowApproveModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                  title="Review & Grant Approval Sanction Now"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve Loan Now</span>
                </button>
              )}
            </div>

            {!isAdmin && !isManager && (
              <p className="text-[11px] text-center text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl py-2 px-3">
                Application successfully queued in <span className="font-bold">Pending Approval</span>. The Branch Manager will review KYC documents and sanction this loan.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Done, Return to Loans Directory
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Loan Disbursed Successfully Confirmation Modal (Displays Agreement & Customer ID) */}
  {showDisbursedSuccessModal && disbursedSuccessLoan && (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-6 py-6 text-center relative">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 border border-white/30">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-black text-xl tracking-tight">Loan Disbursed & Activated!</h3>
          <p className="text-xs text-emerald-100 mt-1">Capital released successfully. Official Agreement & Customer ID are now Active.</p>
          <button 
            onClick={() => setShowDisbursedSuccessModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Indicator Pill */}
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-emerald-900 dark:text-emerald-200">Account Status:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">Active (Funds Disbursed & In Repayment)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
              Disbursal Complete
            </span>
          </div>

          {/* Highlighted Identifiers: Agreement No & Customer ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Agreement Number Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Official Agreement No</span>
                <button
                  type="button"
                  onClick={() => handleCopy(disbursedSuccessLoan.agreement_no, 'agreement')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'agreement' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'agreement' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono font-black text-base text-indigo-950 dark:text-indigo-200 select-all">
                {disbursedSuccessLoan.agreement_no || disbursedSuccessLoan.loan_no}
              </p>
            </div>

            {/* Customer ID Box */}
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">Customer ID</span>
                <button
                  type="button"
                  onClick={() => handleCopy(disbursedSuccessLoan.customer_id, 'customer')}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedField === 'customer' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'customer' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono font-black text-base text-teal-950 dark:text-teal-200 select-all">
                {disbursedSuccessLoan.customer_id || 'CUST-N/A'}
              </p>
            </div>
          </div>

          {/* Disbursement Summary Info Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Borrower Full Name</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase">{disbursedSuccessLoan.customer_name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Disbursed Principal</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{parseFloat(disbursedSuccessLoan.loan_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Mode & Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {disbursedSuccessLoan.payment_mode || 'Bank Transfer'} • {disbursedSuccessLoan.disbursement_date || new Date().toISOString().split('T')[0]}
              </span>
            </div>
            {disbursedSuccessLoan.reference_no && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Txn / UTR Reference</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{disbursedSuccessLoan.reference_no}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Installment (EMI)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{parseFloat(disbursedSuccessLoan.emi_amount || 0).toLocaleString()} / month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Beneficiary Bank Account</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {disbursedSuccessLoan.bank_name || 'Bank'} ({disbursedSuccessLoan.bank_account_no || 'N/A'})
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedAgreementLoan(disbursedSuccessLoan);
                setAgreementModalTab('agreement');
                setShowAgreementModal(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer transition-all"
            >
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>View & Print Official Loan Agreement (with Cust ID & Terms)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendDisbursalWhatsApp(disbursedSuccessLoan)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 cursor-pointer transition-all"
            >
              <Share2 className="h-4 w-4" />
              <span>Send Agreement No & Cust ID to Borrower via WhatsApp</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedKfsLoan(disbursedSuccessLoan);
                  setShowKfsModal(true);
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <FileCheck className="h-4 w-4 text-indigo-500" />
                <span>View RBI KFS</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDisbursedSuccessModal(false)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Check className="h-4 w-4" />
                <span>Done, Go to Directory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Official Loan Agreement & Complete Application Modal (Printable) */}
  {showAgreementModal && selectedAgreementLoan && (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="printable-voucher voucher-multipages bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl overflow-hidden my-4 sm:my-6 print:border-none print:shadow-none print:m-0 print:max-w-none print:rounded-none">
        
        {/* Modal Header Bar (Hidden on Print) */}
        <div className="print:hidden bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {agreementModalTab === 'application' 
                    ? 'Complete Loan Application Dossier' 
                    : agreementModalTab === 'sanction'
                    ? 'Official Loan Sanction Letter'
                    : agreementModalTab === 'kfs'
                    ? 'RBI Key Fact Statement (KFS)'
                    : agreementModalTab === 'agreement' 
                    ? 'Official Sanction Agreement Contract' 
                    : agreementModalTab === 'schedule'
                    ? 'Repayment Amortization Schedule'
                    : 'Disbursement Advice & Payout Voucher'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  selectedAgreementLoan.status === 'Pending Approval' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  selectedAgreementLoan.status === 'Approved' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                  selectedAgreementLoan.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedAgreementLoan.status || 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Agreement: <strong className="text-white">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</strong> • Cust ID: <strong className="text-teal-300">{selectedAgreementLoan.customer_id || 'N/A'}</strong> • App: <strong className="text-slate-300">{selectedAgreementLoan.loan_no}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            {agreementModalTab === 'application' && (selectedAgreementLoan.status === 'Pending Approval' || selectedAgreementLoan.status === 'Draft' || selectedAgreementLoan.status === 'Pending') && (
              <button
                type="button"
                onClick={() => {
                  setShowAgreementModal(false);
                  handleOpenEditModal(selectedAgreementLoan);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-colors"
                title="Edit application details before sanctioning"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit Application</span>
              </button>
            )}
            {agreementModalTab === 'application' && (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' || selectedAgreementLoan.status === 'Closed') && (
              <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700" title="This application has been formally approved and locked from edits">
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Locked Post-Approval</span>
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {agreementModalTab === 'application' ? 'Print Application' : 
                 agreementModalTab === 'sanction' ? 'Print Sanction Letter' :
                 agreementModalTab === 'kfs' ? 'Print KFS' :
                 agreementModalTab === 'agreement' ? 'Print Agreement' : 
                 agreementModalTab === 'schedule' ? 'Print Schedule' :
                 'Print Payout Advice'}
              </span>
              <span className="sm:hidden">Print</span>
            </button>
            <button onClick={() => setShowAgreementModal(false)} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip (Hidden on Print) */}
        <div className="print:hidden bg-slate-800/90 border-b border-slate-700 px-4 sm:px-6 py-2 flex items-center space-x-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setAgreementModalTab('application')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'application'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Application Dossier</span>
            {(() => {
              const audit = getLoanPendingAudit(selectedAgreementLoan);
              return (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  audit.isComplete 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-amber-400 text-slate-900'
                }`}>
                  {audit.isComplete ? '100%' : `${audit.pendingMandatory.length} P`}
                </span>
              );
            })()}
          </button>

          <button
            type="button"
            onClick={() => setAgreementModalTab('sanction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'sanction'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>Sanction Letter</span>
          </button>

          <button
            type="button"
            onClick={() => setAgreementModalTab('kfs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'kfs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>RBI KFS</span>
          </button>

          <button
            type="button"
            onClick={() => setAgreementModalTab('agreement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'agreement'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>Sanction Agreement</span>
          </button>

          <button
            type="button"
            onClick={() => setAgreementModalTab('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'schedule'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Repayment Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setAgreementModalTab('disbursal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              agreementModalTab === 'disbursal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Payout Advice</span>
          </button>
        </div>

        {/* Modal Content Body */}
        {agreementModalTab === 'application' && (
          <div className="p-5 sm:p-6 print:p-4 space-y-5 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
            
            {/* 1. Completeness & Pending Details Audit Checker */}
            {(() => {
              const audit = getLoanPendingAudit(selectedAgreementLoan);
              return (
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  audit.isComplete
                    ? 'border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                    : 'border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      audit.isComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-900'
                    }`}>
                      {audit.isComplete ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-black text-sm">
                          {audit.isComplete 
                            ? 'Application 100% Complete & Verified' 
                            : `${audit.pendingMandatory.length} Mandatory Application Detail(s) Pending`}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          audit.isComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-900'
                        }`}>
                          {audit.isComplete ? 'Zero Details Pending' : 'Review Required'}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-1">
                        {audit.isComplete
                          ? 'All 17 mandatory borrower particulars, KYC credentials, sanctioned terms, and bank disbursement parameters are fully filled and verified.'
                          : 'The following required fields are empty or incomplete in this application:'}
                      </p>
                      {!audit.isComplete && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {audit.pendingMandatory.map(item => (
                            <span key={item.key} className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 text-[11px] font-bold border border-amber-300 dark:border-amber-700">
                              <X className="h-3 w-3 text-rose-600" />
                              <span>{item.label}</span>
                              <span className="text-[9px] text-amber-800 dark:text-amber-300 font-normal">({item.step})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-300 dark:border-slate-700">
                    <span className="text-2xl font-black">
                      {audit.filledMandatory}/{audit.totalMandatory}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      Mandatory Fields ({audit.percent}%)
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 2. Lifecycle Milestone Timeline & Audit Strip */}
            {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'application')}

            {/* Post-Approval Lock Guarantee Banner */}
            {(selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' || selectedAgreementLoan.status === 'Closed') && (
              <div className="print:hidden p-3.5 rounded-xl bg-slate-900 text-white border border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                    <Lock className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-extrabold text-sm text-white">Application Formally Approved &amp; Strictly Locked</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Non-Editable</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      This loan has passed credit appraisal and sanctioning. All borrower identity, loan terms, bank coordinates, and guarantor details are permanently frozen for audit compliance.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    Status: {selectedAgreementLoan.status}
                  </span>
                </div>
              </div>
            )}

            {/* Pre-Approval Revision Available Banner */}
            {(selectedAgreementLoan.status === 'Pending Approval' || selectedAgreementLoan.status === 'Draft' || selectedAgreementLoan.status === 'Pending') && (
              <div className="print:hidden p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">Pre-Approval Revision Mode Available</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">Editable</span>
                    </div>
                    <p className="text-amber-700 dark:text-amber-300/80 mt-0.5">
                      Application is currently pending credit sanction. You can rectify borrower particulars, loan terms, guarantor details, or bank records before final approval.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAgreementModal(false);
                    handleOpenEditModal(selectedAgreementLoan);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition-colors shadow-xs shrink-0 whitespace-nowrap"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Application</span>
                </button>
              </div>
            )}

            {/* Application Quick Reference Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-100 p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Agreement No.</p>
                <div className="flex items-center space-x-1">
                  <p className="font-mono font-black text-indigo-600 dark:text-indigo-400 print:text-black">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</p>
                  <button type="button" onClick={() => handleCopy(selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no, 'agr')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy Agreement No">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Customer ID / CIF</p>
                <div className="flex items-center space-x-1">
                  <p className="font-mono font-black text-teal-600 dark:text-teal-400 print:text-black">{selectedAgreementLoan.customer_id || 'CUST-N/A'}</p>
                  {selectedAgreementLoan.customer_id && (
                    <button type="button" onClick={() => handleCopy(selectedAgreementLoan.customer_id, 'cid')} className="text-slate-400 hover:text-teal-600 print:hidden cursor-pointer" title="Copy Customer ID">
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Application No.</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300 print:text-black">{selectedAgreementLoan.loan_no}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Sanction Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedAgreementLoan.status === 'Pending Approval' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300' :
                  selectedAgreementLoan.status === 'Approved' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300' :
                  selectedAgreementLoan.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300' :
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                }`}>
                  {selectedAgreementLoan.status || 'Active'}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Lead Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {formatDocDate(selectedAgreementLoan.lead_date || selectedAgreementLoan.application_date || selectedAgreementLoan.created_at, 'N/A')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Application Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {formatDocDate(selectedAgreementLoan.application_date || selectedAgreementLoan.created_at, 'N/A')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Sanction Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {formatDocDate(selectedAgreementLoan.approval_date || (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' ? selectedAgreementLoan.created_at : null), selectedAgreementLoan.status === 'Rejected' ? 'Rejected' : 'Pending')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Disbursal Date</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {formatDocDate(selectedAgreementLoan.disbursement_date, selectedAgreementLoan.status === 'Active' ? 'Disbursed' : 'Pending')}
                </p>
              </div>
            </div>

            {/* STEP 1: Primary Applicant Particulars */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    Step 1: Primary Borrower Particulars
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Mandatory KYC</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Borrower Full Name</span>
                  <span className="font-bold uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name || <span className="text-amber-500 italic">Pending</span>}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Father / Husband Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.father_husband_name || <span className="text-amber-500 italic">Pending</span>}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Primary Mobile</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.phone}</span>
                    <button type="button" onClick={() => handleCopy(selectedAgreementLoan.phone, 'phone')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy Phone">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Alternate Mobile</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black">{selectedAgreementLoan.alternate_phone || <span className="text-slate-400 italic">Not Provided</span>}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Date of Birth</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">
                    {selectedAgreementLoan.dob ? new Date(selectedAgreementLoan.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-amber-500 italic">Pending</span>}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Gender</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.gender || 'Male'}</span>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Aadhaar Number</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.aadhaar_number || <span className="text-amber-500 italic">Pending</span>}</span>
                    {selectedAgreementLoan.aadhaar_number && (
                      <button type="button" onClick={() => handleCopy(selectedAgreementLoan.aadhaar_number, 'aadhaar')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy Aadhaar">
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">PAN Card Number</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.pan_number || <span className="text-amber-500 italic">Pending</span>}</span>
                    {selectedAgreementLoan.pan_number && (
                      <button type="button" onClick={() => handleCopy(selectedAgreementLoan.pan_number, 'pan')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy PAN">
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-3 md:col-span-4">
                  <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Residential Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">
                    {[selectedAgreementLoan.address, selectedAgreementLoan.district, selectedAgreementLoan.state, selectedAgreementLoan.pin_code].filter(Boolean).join(', ') || <span className="text-amber-500 italic">Address Pending</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 2 & 3: Co-Applicant and Guarantor Particulars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Co-Applicant Box */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">2</div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                      Step 2: Co-Applicant Details
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                {selectedAgreementLoan.co_applicant_name ? (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Name</span>
                      <span className="font-bold uppercase">{selectedAgreementLoan.co_applicant_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Father / Husband</span>
                      <span>{selectedAgreementLoan.co_applicant_father_husband || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Mobile</span>
                      <span>{selectedAgreementLoan.co_applicant_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Aadhaar</span>
                      <span className="font-mono">{selectedAgreementLoan.co_applicant_aadhaar || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Address</span>
                      <span>{[selectedAgreementLoan.co_applicant_address, selectedAgreementLoan.co_applicant_district, selectedAgreementLoan.co_applicant_state, selectedAgreementLoan.co_applicant_pin].filter(Boolean).join(', ') || 'Same as Primary Applicant'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    Sole Borrower Application (No Co-Applicant Attached)
                  </div>
                )}
              </div>

              {/* Guarantor Box */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">3</div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                      Step 3: Guarantor Particulars
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                {selectedAgreementLoan.guarantor_name ? (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Name</span>
                      <span className="font-bold uppercase">{selectedAgreementLoan.guarantor_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Father / Husband</span>
                      <span>{selectedAgreementLoan.guarantor_father_husband || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Mobile</span>
                      <span>{selectedAgreementLoan.guarantor_phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Aadhaar</span>
                      <span className="font-mono">{selectedAgreementLoan.guarantor_aadhaar || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Address</span>
                      <span>{[selectedAgreementLoan.guarantor_address, selectedAgreementLoan.guarantor_district, selectedAgreementLoan.guarantor_state, selectedAgreementLoan.guarantor_pin].filter(Boolean).join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    Collateral-Free Microfinance Sanction (No Guarantor Required)
                  </div>
                )}
              </div>
            </div>

            {/* STEP 4: Sanctioned Loan Terms & Repayment Math */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">4</div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    Step 4: Sanctioned Loan Terms & Repayment Parameters
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>RBI Compliant</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 text-[10px] block uppercase font-bold">Principal Sanction</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm">₹{parseFloat(selectedAgreementLoan.loan_amount || 0).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Annual Interest Rate</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.interest_rate}% p.a. (Reducing)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Repayment Tenure</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.tenure_months} Months</span>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
                  <span className="text-teal-700 dark:text-teal-400 text-[10px] block uppercase font-bold">Monthly Installment (EMI)</span>
                  <span className="font-black text-teal-800 dark:text-teal-300 text-sm">₹{parseFloat(selectedAgreementLoan.emi_amount || 0).toLocaleString()} / mo</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Total Repayment</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{parseFloat(selectedAgreementLoan.total_payment || (selectedAgreementLoan.emi_amount * selectedAgreementLoan.tenure_months)).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Interest Component</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{parseFloat(selectedAgreementLoan.interest_amount || 0).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Balance Outstanding</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{parseFloat(selectedAgreementLoan.balance_outstanding !== undefined ? selectedAgreementLoan.balance_outstanding : selectedAgreementLoan.total_payment || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Disbursal & Lifecycle Meta */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">1. Lead Inquiry</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDocDate(selectedAgreementLoan.lead_date || selectedAgreementLoan.application_date || selectedAgreementLoan.created_at, 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">2. Application Filing</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDocDate(selectedAgreementLoan.application_date || selectedAgreementLoan.created_at, 'N/A')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">3. Credit Approval</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDocDate(selectedAgreementLoan.approval_date || (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' ? selectedAgreementLoan.created_at : null), selectedAgreementLoan.status === 'Rejected' ? 'Rejected' : 'Pending Approval')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">4. Fund Disbursal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDocDate(selectedAgreementLoan.disbursement_date, selectedAgreementLoan.status === 'Active' ? 'Disbursed' : 'Awaiting Disbursal')}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 5: Income, Employment & Bank Particulars */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">5</div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    Step 5: Income, Employment & Disbursement Bank Particulars
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Bank Verified</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Employment Type</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.employment_type || 'Salaried'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Occupation / Trade</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.occupation || <span className="text-slate-400 italic">Not Specified</span>}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Monthly Household Income</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.monthly_income_range || 'Rs. 5,000 - Rs. 15,000'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Earning Family Members</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAgreementLoan.earning_members || 1} Person(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Bank Name</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">{selectedAgreementLoan.bank_name || <span className="text-amber-500 italic">Pending</span>}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Account Holder Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{selectedAgreementLoan.account_holder_name || selectedAgreementLoan.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Account Number</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedAgreementLoan.bank_account_no || <span className="text-amber-500 italic">Pending</span>}</span>
                    {selectedAgreementLoan.bank_account_no && (
                      <button type="button" onClick={() => handleCopy(selectedAgreementLoan.bank_account_no, 'acct')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy Account No">
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Bank IFSC Code</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedAgreementLoan.bank_ifsc || <span className="text-amber-500 italic">Pending</span>}</span>
                    {selectedAgreementLoan.bank_ifsc && (
                      <button type="button" onClick={() => handleCopy(selectedAgreementLoan.bank_ifsc, 'ifsc')} className="text-slate-400 hover:text-indigo-600 print:hidden cursor-pointer" title="Copy IFSC">
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Bank MICR Code</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedAgreementLoan.bank_micr || 'N/A'}</span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 text-[10px] block uppercase font-medium">Personal Reference Contact</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedAgreementLoan.reference_name
                      ? `${selectedAgreementLoan.reference_name} • Phone: ${selectedAgreementLoan.reference_phone || 'N/A'} • Relation: ${selectedAgreementLoan.reference_relation || 'Acquaintance'}`
                      : <span className="text-slate-400 italic">No Personal Reference Provided</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 6: KYC Document Checklist & Legal Consent */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">6</div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    Step 6: KYC Document Records & Legal Declarations
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Consented</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  { key: 'doc_aadhaar', title: 'Aadhaar Card', tag: 'ID' },
                  { key: 'doc_pan', title: 'PAN Card', tag: 'PAN' },
                  { key: 'doc_photo', title: 'Borrower Photo', tag: 'PH' },
                  { key: 'doc_passbook', title: 'Bank Proof', tag: 'BK' },
                  { key: 'doc_address_proof', title: 'Address Proof', tag: 'AD' },
                  { key: 'doc_co_aadhaar', title: 'Co-App Aadhaar', tag: 'CA' },
                  { key: 'doc_guarantor_aadhaar', title: 'Guarantor Aadhaar', tag: 'GA' }
                ].filter(d => ['doc_aadhaar', 'doc_pan', 'doc_photo', 'doc_passbook'].includes(d.key) || Boolean(selectedAgreementLoan[d.key]))
                .map((d) => {
                  const docSrc = selectedAgreementLoan[d.key];
                  const isPdf = docSrc && docSrc.startsWith('data:application/pdf');
                  return (
                    <div
                      key={d.key}
                      onClick={() => docSrc && setPreviewModalDoc({ title: d.title, dataUrl: docSrc, isPdf, tag: d.tag })}
                      className={`p-2 rounded-xl border flex items-center space-x-2 transition-all ${
                        docSrc
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 cursor-pointer hover:ring-2 hover:ring-indigo-400'
                          : 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      {docSrc ? (
                        isPdf ? (
                          <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0 text-rose-600">
                            <FileText className="h-5 w-5" />
                          </div>
                        ) : (
                          <img
                            src={docSrc}
                            alt={d.title}
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-indigo-200 dark:border-indigo-700 shadow-xs"
                          />
                        )
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{d.title}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {docSrc ? 'Click to preview' : 'Verified & Recorded'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">Borrower Terms & Sanction Policy Consented</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Created: {selectedAgreementLoan.created_at ? new Date(selectedAgreementLoan.created_at).toLocaleString('en-GB') : 'N/A'}
                </div>
              </div>

              {selectedAgreementLoan.additional_notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Officer Remarks / Notes</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedAgreementLoan.additional_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Official Loan Sanction Letter */}
        {agreementModalTab === 'sanction' && (
          <div className="p-6 sm:p-8 print:p-4 space-y-5 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
            {/* Header Letterhead */}
            <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-3">
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                {settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700 mt-0.5">
                {settings.tagline || 'Registered Non-Banking Financial Company (NBFC - MFI)'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                CIN: {settings.cin_number || 'U65929RJ2024NPL089123'} | Branch Code: {settings.branch_code || 'BR-NNL-001'} | Phone: {settings.phone || '+91 99910 95051'}
              </p>
              <div className="mt-2 flex items-center justify-center space-x-2">
                <span className="inline-block px-4 py-0.5 bg-indigo-900 text-white dark:bg-indigo-600 print:bg-slate-900 print:text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                  Official Loan Sanction & Credit Approval Letter
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Ref: SANC/{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}
                </span>
              </div>
            </div>

            {/* Lifecycle Milestone Strip */}
            {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'sanction')}

            {/* Borrower & Sanction Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 bg-slate-50 dark:bg-slate-950 print:bg-slate-50">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-500">Sanction Addressed To:</p>
                <p className="font-black text-sm uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name}</p>
                <p className="text-slate-600 dark:text-slate-300 print:text-slate-700">
                  {selectedAgreementLoan.father_husband_name ? `S/o, W/o ${selectedAgreementLoan.father_husband_name}` : ''}
                </p>
                <p className="text-slate-600 dark:text-slate-300 print:text-slate-700 leading-tight">
                  {[selectedAgreementLoan.address, selectedAgreementLoan.district, selectedAgreementLoan.state, selectedAgreementLoan.pin_code].filter(Boolean).join(', ')}
                </p>
                <p className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                  Mobile: {selectedAgreementLoan.phone} • Aadhaar: {selectedAgreementLoan.aadhaar_number || 'N/A'} • PAN: {selectedAgreementLoan.pan_number || 'N/A'}
                </p>
              </div>

              <div className="space-y-1.5 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 print:sm:border-slate-300 sm:pl-3">
                <p className="text-[10px] font-bold uppercase text-slate-500">Institutional Sanction Reference:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div><span className="text-slate-400">Application No:</span> <strong className="font-mono">{selectedAgreementLoan.loan_no}</strong></div>
                  <div><span className="text-slate-400">Agreement No:</span> <strong className="font-mono text-indigo-600 print:text-black">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</strong></div>
                  <div><span className="text-slate-400">Customer ID:</span> <strong className="font-mono text-teal-600 print:text-black">{selectedAgreementLoan.customer_id || 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Sanction Status:</span> <strong className="text-emerald-600 print:text-black">{selectedAgreementLoan.status === 'Pending Approval' ? 'Under Review' : 'Formally Sanctioned'}</strong></div>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 text-[10px] text-slate-500 dark:text-slate-400">
                  Sanction valid for 30 calendar days from Approval Date for agreement execution and disbursement.
                </div>
              </div>
            </div>

            {/* Letter Body Opening */}
            <div className="space-y-1 text-slate-700 dark:text-slate-300 print:text-slate-800">
              <p className="font-bold">Dear {selectedAgreementLoan.customer_name},</p>
              <p>
                With reference to your loan application dated <strong className="text-slate-900 dark:text-white print:text-black">{formatDocDate(selectedAgreementLoan.application_date || selectedAgreementLoan.created_at)}</strong> (Lead Origination Date: <strong className="text-slate-900 dark:text-white print:text-black">{formatDocDate(selectedAgreementLoan.lead_date || selectedAgreementLoan.application_date || selectedAgreementLoan.created_at)}</strong>), we are pleased to inform you that our Credit Committee has formally approved your credit facility on <strong className="text-emerald-700 dark:text-emerald-400 print:text-black">{formatDocDate(selectedAgreementLoan.approval_date || (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' ? selectedAgreementLoan.created_at : null))}</strong> subject to the terms and conditions outlined below:
              </p>
            </div>

            {/* Sanction Terms Table */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                Sanctioned Commercial Parameters
              </h4>
              <table className="w-full border border-slate-200 dark:border-slate-800 print:border-slate-300 text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-200 dark:border-slate-800 print:divide-slate-300">
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">1. Sanctioned Principal Loan Amount</td>
                    <td className="py-2 px-3 font-black text-slate-900 dark:text-white print:text-black text-right text-sm">₹{parseFloat(selectedAgreementLoan.loan_amount || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">2. Applicable Interest Rate (% per annum)</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedAgreementLoan.interest_rate}% p.a. (Reducing Balance Method)</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">3. Repayment Tenure</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedAgreementLoan.tenure_months} Monthly Installments</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">4. Equated Monthly Installment (EMI)</td>
                    <td className="py-2 px-3 font-black text-indigo-700 dark:text-indigo-400 print:text-black text-right text-sm">₹{parseFloat(selectedAgreementLoan.emi_amount || 0).toLocaleString()} / month</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">5. Total Repayable Value (Principal + Interest)</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">₹{parseFloat(selectedAgreementLoan.total_payment || (selectedAgreementLoan.emi_amount * selectedAgreementLoan.tenure_months)).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">6. Processing Fees &amp; Documentation GST</td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 print:text-black text-right">₹{Math.ceil(parseFloat(selectedAgreementLoan.loan_amount || 0) * 0.0177).toLocaleString()} (1.5% PF + 18% GST)</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">7. Nominated Bank Payout Account</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-white print:text-black text-right">
                      {selectedAgreementLoan.bank_name || 'Bank'} • A/C: {selectedAgreementLoan.bank_account_no || 'N/A'} • IFSC: {selectedAgreementLoan.bank_ifsc || 'N/A'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms and Conditions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-[10.5px] space-y-1 text-slate-600 dark:text-slate-400 print:text-slate-700">
              <p className="font-bold text-slate-900 dark:text-white print:text-black uppercase text-[11px]">Sanction Covenants &amp; Operational Directives:</p>
              <p>• <strong>Pre-Disbursal Requirements:</strong> Execution of the formal Sanction Agreement, submission of verified bank details, and compliance with institutional KYC requirements.</p>
              <p>• <strong>Credit Bureau Reporting:</strong> Performance on this loan will be reported monthly to RBI-approved Credit Information Companies (CIBIL, Equifax, Experian, CRIF High Mark).</p>
              <p>• <strong>Prepayment Facility:</strong> Permissible at any time without any foreclosure charge or prepayment penalty as mandated by RBI regulations for microfinance loans.</p>
              <p>• <strong>Penal Charges:</strong> Any delay beyond grace period shall attract penal charges calculated at {settings.annual_penalty_rate || '24.0'}% p.a. strictly on the overdue installment amount without compounding.</p>
            </div>

            {/* Borrower Acceptance & Signatures */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 print:border-slate-400 space-y-3">
              <p className="text-[10px] text-slate-500 italic text-center">
                I/We have read, understood, and unconditionally accept the loan sanction terms and interest schedule outlined above.
              </p>
              <div className="grid grid-cols-2 gap-8 text-center pt-2">
                <div className="border-t border-dashed border-slate-400 pt-2">
                  <p className="font-bold uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name}</p>
                  <p className="text-[10px] text-slate-400 print:text-slate-600">Borrower Signature &amp; Acceptance</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">Date: {formatDocDate(selectedAgreementLoan.application_date || selectedAgreementLoan.created_at)}</p>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2">
                  <p className="font-bold text-slate-900 dark:text-white print:text-black">{settings.signatory_name || 'Credit Sanction Officer'}</p>
                  <p className="text-[10px] text-slate-400 print:text-slate-600">{settings.signatory_title || 'Branch Manager / Credit Committee'}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">Sanctioned Date: {formatDocDate(selectedAgreementLoan.approval_date || (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' ? selectedAgreementLoan.created_at : null))}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: RBI Key Fact Statement (KFS) */}
        {agreementModalTab === 'kfs' && (
          <div className="p-6 sm:p-8 print:p-4 space-y-4 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
            {/* Header Letterhead */}
            <div className="text-center border-b border-slate-200 dark:border-slate-700 print:border-slate-400 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white print:text-black uppercase tracking-tight">
                {settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">
                {settings.tagline || 'Registered Non-Banking Financial Company (NBFC - MFI)'}
              </p>
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 print:text-black mt-1 uppercase">
                Key Fact Statement (KFS) under RBI Master Direction 2026
              </p>
            </div>

            {/* Lifecycle Milestone Strip */}
            {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'kfs')}

            {/* Borrower Details Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
              <div>
                <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Loan Application No</p>
                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 print:text-black">{selectedAgreementLoan.loan_no}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Agreement No</p>
                <p className="font-mono font-bold text-teal-600 dark:text-teal-400 print:text-black">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Borrower Name</p>
                <p className="font-bold text-slate-900 dark:text-white print:text-black uppercase">{selectedAgreementLoan.customer_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 print:text-slate-600 font-semibold uppercase">Contact Phone</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100 print:text-black">{selectedAgreementLoan.phone}</p>
              </div>
            </div>

            {/* Financial Disclosure Breakdown Table */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white print:text-black mb-1.5 uppercase text-[11px] tracking-wider">
                Loan &amp; Financial Cost Disclosure
              </h4>
              <table className="w-full border border-slate-200 dark:border-slate-700 print:border-slate-300 text-left border-collapse">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                  <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">1. Sanctioned Principal Amount</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">₹{parseFloat(selectedAgreementLoan.loan_amount).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">2. Processing Fee (1.5%) + GST (18%)</td>
                    <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-100 print:text-black text-right">₹{Math.ceil(parseFloat(selectedAgreementLoan.loan_amount) * 0.0177).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-emerald-50/60 print:bg-slate-100">
                    <td className="py-1.5 px-3 font-bold text-emerald-900 print:text-black">3. Net Disbursed Amount</td>
                    <td className="py-1.5 px-3 font-black text-emerald-700 print:text-black text-right">₹{Math.ceil(parseFloat(selectedAgreementLoan.loan_amount) - Math.ceil(parseFloat(selectedAgreementLoan.loan_amount) * 0.0177)).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">4. Annual Interest Rate (Reducing Balance)</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedAgreementLoan.interest_rate}% p.a.</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">5. Effective Annual Percentage Rate (APR %)</td>
                    <td className="py-1.5 px-3 font-bold text-indigo-700 print:text-black text-right">{(parseFloat(selectedAgreementLoan.interest_rate) + 2.1).toFixed(2)}% p.a.</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">6. Monthly Installment (EMI)</td>
                    <td className="py-1.5 px-3 font-black text-slate-900 dark:text-white print:text-black text-right">₹{parseFloat(selectedAgreementLoan.emi_amount).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-200 print:text-slate-800">7. Repayment Tenure</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white print:text-black text-right">{selectedAgreementLoan.tenure_months} Months</td>
                  </tr>
                  <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-black">
                    <td className="py-1.5 px-3 font-bold">8. Total Repayment Amount</td>
                    <td className="py-1.5 px-3 font-black text-right text-emerald-400 print:text-black">₹{parseFloat(selectedAgreementLoan.total_payment || (selectedAgreementLoan.emi_amount * selectedAgreementLoan.tenure_months)).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-4 grid grid-cols-2 gap-8 text-center border-t border-slate-200 dark:border-slate-700 print:border-slate-400">
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-bold text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name}</p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">Borrower Signature (I accept all KFS loan terms)</p>
              </div>
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-bold text-slate-900 dark:text-white print:text-black">{settings.signatory_name || 'Authorized NBFC Officer'}</p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">{settings.signatory_title ? `${settings.signatory_title} - ${settings.institution_name || 'Institution'}` : (settings.institution_name || 'Authorized Signatory')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Official Loan Agreement Contract (Print View) */}
        {agreementModalTab === 'agreement' && (
          <div className="p-6 sm:p-8 print:p-4 space-y-5 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
            
            {/* ================= PAGE 1 ================= */}
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-3">
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'}
                </h1>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700 mt-0.5">
                  {settings.tagline || 'Registered Non-Banking Financial Company (NBFC - MFI)'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                  CIN: {settings.cin_number || 'U65929RJ2024NPL089123'} | Branch Code: {settings.branch_code || 'BR-NNL-001'} | Phone: {settings.phone || '+91 99910 95051'}
                </p>
                <div className="mt-2 flex items-center justify-center space-x-2">
                  <span className="inline-block px-4 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-slate-900 print:text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    Microfinance Loan Agreement & Sanction Contract
                  </span>
                  <span className="hidden print:inline-block text-[10px] font-bold text-slate-500">
                    — Page 1 of 2
                  </span>
                </div>
              </div>

              {/* Reference Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-100 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
                <div>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Agreement No.</p>
                  <p className="font-mono font-black text-indigo-600 dark:text-indigo-400 print:text-black">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Customer ID</p>
                  <p className="font-mono font-black text-teal-600 dark:text-teal-400 print:text-black">{selectedAgreementLoan.customer_id || 'CUST-N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Application No.</p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300 print:text-black">{selectedAgreementLoan.loan_no}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 print:text-slate-600 uppercase font-bold">Sanction Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                    {formatDocDate(selectedAgreementLoan.approval_date || (selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' ? selectedAgreementLoan.created_at : null))}
                  </p>
                </div>
              </div>

              {/* Milestone Timeline Strip */}
              {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'agreement')}

              {/* 1. Borrower Particulars */}
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                  1. Borrower Particulars
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 bg-white dark:bg-slate-900 print:bg-white text-xs">
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Borrower Full Name</span>
                    <span className="font-bold uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Father / Husband</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.father_husband_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Primary Mobile</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Alternate Contact</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.alternate_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Aadhaar Number</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.aadhaar_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">PAN Number</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">{selectedAgreementLoan.pan_number || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-slate-400 print:text-slate-500 text-[10px] block uppercase font-medium">Residential Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">
                      {[selectedAgreementLoan.address, selectedAgreementLoan.district, selectedAgreementLoan.state, selectedAgreementLoan.pin_code].filter(Boolean).join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Co-Applicant & Guarantor Particulars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Co-Applicant Box */}
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                    2. Co-Applicant Details
                  </h4>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 min-h-[75px] flex flex-col justify-center">
                    {selectedAgreementLoan.co_applicant_name ? (
                      <div className="space-y-0.5 text-xs">
                        <p><strong className="text-slate-500 print:text-slate-600">Name:</strong> <span className="font-bold uppercase">{selectedAgreementLoan.co_applicant_name}</span></p>
                        <p><strong className="text-slate-500 print:text-slate-600">Father/Husband:</strong> {selectedAgreementLoan.co_applicant_father_husband || 'N/A'}</p>
                        <p><strong className="text-slate-500 print:text-slate-600">Mobile:</strong> {selectedAgreementLoan.co_applicant_phone || 'N/A'}</p>
                        <p><strong className="text-slate-500 print:text-slate-600">Aadhaar:</strong> {selectedAgreementLoan.co_applicant_aadhaar || 'N/A'}</p>
                      </div>
                    ) : (
                      <div className="text-center py-1.5 text-slate-400 italic text-[11px]">
                        N/A — Direct Sanction to Sole Borrower
                      </div>
                    )}
                  </div>
                </div>

                {/* Guarantor Box */}
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                    3. Guarantor Details
                  </h4>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 min-h-[75px] flex flex-col justify-center">
                    {selectedAgreementLoan.guarantor_name ? (
                      <div className="space-y-0.5 text-xs">
                        <p><strong className="text-slate-500 print:text-slate-600">Name:</strong> <span className="font-bold uppercase">{selectedAgreementLoan.guarantor_name}</span></p>
                        <p><strong className="text-slate-500 print:text-slate-600">Father/Husband:</strong> {selectedAgreementLoan.guarantor_father_husband || 'N/A'}</p>
                        <p><strong className="text-slate-500 print:text-slate-600">Mobile:</strong> {selectedAgreementLoan.guarantor_phone || 'N/A'}</p>
                        <p><strong className="text-slate-500 print:text-slate-600">Aadhaar:</strong> {selectedAgreementLoan.guarantor_aadhaar || 'N/A'}</p>
                      </div>
                    ) : (
                      <div className="text-center py-1.5 text-slate-400 italic text-[11px]">
                        N/A — Collateral Free Sanction
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Financial Terms Table */}
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                  4. Sanctioned Financial & Repayment Terms
                </h4>
                <table className="w-full border border-slate-200 dark:border-slate-800 print:border-slate-300 text-left border-collapse text-xs print:text-[11px]">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                    <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Sanctioned Principal Loan Amount</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-black text-right text-slate-900 dark:text-white print:text-black">
                        ₹{parseFloat(selectedAgreementLoan.loan_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Annual Reducing Interest Rate</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-bold text-right text-slate-800 dark:text-slate-200 print:text-black">
                        {selectedAgreementLoan.interest_rate}% per annum
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Repayment Tenure</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-bold text-right text-slate-800 dark:text-slate-200 print:text-black">
                        {selectedAgreementLoan.tenure_months} Months
                      </td>
                    </tr>
                    <tr className="bg-indigo-50/70 dark:bg-indigo-950/30 print:bg-slate-200">
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-black text-indigo-950 dark:text-indigo-200 print:text-black">Equated Monthly Installment (EMI)</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-black text-right text-indigo-700 dark:text-indigo-300 print:text-black text-sm print:text-xs">
                        ₹{parseFloat(selectedAgreementLoan.emi_amount || 0).toLocaleString()} / month
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Total Repayment Amount (Principal + Interest)</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-black text-right text-emerald-600 dark:text-emerald-400 print:text-black">
                        ₹{parseFloat(selectedAgreementLoan.total_payment || (selectedAgreementLoan.emi_amount * selectedAgreementLoan.tenure_months)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Overdue Penal Charges (Annual Rate / Daily Pro-Rata)</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-bold text-right text-rose-600 dark:text-rose-400 print:text-black">
                        {settings.annual_penalty_rate || '24.0'}% p.a. ({settings.default_penalty_rate || '0.0658'}% / day after {settings.grace_period || 5} days grace)
                      </td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                      <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Disbursement Bank Account</td>
                      <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-medium text-slate-800 dark:text-slate-200 print:text-black">
                        {selectedAgreementLoan.bank_name || 'Bank'} | A/C: {selectedAgreementLoan.bank_account_no || 'N/A'} | IFSC: {selectedAgreementLoan.bank_ifsc || 'N/A'}
                      </td>
                    </tr>
                    {Boolean(selectedAgreementLoan.disbursement_date || selectedAgreementLoan.status === 'Active') && (
                      <>
                        <tr>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Disbursement Date & Mode</td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-bold text-slate-800 dark:text-slate-200 print:text-black">
                            {selectedAgreementLoan.disbursement_date ? new Date(selectedAgreementLoan.disbursement_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Oct 2026'} • <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{selectedAgreementLoan.disbursement_mode || selectedAgreementLoan.payment_mode || 'Bank Transfer'}</span>
                          </td>
                        </tr>
                        <tr className="bg-slate-50 dark:bg-slate-950 print:bg-slate-100">
                          <td className="py-1.5 px-3 print:py-1 print:px-2 font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">Bank UTR / Transaction Reference</td>
                          <td className="py-1.5 px-3 print:py-1 print:px-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 print:text-black">
                            {selectedAgreementLoan.disbursement_reference || selectedAgreementLoan.reference_no || 'UTR-NBFC-DIRECT-CREDIT'}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ================= PAGE BREAK FOR PRINT (STRICT 2-PAGE LAYOUT) ================= */}
            <div className="page-break hidden print:block pt-1"></div>

            {/* ================= PAGE 2 ================= */}
            <div className="space-y-4">
              {/* Page 2 Top Running Header (Print Only) */}
              <div className="hidden print:block border-b border-slate-300 pb-2 mb-2">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span className="font-bold uppercase tracking-wider">{settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'} — REPAYMENT SCHEDULE & LEGAL TERMS</span>
                  <span>Agreement: <strong className="text-black font-mono">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</strong> | Page 2 of 2</span>
                </div>
              </div>

              {/* 5. Projected Repayment Amortization Schedule */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    5. Repayment Amortization Schedule
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAmortization(!showAmortization)}
                    className="print:hidden text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{showAmortization ? 'Hide Full Schedule' : 'View Full Schedule'}</span>
                    {showAmortization ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-400 ${showAmortization ? 'block max-h-64 overflow-y-auto' : 'hidden print:block'}`}>
                  <table className="w-full text-left text-[9.5px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 font-bold uppercase text-slate-700 dark:text-slate-200 print:text-black">
                        <th className="py-1 px-2 border-b">Instl #</th>
                        <th className="py-1 px-2 border-b">Due Date</th>
                        <th className="py-1 px-2 border-b text-right">Principal</th>
                        <th className="py-1 px-2 border-b text-right">Interest</th>
                        <th className="py-1 px-2 border-b text-right">EMI Payable</th>
                        <th className="py-1 px-2 border-b text-right">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {generateAmortizationSchedule(
                        selectedAgreementLoan.loan_amount,
                        selectedAgreementLoan.interest_rate,
                        selectedAgreementLoan.tenure_months,
                        selectedAgreementLoan.emi_amount
                      ).map((row) => (
                        <tr key={row.installment} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                          <td className="py-0.5 px-2 font-mono font-bold">#{row.installment}</td>
                          <td className="py-0.5 px-2 font-medium">{row.dueDate}</td>
                          <td className="py-0.5 px-2 text-right font-semibold">₹{row.principal.toLocaleString()}</td>
                          <td className="py-0.5 px-2 text-right text-slate-500 print:text-black">₹{row.interest.toLocaleString()}</td>
                          <td className="py-0.5 px-2 text-right font-black text-indigo-700 dark:text-indigo-300 print:text-black">₹{row.emi.toLocaleString()}</td>
                          <td className="py-0.5 px-2 text-right font-bold text-slate-800 dark:text-slate-200 print:text-black">₹{row.closingBalance.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Terms & Declarations */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-[10px] space-y-1 text-slate-600 dark:text-slate-400 print:text-slate-700 leading-relaxed">
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase">Standard NBFC-MFI Declarations:</p>
                <p>1. The Borrower covenants to repay the loan amount together with agreed interest in regular monthly installments as specified above without delay or default.</p>
                <p>2. The Borrower agrees and consents to reporting of repayment conduct to Credit Information Companies (CIBIL, Equifax, Experian, CRIF High Mark) in accordance with RBI guidelines.</p>
                <p>3. Prepayment is permissible without any prepayment penalty in compliance with Reserve Bank of India microfinance guidelines.</p>
                <p>4. Penal Charges: In the event of default or delayed payment of any installment beyond the grace period of {settings.grace_period || 5} days, penal charges shall be levied strictly according to the annual rate of {settings.annual_penalty_rate || '24.0'}% per annum ({settings.default_penalty_rate || '0.0658'}% per day) on the overdue installment amount, without compounding or capitalization.</p>
              </div>

              {/* 7. Signature Blocks */}
              <div className="pt-4 grid grid-cols-3 gap-6 text-center border-t border-slate-200 dark:border-slate-800 print:border-slate-400" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div>
                  <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                    <span className="text-[10px] text-slate-400 italic">Signature / Thumb</span>
                  </div>
                  <p className="font-bold text-xs mt-1 text-slate-900 dark:text-white print:text-black uppercase">{selectedAgreementLoan.customer_name}</p>
                  <p className="text-[10px] text-slate-400 print:text-slate-600">Borrower Signature</p>
                </div>

                <div>
                  <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                    <span className="text-[10px] text-slate-400 italic">
                      {selectedAgreementLoan.co_applicant_name ? 'Signature' : (selectedAgreementLoan.guarantor_name ? 'Signature' : 'N/A - Sole Borrower')}
                    </span>
                  </div>
                  <p className="font-bold text-xs mt-1 text-slate-900 dark:text-white print:text-black uppercase">
                    {selectedAgreementLoan.co_applicant_name || selectedAgreementLoan.guarantor_name || 'N/A'}
                  </p>
                  <p className="text-[10px] text-slate-400 print:text-slate-600">Co-Applicant / Guarantor</p>
                </div>

                <div>
                  <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400 pb-1">
                    <span className="text-[10px] text-slate-400 italic">Branch Seal & Signature</span>
                  </div>
                  <p className="font-bold text-xs mt-1 text-slate-900 dark:text-white print:text-black">
                    {settings.signatory_name || 'Authorized Officer'}
                  </p>
                  <p className="text-[10px] text-slate-400 print:text-slate-600">
                    {settings.signatory_title || 'Authorized Signatory'}
                  </p>
                </div>
              </div>

              {/* 8. Digital NBFC Contract Verification & Customer CIF Badge */}
              <div className="pt-3 mt-1 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 flex items-center justify-between text-[10px]" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="flex items-center space-x-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                      `NBFC-CONTRACT|AGR:${selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}|CUST_ID:${selectedAgreementLoan.customer_id || 'N/A'}|BORROWER:${selectedAgreementLoan.customer_name}|SANCTION:Rs.${selectedAgreementLoan.loan_amount}|STATUS:${selectedAgreementLoan.status || 'Active'}`
                    )}`}
                    alt="Agreement Verification QR"
                    className="w-13 h-13 p-0.5 border border-slate-300 dark:border-slate-700 bg-white rounded shrink-0 shadow-xs"
                  />
                  <div className="space-y-0.5 text-slate-600 dark:text-slate-400 print:text-slate-700">
                    <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase tracking-wider text-[10px]">
                      Official NBFC Digital Verification & Customer CIF Record
                    </p>
                    <p>Agreement No: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 print:text-black">{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}</span></p>
                    <p>Customer ID: <span className="font-mono font-bold text-teal-600 dark:text-teal-400 print:text-black">{selectedAgreementLoan.customer_id || 'CUST-N/A'}</span></p>
                    <p className="text-[9px] text-slate-400 print:text-slate-500">Scan QR to authenticate genuine NBFC loan execution & customer identity.</p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border border-dashed border-teal-600/50 bg-teal-50/50 dark:bg-teal-950/30 print:bg-white text-center">
                  <span className="text-[8px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-widest">DIGITALLY EXECUTED</span>
                  <span className="text-[10px] font-black text-teal-900 dark:text-teal-100">&amp; DISBURSED</span>
                  <span className="text-[8px] font-mono text-teal-700 dark:text-teal-400">CIF: {selectedAgreementLoan.customer_id || 'VERIFIED'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Full Repayment Schedule */}
        {agreementModalTab === 'schedule' && (
          <div className="p-5 sm:p-6 print:p-4 space-y-4 max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                  Full Repayment Amortization Schedule
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Month-by-month reducing balance breakdown for {selectedAgreementLoan.tenure_months} months tenure.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sanction: ₹{parseFloat(selectedAgreementLoan.loan_amount || 0).toLocaleString()} @ {selectedAgreementLoan.interest_rate}% p.a.</span>
              </div>
            </div>

            {/* Lifecycle Milestone Strip */}
            {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'schedule')}

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-700 dark:text-slate-200">
                    <th className="py-2 px-3 border-b">Instl #</th>
                    <th className="py-2 px-3 border-b">Due Date</th>
                    <th className="py-2 px-3 border-b text-right">Principal</th>
                    <th className="py-2 px-3 border-b text-right">Interest</th>
                    <th className="py-2 px-3 border-b text-right">EMI Payable</th>
                    <th className="py-2 px-3 border-b text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {generateAmortizationSchedule(
                    selectedAgreementLoan.loan_amount,
                    selectedAgreementLoan.interest_rate,
                    selectedAgreementLoan.tenure_months,
                    selectedAgreementLoan.emi_amount
                  ).map((row) => (
                    <tr key={row.installment} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                      <td className="py-1.5 px-3 font-mono font-bold">#{row.installment}</td>
                      <td className="py-1.5 px-3 font-medium">{row.dueDate}</td>
                      <td className="py-1.5 px-3 text-right font-semibold">₹{row.principal.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right text-slate-500 dark:text-slate-400">₹{row.interest.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right font-black text-indigo-600 dark:text-indigo-400">₹{row.emi.toLocaleString()}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">₹{row.closingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Disbursement Advice & Payout Voucher */}
        {agreementModalTab === 'disbursal' && (
          <div className="p-6 sm:p-8 print:p-4 space-y-5 text-xs font-sans text-slate-900 dark:text-white leading-relaxed max-h-[75vh] print:max-h-none overflow-y-auto print:overflow-visible print:text-black">
            {/* Header Letterhead */}
            <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-3">
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                {settings.institution_name?.toUpperCase() || 'MICROFINANCE INSTITUTION'}
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700 mt-0.5">
                {settings.tagline || 'Registered Non-Banking Financial Company (NBFC - MFI)'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                CIN: {settings.cin_number || 'U65929RJ2024NPL089123'} | Branch Code: {settings.branch_code || 'BR-NNL-001'} | Phone: {settings.phone || '+91 99910 95051'}
              </p>
              <div className="mt-2 flex items-center justify-center space-x-2">
                <span className="inline-block px-4 py-0.5 bg-emerald-800 text-white dark:bg-emerald-600 print:bg-slate-900 print:text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                  Official Disbursement Advice & Payout Voucher
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Voucher No: DISB/{selectedAgreementLoan.agreement_no || selectedAgreementLoan.loan_no}
                </span>
              </div>
            </div>

            {/* Lifecycle Milestone Strip */}
            {renderLifecycleMilestoneStrip(selectedAgreementLoan, 'disbursal')}

            {/* Payout Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/70 dark:bg-emerald-950/40 print:bg-slate-50 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 print:border-slate-300">
              <div>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 print:text-slate-600 uppercase font-bold">Gross Sanction</p>
                <p className="font-black text-slate-900 dark:text-white print:text-black text-sm">₹{parseFloat(selectedAgreementLoan.loan_amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 print:text-slate-600 uppercase font-bold">Processing Fee + GST</p>
                <p className="font-bold text-rose-600 dark:text-rose-400 print:text-black text-sm">₹{Math.ceil(parseFloat(selectedAgreementLoan.loan_amount || 0) * 0.0177).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 print:text-slate-600 uppercase font-bold">Net Transferred</p>
                <p className="font-black text-emerald-700 dark:text-emerald-400 print:text-black text-base">₹{(Math.ceil(parseFloat(selectedAgreementLoan.loan_amount || 0) - Math.ceil(parseFloat(selectedAgreementLoan.loan_amount || 0) * 0.0177))).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 print:text-slate-600 uppercase font-bold">Disbursal Value Date</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white print:text-black">
                  {formatDocDate(selectedAgreementLoan.disbursement_date, 'Pending Disbursal')}
                </p>
              </div>
            </div>

            {/* Beneficiary & Banking Details Table */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-1.5">
                Beneficiary Bank & Remittance Particulars
              </h4>
              <table className="w-full border border-slate-200 dark:border-slate-800 print:border-slate-300 text-left border-collapse text-xs">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">Beneficiary Borrower Name</td>
                    <td className="py-2 px-3 font-bold uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.account_holder_name || selectedAgreementLoan.customer_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">Remittance Payment Mode</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.disbursement_mode || selectedAgreementLoan.payment_mode || 'Bank Transfer (NEFT/RTGS/IMPS)'}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">Bank Reference / UTR Number</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 print:text-black">{selectedAgreementLoan.disbursement_reference || selectedAgreementLoan.reference_no || 'UTR-DIRECT-CREDIT-ACK'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">Bank Name &amp; Branch</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.bank_name || 'N/A'}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">Bank Account Number</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.bank_account_no || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">IFSC Code</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.bank_ifsc || 'N/A'}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 print:bg-slate-100">
                    <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 print:text-black">First Installment Due Date</td>
                    <td className="py-2 px-3 font-bold text-emerald-700 dark:text-emerald-400 print:text-black">{formatDocDate(selectedAgreementLoan.next_due_date, 'As Per Schedule')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Certification and Signatures */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-[10.5px] space-y-1 text-slate-600 dark:text-slate-400 print:text-slate-700">
              <p className="font-bold text-slate-900 dark:text-white print:text-black uppercase">Institutional Payout Certification:</p>
              <p>We certify that the funds described above have been authorized, cleared, and released from the institutional disbursement account to the designated borrower account in compliance with RBI lending covenants.</p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 print:border-slate-400 grid grid-cols-3 gap-6 text-center">
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-bold uppercase text-slate-900 dark:text-white print:text-black">{selectedAgreementLoan.customer_name}</p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">Borrower Acknowledgment</p>
              </div>
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-bold text-slate-900 dark:text-white print:text-black">Cashier / Ops Head</p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">Disbursing Officer</p>
              </div>
              <div className="border-t border-dashed border-slate-400 pt-2">
                <p className="font-bold text-slate-900 dark:text-white print:text-black">{settings.signatory_name || 'Branch Manager'}</p>
                <p className="text-[10px] text-slate-400 print:text-slate-600">{settings.signatory_title || 'Authorized Signatory'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions (Hidden on Print) */}
        <div className="print:hidden bg-slate-100 dark:bg-slate-800 px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Switch View:</span>
            {agreementModalTab !== 'application' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('application')}
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <FileText className="h-3 w-3" />
                <span>Application</span>
              </button>
            )}
            {agreementModalTab !== 'sanction' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('sanction')}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <FileCheck className="h-3 w-3" />
                <span>Sanction Letter</span>
              </button>
            )}
            {agreementModalTab !== 'kfs' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('kfs')}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Shield className="h-3 w-3" />
                <span>KFS</span>
              </button>
            )}
            {agreementModalTab !== 'agreement' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('agreement')}
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <FileCheck className="h-3 w-3" />
                <span>Agreement</span>
              </button>
            )}
            {agreementModalTab !== 'schedule' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('schedule')}
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Calendar className="h-3 w-3" />
                <span>Schedule</span>
              </button>
            )}
            {agreementModalTab !== 'disbursal' && (
              <button
                type="button"
                onClick={() => setAgreementModalTab('disbursal')}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <DollarSign className="h-3 w-3" />
                <span>Payout Advice</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Pre-approval edit trigger */}
            {(selectedAgreementLoan.status === 'Pending Approval' || selectedAgreementLoan.status === 'Draft' || selectedAgreementLoan.status === 'Pending') && (
              <button
                type="button"
                onClick={() => {
                  setShowAgreementModal(false);
                  handleOpenEditModal(selectedAgreementLoan);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Edit and correct loan application before sanctioning"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Application</span>
              </button>
            )}

            {/* Post-approval locked badge */}
            {(selectedAgreementLoan.status === 'Approved' || selectedAgreementLoan.status === 'Active' || selectedAgreementLoan.status === 'Closed') && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Locked Post-Approval</span>
              </span>
            )}

            {/* Quick Action buttons if in Pending Approval */}
            {selectedAgreementLoan.status === 'Pending Approval' && (isAdmin || isManager) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApproveLoan(selectedAgreementLoan);
                    setApprovalDate(new Date().toISOString().split('T')[0]);
                    setApprovalNotes(isManager ? 'Verified and sanctioned by Branch Manager' : 'Verified and sanctioned by Administrator');
                    setShowApproveModal(true);
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Approve Loan Application"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRejectLoan(selectedAgreementLoan);
                    setRejectReason('');
                    setShowRejectModal(true);
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                  title="Reject Loan Application"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}

            {/* Quick Disburse if in Approved */}
            {selectedAgreementLoan.status === 'Approved' && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDisburseLoan(selectedAgreementLoan);
                  setDisbursementData({
                    ...disbursementData,
                    disbursement_date: new Date().toISOString().split('T')[0]
                  });
                  setShowDisburseModal(true);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Disburse Funds directly to borrower bank account"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Disburse</span>
              </button>
            )}

            <button
              onClick={() => setShowAgreementModal(false)}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>
                {agreementModalTab === 'application' ? 'Print Application' : 
                 agreementModalTab === 'sanction' ? 'Print Sanction Letter' :
                 agreementModalTab === 'kfs' ? 'Print KFS' :
                 agreementModalTab === 'agreement' ? 'Print Agreement' : 
                 agreementModalTab === 'schedule' ? 'Print Schedule' :
                 'Print Payout Advice'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )}

 {/* 6-Step Loan Stepper Modal */}
 {showModal && (
 <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl overflow-hidden my-6">
 {/* Modal Header */}
 <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
 <div>
 <h3 className="font-bold text-lg">
   {editingLoanId ? `Edit Loan Application — ${formData.agreement_no || formData.loan_no || `#${editingLoanId}`}` : 'New Loan Application Wizard'}
 </h3>
 <div className="flex items-center space-x-2 mt-0.5">
 <p className="text-xs text-indigo-400">Step {currentStep} of 6: {steps[currentStep - 1].label}</p>
 {editingLoanId ? (
   <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 flex items-center space-x-1">
     <Edit3 className="h-2.5 w-2.5" />
     <span>Pre-Approval Revision</span>
   </span>
 ) : (
   <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">Max ₹2,00,000 Limit</span>
 )}
 </div>
 </div>
 <div className="flex items-center space-x-2">
 <button onClick={() => { setShowModal(false); setEditingLoanId(null); }} className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors">
 <X className="h-5 w-5" />
 </button>
 </div>
 </div>

 {editingLoanId && (
   <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
     <div className="flex items-center space-x-2">
       <Edit3 className="h-4 w-4 text-amber-400 shrink-0" />
       <span><strong>Pre-Approval Revision Mode:</strong> Modifying details for application <span className="font-mono font-bold text-amber-300">{formData.agreement_no || formData.loan_no}</span>. Note: Applications are permanently locked and non-editable once approved.</span>
     </div>
   </div>
 )}

 {/* Stepper Progress Bar */}
 <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 overflow-x-auto">
 <div className="flex items-center justify-between min-w-[550px]">
 {steps.map((s) => {
 const isActive = currentStep === s.num;
 const isCompleted = currentStep > s.num;
 return (
 <div 
 key={s.num} 
 onClick={() => setCurrentStep(s.num)}
 className="flex items-center space-x-2 cursor-pointer group"
 >
 <div className={`
 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
 ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400' : ''}
 ${isCompleted ? 'bg-emerald-500 text-white group-hover:bg-emerald-400' : ''}
 ${!isActive && !isCompleted ? 'bg-slate-700 text-slate-400 group-hover:bg-slate-600' : ''}
 `}>
 {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.num}
 </div>
 <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
 {s.label}
 </span>
 {s.num < 6 && <div className="h-0.5 w-4 bg-slate-700"></div>}
 </div>
 );
 })}
 </div>
 </div>

  {/* Existing Draft Notification */}
  {hasExistingDraft && (
    <div className="bg-indigo-950/90 border-b border-indigo-800/80 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-200 animate-in fade-in duration-200">
      <div className="flex items-center space-x-2">
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
        <span>Saved loan application draft found from a previous session.</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleRestoreDraft}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs"
        >
          Resume Draft
        </button>
        <button
          type="button"
          onClick={handleDiscardDraft}
          className="px-2 py-1 text-slate-400 hover:text-rose-300 text-[11px] transition-colors cursor-pointer"
        >
          Discard
        </button>
      </div>
    </div>
  )}

  {/* Active Saved Toast */}
  {draftBanner && (
    <div className="bg-emerald-950/90 border-b border-emerald-800 px-6 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in duration-150">
      <div className="flex items-center space-x-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="font-semibold">{draftBanner}</span>
      </div>
      <button
        type="button"
        onClick={() => setDraftBanner(null)}
        className="text-emerald-400 hover:text-white cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )}

  {/* Form Content */}
  <form 
    onSubmit={handleCreateLoan} 
    onKeyDown={(e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (currentStep < 6) {
          handleNextStep();
        }
      }
    }}
    className="p-6 space-y-5 max-h-[70vh] overflow-y-auto"
  >
 {/* STEP 1: Personal Information */}
 {currentStep === 1 && (
 <div className="space-y-4">
 <h4 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-2">Step 1: Personal Information</h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Full Name <span className="text-rose-500">*</span></label>
 <input
 type="text"
 required
 value={formData.customer_name}
 onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
 placeholder="YOGENDER SINGH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Father / Husband Name</label>
 <input
 type="text"
 value={formData.father_husband_name}
 onChange={(e) => setFormData({ ...formData, father_husband_name: e.target.value })}
 placeholder="RAM SINGH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Mobile Number <span className="text-rose-500">*</span></label>
 <input
 type="tel"
 required
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 placeholder="9876543210"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Alternate Number <span className="text-slate-400 font-normal lowercase">(Optional)</span></label>
 <input
 type="tel"
 value={formData.alternate_phone}
 onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
 placeholder="Alternate mobile number"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Date of Birth</label>
 <input
 type="date"
 value={formData.dob}
 onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Gender</label>
 <select
 value={formData.gender}
 onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Aadhaar Number</label>
 <input
 type="text"
 value={formData.aadhaar_number}
 onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
 placeholder="6542 5263 4125"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">PAN Card Number</label>
 <input
 type="text"
 value={formData.pan_number}
 onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
 placeholder="AXIPS2564F"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 {/* Document Re-Apply & Exposure Alert */}
 {renderDocumentAlert('applicant', 'Applicant')}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="sm:col-span-3">
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Full Address</label>
 <input
 type="text"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 placeholder="VILL SEKA"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">PIN Code</label>
   {pinLoading.borrower ? (
     <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
       <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
     </span>
   ) : pinMsg.borrower ? (
     <span className={`text-[10px] font-bold truncate max-w-[190px] ${pinMsg.borrower.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} title={pinMsg.borrower}>
       {pinMsg.borrower}
     </span>
   ) : (
     <span className="text-[10px] text-slate-400 font-medium">Auto-picks City/State</span>
   )}
 </div>
 <div className="relative">
   <input
   type="text"
   maxLength={6}
   value={formData.pin_code}
   onChange={(e) => handlePinCodeChange('borrower', e.target.value)}
   placeholder="123001"
   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-9 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
   />
   <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
     <MapPin className="h-4 w-4" />
   </div>
 </div>
  </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">District / City</label>
  </div>
 <input
 type="text"
 value={formData.district}
 onChange={(e) => setFormData({ ...formData, district: e.target.value })}
 placeholder="MAHENDERGARH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">State</label>
  </div>
 <input
 type="text"
 value={formData.state}
 onChange={(e) => setFormData({ ...formData, state: e.target.value })}
 placeholder="Haryana"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>
 </div>
 )}

 {/* STEP 2: Co-Applicant Information */}
 {currentStep === 2 && (
 <div className="space-y-4">
  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
    <div className="flex items-center space-x-2">
      <h4 className="font-bold text-slate-900 dark:text-white text-base">Step 2: Co-Applicant Information</h4>
      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700/60">Optional</span>
    </div>
    <button
      type="button"
      onClick={() => setCurrentStep(3)}
      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer transition-colors"
    >
      <span>Skip Step &rarr;</span>
    </button>
  </div>
  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
    Co-applicant is not mandatory. If the borrower is applying individually, you may leave these fields blank and proceed.
  </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Full Name</label>
 <input
 type="text"
 value={formData.co_applicant_name}
 onChange={(e) => setFormData({ ...formData, co_applicant_name: e.target.value })}
 placeholder="RAMESH KUMAR"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Father / Husband Name</label>
 <input
 type="text"
 value={formData.co_applicant_father_husband}
 onChange={(e) => setFormData({ ...formData, co_applicant_father_husband: e.target.value })}
 placeholder="Shyam Lal Sharma"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Mobile Number</label>
 <input
 type="tel"
 value={formData.co_applicant_phone}
 onChange={(e) => setFormData({ ...formData, co_applicant_phone: e.target.value })}
 placeholder="9876543210"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Date of Birth</label>
 <input
 type="date"
 value={formData.co_applicant_dob}
 onChange={(e) => setFormData({ ...formData, co_applicant_dob: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Gender</label>
 <select
 value={formData.co_applicant_gender}
 onChange={(e) => setFormData({ ...formData, co_applicant_gender: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Aadhaar Number</label>
 <input
 type="text"
 value={formData.co_applicant_aadhaar}
 onChange={(e) => setFormData({ ...formData, co_applicant_aadhaar: e.target.value })}
 placeholder="856341256523"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">PAN Card Number</label>
 <input
 type="text"
 value={formData.co_applicant_pan}
 onChange={(e) => setFormData({ ...formData, co_applicant_pan: e.target.value })}
 placeholder="AXIPS5265F"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 {/* Document Re-Apply & Exposure Alert */}
 {renderDocumentAlert('co_applicant', 'Co-Applicant')}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="sm:col-span-3">
 <div className="flex items-center justify-between mb-1">
   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Full Address</label>
   {formData.address && (
     <button
       type="button"
       onClick={() => {
         setFormData((prev) => ({
           ...prev,
           co_applicant_address: prev.address,
           co_applicant_district: prev.district,
           co_applicant_state: prev.state,
           co_applicant_pin: prev.pin_code
         }));
       }}
       className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
     >
       Copy from Borrower &rarr;
     </button>
   )}
 </div>
 <input
 type="text"
 value={formData.co_applicant_address}
 onChange={(e) => setFormData({ ...formData, co_applicant_address: e.target.value })}
 placeholder="SEKA"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">PIN Code</label>
   {pinLoading.co_applicant ? (
     <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
       <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
     </span>
   ) : pinMsg.co_applicant ? (
     <span className={`text-[10px] font-bold truncate max-w-[190px] ${pinMsg.co_applicant.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} title={pinMsg.co_applicant}>
       {pinMsg.co_applicant}
     </span>
   ) : (
     <span className="text-[10px] text-slate-400 font-medium">Auto-picks City/State</span>
   )}
 </div>
 <div className="relative">
   <input
   type="text"
   maxLength={6}
   value={formData.co_applicant_pin}
   onChange={(e) => handlePinCodeChange('co_applicant', e.target.value)}
   placeholder="123001"
   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-9 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
   />
   <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
     <MapPin className="h-4 w-4" />
   </div>
 </div>
  </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">District / City</label>
  </div>
 <input
 type="text"
 value={formData.co_applicant_district}
 onChange={(e) => setFormData({ ...formData, co_applicant_district: e.target.value })}
 placeholder="MAHEDERGARH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">State</label>
  </div>
 <input
 type="text"
 value={formData.co_applicant_state}
 onChange={(e) => setFormData({ ...formData, co_applicant_state: e.target.value })}
 placeholder="Haryana"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>
 </div>
 )}

 {/* STEP 3: Guarantor Information */}
 {currentStep === 3 && (
 <div className="space-y-4">
  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
    <div className="flex items-center space-x-2">
      <h4 className="font-bold text-slate-900 dark:text-white text-base">Step 3: Guarantor Information</h4>
      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700/60">Optional</span>
    </div>
    <button
      type="button"
      onClick={() => setCurrentStep(4)}
      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer transition-colors"
    >
      <span>Skip Step &rarr;</span>
    </button>
  </div>
  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
    Guarantor is not mandatory. If this loan does not require a guarantor, you may leave these fields blank and proceed.
  </div>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Full Name</label>
 <input
 type="text"
 value={formData.guarantor_name}
 onChange={(e) => setFormData({ ...formData, guarantor_name: e.target.value })}
 placeholder="SURESH KUMAR"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Father / Husband Name</label>
 <input
 type="text"
 value={formData.guarantor_father_husband}
 onChange={(e) => setFormData({ ...formData, guarantor_father_husband: e.target.value })}
 placeholder="DALIP SINGH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Mobile Number</label>
 <input
 type="tel"
 value={formData.guarantor_phone}
 onChange={(e) => setFormData({ ...formData, guarantor_phone: e.target.value })}
 placeholder="8965321470"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Date of Birth</label>
 <input
 type="date"
 value={formData.guarantor_dob}
 onChange={(e) => setFormData({ ...formData, guarantor_dob: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Gender</label>
 <select
 value={formData.guarantor_gender}
 onChange={(e) => setFormData({ ...formData, guarantor_gender: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Aadhaar Number</label>
 <input
 type="text"
 value={formData.guarantor_aadhaar}
 onChange={(e) => setFormData({ ...formData, guarantor_aadhaar: e.target.value })}
 placeholder="963285217412"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">PAN Card Number</label>
 <input
 type="text"
 value={formData.guarantor_pan}
 onChange={(e) => setFormData({ ...formData, guarantor_pan: e.target.value })}
 placeholder="AXZPS5632F"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 {/* Document Re-Apply & Exposure Alert */}
 {renderDocumentAlert('guarantor', 'Guarantor')}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="sm:col-span-3">
 <div className="flex items-center justify-between mb-1">
   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Full Address</label>
   {formData.address && (
     <button
       type="button"
       onClick={() => {
         setFormData((prev) => ({
           ...prev,
           guarantor_address: prev.address,
           guarantor_district: prev.district,
           guarantor_state: prev.state,
           guarantor_pin: prev.pin_code
         }));
       }}
       className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
     >
       Copy from Borrower &rarr;
     </button>
   )}
 </div>
 <input
 type="text"
 value={formData.guarantor_address}
 onChange={(e) => setFormData({ ...formData, guarantor_address: e.target.value })}
 placeholder="NARNAUL"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
   <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">PIN Code</label>
   {pinLoading.guarantor ? (
     <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
       <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
     </span>
   ) : pinMsg.guarantor ? (
     <span className={`text-[10px] font-bold truncate max-w-[190px] ${pinMsg.guarantor.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} title={pinMsg.guarantor}>
       {pinMsg.guarantor}
     </span>
   ) : (
     <span className="text-[10px] text-slate-400 font-medium">Auto-picks City/State</span>
   )}
 </div>
 <div className="relative">
   <input
   type="text"
   maxLength={6}
   value={formData.guarantor_pin}
   onChange={(e) => handlePinCodeChange('guarantor', e.target.value)}
   placeholder="123001"
   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-9 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
   />
   <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
     <MapPin className="h-4 w-4" />
   </div>
 </div>
  </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">District / City</label>
  </div>
 <input
 type="text"
 value={formData.guarantor_district}
 onChange={(e) => setFormData({ ...formData, guarantor_district: e.target.value })}
 placeholder="MAHENDERGARH"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between mb-1 min-h-[18px]">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">State</label>
  </div>
 <input
 type="text"
 value={formData.guarantor_state}
 onChange={(e) => setFormData({ ...formData, guarantor_state: e.target.value })}
 placeholder="Haryana"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>
 </div>
 )}

 {/* STEP 4: Loan Details & Repayment Terms */}
  {currentStep === 4 && (
  <div className="space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
    <div>
      <h4 className="font-bold text-slate-900 dark:text-white text-base">Step 4: Loan Amount & Repayment Terms</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">Configure sanctioned loan principal, interest rate, and repayment tenure.</p>
    </div>
    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
      Limit: ₹1,000 to ₹2,00,000
    </span>
  </div>

  {/* Loan Lifecycle Milestone Dates */}
  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-2.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">Lifecycle Milestone Dates</span>
      </div>
      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
        Regulatory & Audit Milestones
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Lead Origination / Inquiry Date <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.lead_date || ''}
          onChange={(e) => setFormData({ ...formData, lead_date: e.target.value })}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Date when customer inquiry / lead was registered.</p>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Application Submission Date <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.application_date || ''}
          onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Formal loan application filing date.</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 text-[10px] text-slate-500 dark:text-slate-400">
      <div>• <strong>Sanction / Approval Date:</strong> Set automatically upon credit review</div>
      <div>• <strong>Disbursal Date:</strong> Set automatically upon release of funds</div>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
  <div>
  <div className="flex justify-between items-center mb-1">
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Fill Loan Amount (Rs.) <span className="text-rose-500">*</span></label>
  </div>
  <input
  type="number"
  required
  min="1000"
  max="200000"
  value={formData.loan_amount}
  onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
  placeholder="50000"
  className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 ${parseFloat(formData.loan_amount || 0) > 200000 ? 'border-rose-500 focus:ring-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'}`}
  />
  {parseFloat(formData.loan_amount || 0) > 200000 ? (
    <p className="text-[11px] text-rose-500 font-bold mt-1">⚠️ Exceeds microfinance limit! Maximum ₹2,00,000 allowed.</p>
  ) : (
    <p className="text-[10px] text-slate-400 mt-1">Eligible: ₹1,000 to ₹2,00,000</p>
  )}
  </div>
  <div>
  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Interest Rate % p.a. <span className="text-rose-500">*</span></label>
  <input
  type="number"
  step="0.1"
  required
  value={formData.interest_rate}
  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
  placeholder="14.5"
  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
  </div>
  <div>
  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Repayment Tenure (Months) <span className="text-rose-500">*</span></label>
  <input
  type="number"
  required
  min="1"
  value={formData.tenure_months}
  onChange={(e) => setFormData({ ...formData, tenure_months: e.target.value })}
  placeholder="24"
  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
  />
  </div>
  </div>

  {/* Exact Live Calculator Breakdown Card */}
  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-lg space-y-3">
  <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
  <div>
  <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider block">Monthly Installment (EMI)</span>
  <span className="text-3xl font-black text-white">Rs. {calculatedEmi.toLocaleString()}</span>
  </div>
  <div className="text-right">
  <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider block">Total Payment</span>
  <span className="text-xl font-extrabold text-emerald-400">Rs. {totalPayment.toLocaleString()}</span>
  </div>
  </div>

  <div className="flex justify-between items-center text-xs">
  <span className="text-slate-300">Total Interest Amount</span>
  <span className="font-extrabold text-teal-400">Rs. {interestAmount.toLocaleString()}</span>
  </div>
  <p className="text-[11px] text-slate-400 font-medium">
  Estimated calculation at {rate}% annual interest rate for {months} months.
  </p>
  </div>
  </div>
  )}

  {/* STEP 5: Income & Employment Information */}
 {currentStep === 5 && (
 <div className="space-y-4">
 <h4 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-2">Step 5: Income and Employment Information</h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Employment Type <span className="text-rose-500">*</span></label>
 <select
 value={formData.employment_type}
 onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Salaried">Salaried</option>
 <option value="Self-Employed">Self-Employed</option>
 <option value="Business">Business Owner</option>
 <option value="Agriculture">Agriculture</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Occupation / Work Area</label>
 <input
 type="text"
 value={formData.occupation}
 onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
 placeholder="e.g. cloth shop, farming, etc."
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Monthly Income <span className="text-rose-500">*</span></label>
 <select
 value={formData.monthly_income_range}
 onChange={(e) => setFormData({ ...formData, monthly_income_range: e.target.value })}
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 >
 <option value="Rs. 0 - Rs. 5,000">Rs. 0 - Rs. 5,000</option>
 <option value="Rs. 5,000 - Rs. 15,000">Rs. 5,000 - Rs. 15,000</option>
 <option value="Rs. 15,000 - Rs. 30,000">Rs. 15,000 - Rs. 30,000</option>
 <option value="Rs. 30,000+">Rs. 30,000+</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Earning Members in Family</label>
 <input
 type="number"
 min="1"
 value={formData.earning_members}
 onChange={(e) => setFormData({ ...formData, earning_members: e.target.value })}
 placeholder="3"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>

  {/* Bank & Disbursement Account */}
  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
      Bank Account & Disbursement Details
    </h5>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
          Bank Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          list="bank-names-list"
          value={formData.bank_name}
          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
          placeholder="e.g. State Bank of India"
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <datalist id="bank-names-list">
          <option value="State Bank of India" />
          <option value="Punjab National Bank" />
          <option value="Bank of Baroda" />
          <option value="HDFC Bank" />
          <option value="ICICI Bank" />
          <option value="Canara Bank" />
          <option value="Union Bank of India" />
          <option value="Axis Bank" />
          <option value="Sarva Haryana Gramin Bank" />
          <option value="Central Bank of India" />
        </datalist>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
          Account Holder Name
        </label>
        <input
          type="text"
          value={formData.account_holder_name}
          onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
          placeholder={formData.customer_name || "Applicant Name"}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Bank Account Number <span className="text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={formData.bank_account_no}
          onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
          placeholder="Account Number"
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">IFSC Code <span className="text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={formData.bank_ifsc}
          onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
          placeholder="e.g. SBIN0001234"
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">MICR Code (Optional)</label>
        <input
          type="text"
          value={formData.bank_micr}
          onChange={(e) => setFormData({ ...formData, bank_micr: e.target.value })}
          placeholder="1234001"
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Reference Name</label>
 <input
 type="text"
 value={formData.reference_name}
 onChange={(e) => setFormData({ ...formData, reference_name: e.target.value })}
 placeholder="Reference person name"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Reference Mobile</label>
 <input
 type="tel"
 value={formData.reference_phone}
 onChange={(e) => setFormData({ ...formData, reference_phone: e.target.value })}
 placeholder="10 digit mobile number"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Reference Relation</label>
 <input
 type="text"
 value={formData.reference_relation}
 onChange={(e) => setFormData({ ...formData, reference_relation: e.target.value })}
 placeholder="Relation"
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
 />
 </div>
 </div>
 </div>
 )}

 {/* STEP 6: Documents and Consent */}
  {currentStep === 6 && (
  <div className="space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
    <div>
      <h4 className="font-bold text-slate-900 dark:text-white text-base">Step 6: Documents and Consent</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">Upload document photos or PDFs for borrower verification. Live image preview thumbnails available.</p>
    </div>
    <div className="flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 w-fit">
      <Camera className="h-3.5 w-3.5" />
      <span className="font-semibold">
        {Object.keys(formData).filter(k => k.startsWith('doc_') && Boolean(formData[k])).length} of 7 Uploaded
      </span>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
    {documentConfigs.map((doc) => {
      const fileData = formData[doc.key];
      const meta = docMeta[doc.key];
      const isPdf = fileData && (fileData.startsWith('data:application/pdf') || meta?.isPdf);
      const isUploading = uploadingDocKey === doc.key;

      return (
        <div
          key={doc.key}
          className={`relative rounded-xl border transition-all duration-200 p-3 flex flex-col justify-between ${
            fileData
              ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
              : 'bg-slate-50/70 dark:bg-slate-950/50 border-dashed border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Thumbnail Preview or Upload Dropzone Trigger */}
            {fileData ? (
              <div
                onClick={() => setPreviewModalDoc({ title: doc.title, dataUrl: fileData, isPdf, tag: doc.tag })}
                className="relative group w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all flex items-center justify-center"
                title="Click to view full preview"
              >
                {isPdf ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center text-rose-500">
                    <FileText className="h-8 w-8" />
                    <span className="text-[9px] font-black uppercase mt-1">PDF Doc</span>
                  </div>
                ) : (
                  <img
                    src={fileData}
                    alt={doc.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                )}
                {/* Hover Overlay with Zoom Eye */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                  <ZoomIn className="h-5 w-5 text-white drop-shadow-md" />
                </div>
              </div>
            ) : (
              <label
                htmlFor={`upload-${doc.key}`}
                className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-indigo-600 group"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-indigo-500" />
                    <span className="text-[10px] font-bold mt-1 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600">Upload</span>
                  </>
                )}
              </label>
            )}

            {/* Metadata & Controls */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap mb-1">
                <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-md border ${doc.badgeBg}`}>
                  {doc.tag}
                </span>
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {doc.title}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">
                {meta?.fileName ? meta.fileName : doc.desc}
              </p>

              {/* Status Indicator & Buttons */}
              <div className="flex items-center justify-between gap-2">
                {fileData ? (
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Ready {meta?.fileSize ? `(${meta.fileSize})` : ''}</span>
                  </div>
                ) : (
                  <span className="text-[10.5px] text-slate-400 dark:text-slate-500 italic">
                    No file chosen
                  </span>
                )}

                <div className="flex items-center space-x-1.5">
                  {fileData ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewModalDoc({ title: doc.title, dataUrl: fileData, isPdf, tag: doc.tag })}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Preview image"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Preview</span>
                      </button>
                      <label
                        htmlFor={`upload-${doc.key}`}
                        className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Replace document"
                      >
                        <span>Change</span>
                      </label>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveDocument(doc.key, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label
                      htmlFor={`upload-${doc.key}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Choose File</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            id={`upload-${doc.key}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
            capture="environment"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleDocumentUpload(doc.key, e.target.files[0]);
              }
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      );
    })}
  </div>

  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 mt-4">
 <p className="text-xs text-slate-300 leading-relaxed">
 As per {settings.institution_name || 'the institution'} rules, I confirm that the information provided above is correct and true. I understand that false information may lead to cancellation of the application.
 </p>
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="terms"
 required
 checked={formData.terms_accepted}
 onChange={(e) => setFormData({ ...formData, terms_accepted: e.target.checked })}
 className="h-4 w-4 text-indigo-600 rounded border-slate-700"
 />
 <label htmlFor="terms" className="text-xs font-bold text-white cursor-pointer">
 I accept all terms and conditions. *
 </label>
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">Field Verification / Officer Remark Notes <span className="text-rose-500">*</span></label>
 <textarea
 rows="2"
 required
 value={formData.additional_notes}
 onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
 placeholder="Enter field verification remarks or officer comments..."
 className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
 ></textarea>
 </div>
 </div>
 )}

  {/* Navigation & Action Buttons */}
  <div className="pt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
  {currentStep > 1 ? (
  <button
  type="button"
  onClick={() => setCurrentStep(currentStep - 1)}
  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950 text-sm font-semibold transition-colors cursor-pointer"
  >
  <ArrowLeft className="h-4 w-4" />
  <span>Back</span>
  </button>
  ) : <div></div>}

  <div className="flex items-center space-x-2.5">
    {/* Save Draft Button on Every Step (Only for new applications) */}
    {!editingLoanId && (
      <button
        type="button"
        onClick={handleSaveDraft}
        className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
          isDraftSaved
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 ring-2 ring-emerald-500/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300'
        }`}
        title="Save your progress on this step to resume anytime"
      >
        {isDraftSaved ? (
          <>
            <Check className="h-4 w-4 text-emerald-400 animate-in zoom-in duration-150" />
            <span>Saved!</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span>Save Draft</span>
          </>
        )}
      </button>
    )}

    {currentStep < 6 ? (
    <button
    type="button"
    onClick={handleNextStep}
    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
    >
    <span>Next Step</span>
    <ArrowRight className="h-4 w-4" />
    </button>
    ) : (
    <button
    type="submit"
    disabled={submitting}
    className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg cursor-pointer transition-all ${
      editingLoanId
        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
    }`}
    >
    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
    <span>{editingLoanId ? 'Save & Update Application' : 'Submit Application'}</span>
    </button>
    )}
  </div>
  </div>
 </form>
 </div>
 </div>
 )}

  {/* CSV Import Modal (Admin Only) */}
  {isAdmin && showImportModal && (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-200">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Bulk Import Historical Loan & Borrower Records</h3>
              <p className="text-xs text-teal-200/80">Upload CSV from offline Excel or legacy software. Calculations and IDs are handled automatically.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!importing) {
                setShowImportModal(false);
                handleResetImportModal();
              }
            }}
            disabled={importing}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300 flex-1">
          {!importResult ? (
            <>
              {/* Sample Template Bar */}
              <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    Need the template format?
                  </p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300/80">
                    Download our sample CSV with column headers and sample borrower records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  disabled={downloadingSample}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {downloadingSample ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessCsvFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDraggingFile
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                }`}
              >
                <input
                  type="file"
                  id="loan-csv-file-input"
                  accept=".csv, text/csv, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessCsvFile(e.target.files[0]);
                    }
                  }}
                />

                {!csvFile ? (
                  <label htmlFor="loan-csv-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        Click to upload or drag & drop CSV file
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Standard CSV (*.csv) exported from Excel, Tally, or legacy software
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                      UTF-8 Encoded • Max 5,000 Rows per batch
                    </span>
                  </label>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-teal-200 dark:border-teal-800 shadow-xs">
                    <div className="flex items-center space-x-3 text-left">
                      <div className="p-2.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs break-all">
                          {csvFileName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {(csvFile.size / 1024).toFixed(1)} KB • {csvParsedRows.length} Records Found
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="loan-csv-file-input"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        Change File
                      </label>
                      <button
                        type="button"
                        onClick={handleResetImportModal}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer rounded-lg"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {csvParseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start space-x-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Import Warning</p>
                    <p className="mt-0.5">{csvParseError}</p>
                  </div>
                </div>
              )}

              {/* Live Preview Table */}
              {csvParsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        CSV Preview (Showing First {csvPreviewRows.length} of {csvParsedRows.length} Rows)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                        Ready to Import
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Auto-generating CIF & Agreement Nos
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-extrabold text-[9px] border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 px-2.5">#</th>
                            <th className="py-2 px-2.5">Borrower Name</th>
                            <th className="py-2 px-2.5">Mobile</th>
                            <th className="py-2 px-2.5">Aadhaar</th>
                            <th className="py-2 px-2.5">Amount</th>
                            <th className="py-2 px-2.5">Tenure</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {csvPreviewRows.map((r, idx) => {
                            const name = r.customer_name || r.name || r['Borrower Full Name'] || r['Borrower Name'] || r.borrower_name || r['Borrower'] || 'N/A';
                            const phone = r.phone || r.mobile || r['Primary Mobile'] || r['Mobile'] || r['Mobile Number'] || r.contact || 'N/A';
                            const aadhaar = r.aadhaar_number || r.aadhaar || r['Aadhaar Number'] || r['Aadhaar'] || 'N/A';
                            const rawAmt = r.loan_amount || r['Sanctioned Principal'] || r['Loan Amount'] || r['Amount'] || r.principal || r.amount || 0;
                            const amt = parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
                            const tenure = (r.tenure_months || r['Tenure (Months)'] || r.tenure || '24') + ' Mos';
                            const status = r.status || r['Status'] || 'Active';

                            return (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-1.5 px-2.5 font-bold text-slate-400">{idx + 1}</td>
                                <td className="py-1.5 px-2.5 font-bold text-slate-800 dark:text-slate-100 uppercase">{name}</td>
                                <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">{phone}</td>
                                <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-500">{aadhaar}</td>
                                <td className="py-1.5 px-2.5 font-bold text-emerald-600">₹{amt.toLocaleString()}</td>
                                <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">{tenure}</td>
                                <td className="py-1.5 px-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import Result Success Screen */
            <div className="py-6 space-y-5 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  CSV Import Completed!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Historical borrower records have been registered with full EMI calculations and audit logs.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="block text-xl font-black text-slate-800 dark:text-slate-100">
                    {importResult.total}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <span className="block text-xl font-black">
                    {importResult.imported}
                  </span>
                  <span className="text-[10px] uppercase font-bold">Imported</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  <span className="block text-xl font-black">
                    {importResult.skipped}
                  </span>
                  <span className="text-[10px] uppercase font-bold">Skipped</span>
                </div>
              </div>

              {/* Skipped Details if any */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="max-w-lg mx-auto p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-left space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold flex items-center gap-1.5 text-[11px]">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    Skipped Rows / Validation Notices:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800 dark:text-amber-300 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, eIdx) => (
                      <li key={eIdx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {!importResult ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  handleResetImportModal();
                }}
                disabled={importing}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || csvParsedRows.length === 0}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing {csvParsedRows.length} Records...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Confirm & Import {csvParsedRows.length > 0 ? `${csvParsedRows.length} Records` : ''}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetImportModal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  handleResetImportModal();
                }}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <Check className="h-4 w-4" />
                <span>View Directory Records</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
    {/* Document Image Lightbox Modal */}
  {previewModalDoc && (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            {previewModalDoc.tag && (
              <span className="px-2 py-0.5 text-xs font-black rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                {previewModalDoc.tag}
              </span>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {previewModalDoc.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Document Verification Preview
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {previewModalDoc.dataUrl && (
              <a
                href={previewModalDoc.dataUrl}
                download={`${previewModalDoc.title.replace(/\s+/g, '_')}_Document`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Download Document"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setPreviewModalDoc(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-auto flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/80 flex-1 min-h-[300px]">
          {previewModalDoc.isPdf ? (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <FileText className="h-16 w-16 text-rose-500" />
              <h4 className="font-bold text-base text-slate-900 dark:text-white">PDF Document Attached</h4>
              <p className="text-xs text-slate-500 max-w-md">
                This document is saved in PDF format. You can open or download it to view all pages in high quality.
              </p>
              <a
                href={previewModalDoc.dataUrl}
                target="_blank"
                rel="noreferrer"
                download={`${previewModalDoc.title.replace(/\s+/g, '_')}.pdf`}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Open / Download PDF</span>
              </a>
            </div>
          ) : (
            <div className="relative group max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={previewModalDoc.dataUrl}
                alt={previewModalDoc.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Official Loan Application Attachment</span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewModalDoc(null)}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}
  </>
 );
}
