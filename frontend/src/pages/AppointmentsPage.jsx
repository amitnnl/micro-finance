import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  X,
  ArrowRight,
  Download,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Check,
  AlertCircle,
  Phone,
  MessageCircle,
  RotateCcw
} from 'lucide-react';
import ActionDropdown from '../components/ActionDropdown';

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // CSV Import / Export States
  const [exporting, setExporting] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvParsedRows, setCsvParsedRows] = useState([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvParseError, setCsvParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

 const [formData, setFormData] = useState({
 client_name: '',
 phone: '',
 aadhaar_number: '',
 loan_amount: '',
 lead_date: new Date().toISOString().split('T')[0],
 source_type: 'Direct',
 referral_name: '',
 email: '',
 address: ''
 });

 const fetchAppointments = async () => {
 setLoading(true);
 try {
 const res = await api.get('appointments');
 if (res.success) {
 setAppointments(res.data.appointments || []);
 }
 } catch (err) {
 console.error('Error fetching appointments:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchAppointments();
 }, []);

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(formData.loan_amount || 0);
    if (amt > 200000) {
      alert('Microfinance Limit: Lead requested loan amount cannot exceed ₹2,00,000 (2 Lakhs maximum).');
      return;
    }
    if (formData.source_type === 'Referral' && !formData.referral_name?.trim()) {
      alert('Please enter the Referral Name for referral source.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('appointments', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({
          client_name: '',
          phone: '',
          aadhaar_number: '',
          loan_amount: '',
          lead_date: new Date().toISOString().split('T')[0],
          source_type: 'Direct',
          referral_name: '',
          email: '',
          address: ''
        });
        fetchAppointments();
      }
    } catch (err) {
      alert(err.message || 'Error creating lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status, reason = '', aptObj = null) => {
    try {
      const res = await api.put(`appointments/status`, { id, status, reject_reason: reason });
      if (res.success) {
        setShowRejectModal(false);
        setRejectReason('');
        if (status === 'Approved' && aptObj) {
          const targetApt = aptObj || appointments.find((a) => a.id === id);
          if (targetApt) {
            navigate('/loans', {
              state: {
                prefillLead: {
                  id: targetApt.id,
                  lead_id: targetApt.id,
                  name: targetApt.client_name,
                  phone: targetApt.phone,
                  amount: targetApt.loan_amount,
                  city: targetApt.address || targetApt.city,
                  aadhaar: targetApt.aadhaar_number,
                  lead_date: targetApt.lead_date || targetApt.created_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
                  reference_name: targetApt.referral_name || ''
                }
              }
            });
            return;
          }
        }
        fetchAppointments();
      }
    } catch (err) {
      alert(err.message || 'Error updating lead status');
    }
  };

  // CSV Helpers & Import/Export Handlers
  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return { headers: [], rows: [] };

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          if (inQuotes && line[i + 1] === char) {
            current += char;
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = lines[0];
    const headers = parseLine(headerLine).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const rowLine = lines[i];
      if (!rowLine) continue;
      const values = parseLine(rowLine).map(v => v.replace(/^["']|["']$/g, '').trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : '';
      });
      if (Object.values(row).some(v => v !== '')) {
        rows.push(row);
      }
    }

    return { headers, rows };
  };

  const getField = (row, candidates, fallback = '') => {
    if (!row) return fallback;
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
        return String(row[c]).trim();
      }
    }
    const keys = Object.keys(row);
    for (const k of keys) {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const c of candidates) {
        const target = c.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (clean === target && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
    }
    return fallback;
  };

  const getAmount = (row, candidates, defaultAmt = 50000) => {
    const raw = getField(row, candidates, '');
    if (!raw) return defaultAmt;
    const clean = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    return isNaN(clean) || clean <= 0 ? defaultAmt : Math.ceil(clean);
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
          setCsvParseError('The uploaded CSV file contains no readable data rows or column headers.');
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
      setCsvParseError('Access denied. Only Administrators can import lead data.');
      return;
    }
    if (!csvParsedRows || csvParsedRows.length === 0) {
      setCsvParseError('No rows available to import. Please select a valid CSV file.');
      return;
    }
    setImporting(true);
    setCsvParseError(null);
    try {
      const res = await api.post('appointments/import-csv', { rows: csvParsedRows });
      if (res.success) {
        setImportResult(res.data);
        fetchAppointments();
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
      alert('Access denied. Only Administrators can export lead data.');
      return;
    }
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`appointments/export-csv?${params.toString()}`, {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `Create_Lead_Directory_Export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error:', err);
      // Fallback: client-side CSV generation
      try {
        let csvContent = '\uFEFFLead / Apt No,Client Name,Mobile Phone,Aadhaar Number,Loan Amount (Rs),Lead Date,Source Type,Referral Name,Email Address,Address,City / Town,Appointment Date,Status,Created At\n';
        filteredAppointments.forEach(apt => {
          csvContent += `"${apt.appointment_no || ''}","${apt.client_name || ''}","${apt.phone || ''}","${apt.aadhaar_number || ''}","${apt.loan_amount || 0}","${apt.lead_date || ''}","${apt.source_type || 'Direct'}","${apt.referral_name || ''}","${apt.email || ''}","${apt.address || ''}","${apt.city || ''}","${apt.appointment_date || ''}","${apt.status || 'Pending'}","${apt.created_at || ''}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Create_Lead_Directory_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (clientErr) {
        alert('Failed to export create leads CSV: ' + (err.message || 'Server error'));
      }
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
      const res = await api.get('appointments/sample-csv', {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'create_lead_import_sample_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const sampleText = '\uFEFFclient_name,phone,aadhaar_number,loan_amount,lead_date,source_type,referral_name,email,address,status\nRAMESH SHARMA,9876543210,123456789012,50000,2026-10-04,Direct,,ramesh@example.com,VILL SEKA MAHENDERGARH,Pending\nSUNITA DEVI,9812345678,987654321098,75000,2026-10-04,Referral,ANIL VERMA,sunita@example.com,NARNAUL,Pending\n';
      const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'create_lead_import_sample_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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

  // Filter Logic
 const filteredAppointments = (appointments || []).filter((apt) => {
   if (!apt) return false;
   const q = (search || '').toLowerCase().trim();
   const matchesSearch = !q || (
     String(apt.client_name || '').toLowerCase().includes(q) ||
     String(apt.phone || '').toLowerCase().includes(q) ||
     String(apt.appointment_no || '').toLowerCase().includes(q) ||
     String(apt.aadhaar_number || '').includes(q) ||
     String(apt.address || '').toLowerCase().includes(q) ||
     String(apt.city || '').toLowerCase().includes(q)
   );
   const matchesStatus = !statusFilter || (
     statusFilter === 'Draft'
       ? (apt.status === 'Draft' || apt.status === 'Pending' || !apt.status)
       : statusFilter === 'Approved'
       ? (apt.status === 'Approved' || apt.status === 'Confirmed')
       : apt.status === statusFilter
   );
   return matchesSearch && matchesStatus;
 });

 // Pagination Logic
 const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / itemsPerPage));
 const indexOfLastItem = currentPage * itemsPerPage;
 const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="light-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-600">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              ADMIN DASHBOARD
            </span>
            <span className="inline-flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 space-x-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
              <span>Verified Directory</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Lead Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Manage lead entries, applicant screening, loan pre-approvals, and branch lead workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs disabled:opacity-50"
              title="Export create leads to CSV"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
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
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-200/80 dark:border-emerald-800/80 cursor-pointer shadow-xs"
              title="Import create leads from CSV"
            >
              <UploadCloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          {/* New Lead Button */}
          <button
            onClick={() => setShowModal(true)}
            className="emerald-btn cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="light-card p-3 sm:p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search client name, mobile, aadhaar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full light-input pl-9 text-xs"
            />
          </div>

          <div className="md:col-span-4 flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 rounded-lg px-2.5 h-[36px]">
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none w-full"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none w-full"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full light-input font-bold text-xs"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft (Pending)</option>
              <option value="Approved">Approved / Confirmed</option>
 <option value="Completed">Completed</option>
 <option value="Rejected">Rejected</option>
 </select>
 </div>
 </div>
 </div>

 {/* 3. 12-Column Data Table */}
 <div className="light-card overflow-hidden">
 {loading ? (
 <div className="flex flex-col items-center justify-center p-16 text-slate-500 dark:text-slate-400">
 <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-3" />
 <p className="text-sm font-bold">Loading Lead Directory...</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
 <th className="py-2 px-2.5">#</th>
 <th className="py-2 px-2.5">Name</th>
 <th className="py-2 px-2.5">Mobile Number</th>
 <th className="py-2 px-2.5">Aadhaar Number</th>
 <th className="py-2 px-2.5">Loan Amount</th>
 <th className="py-2 px-2.5">Source Type</th>
 <th className="py-2 px-2.5">Lead Date</th>
 <th className="py-2 px-2.5">Address</th>
 <th className="py-2 px-2.5">Time</th>
 <th className="py-2 px-2.5">Status</th>
 <th className="py-2 px-2.5">Reject Reason</th>
 <th className="py-2 px-2.5 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-xs">
 {currentItems.length > 0 ? (
 currentItems.map((apt, index) => {
 const rowNum = indexOfFirstItem + index + 1;
 return (
 <tr key={apt.id} className="hover:bg-emerald-50/50 transition-colors">
 <td className="py-2 px-2.5 text-slate-400 font-bold">{rowNum}</td>
 <td className="py-2 px-2.5 font-black text-slate-900 dark:text-white uppercase">{apt.client_name}</td>
 <td className="py-2 px-2.5 text-slate-700 dark:text-slate-200 font-semibold">{apt.phone}</td>
 <td className="py-2 px-2.5 font-mono text-slate-600 dark:text-slate-300">{apt.aadhaar_number || '654252634125'}</td>
 <td className="py-2 px-2.5 font-black text-emerald-700">
 ₹{parseFloat(apt.loan_amount || 200000).toLocaleString()}
 </td>
 <td className="py-2 px-2.5">
 <div className="flex flex-col gap-0.5">
 <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-black inline-block w-fit ${
 (apt.source_type || '').toLowerCase() === 'referral'
 ? 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
 : 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
 }`}>
 {apt.source_type || 'Direct'}
 </span>
 {apt.source_type === 'Referral' && apt.referral_name && (
 <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[130px]" title={`Referral: ${apt.referral_name}`}>
 Ref: {apt.referral_name}
 </span>
 )}
 </div>
 </td>
 <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 font-medium">{apt.lead_date || '12 Nov 1980'}</td>
 <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 uppercase">{apt.address || apt.city || 'VILL SEKA'}</td>
 <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
 {apt.created_at ? new Date(apt.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '24 Jul 2026, 04:17 PM'}
 </td>
 <td className="py-2 px-2.5">
   {(() => {
     const isDraft = apt.status === 'Draft' || apt.status === 'Pending' || !apt.status;
     const isApproved = apt.status === 'Approved' || apt.status === 'Confirmed';
     return (
       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
         isApproved
           ? 'bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
           : apt.status === 'Completed'
           ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white border border-slate-300 dark:border-slate-700'
           : apt.status === 'Rejected'
           ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
           : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
       }`}>
         {isApproved ? 'Approved' : apt.status === 'Completed' ? 'Completed' : apt.status === 'Rejected' ? 'Rejected' : 'Draft'}
       </span>
     );
   })()}
 </td>
 <td className="py-2 px-2.5 text-slate-400 italic">{apt.reject_reason || '-'}</td>
 <td className="py-2 px-2.5 text-right whitespace-nowrap">
   {(() => {
     const isDraft = apt.status === 'Draft' || apt.status === 'Pending' || !apt.status;
     const isApproved = apt.status === 'Approved' || apt.status === 'Confirmed';
     return (
       <ActionDropdown
         label="Actions"
         menuWidth={240}
         items={[
           isApproved && {
             header: 'Loan Origination'
           },
           isApproved && {
             label: 'Open Application',
             subLabel: '6-step loan application flow',
             icon: ArrowRight,
             iconColor: 'text-teal-600 dark:text-teal-400',
             badge: 'Sanction',
             badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
             onClick: () => navigate('/loans', {
               state: {
                 prefillLead: {
                   id: apt.id,
                   lead_id: apt.id,
                   name: apt.client_name,
                   phone: apt.phone,
                   amount: apt.loan_amount,
                   city: apt.address || apt.city,
                   aadhaar: apt.aadhaar_number,
                   lead_date: apt.lead_date || apt.created_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
                   reference_name: apt.referral_name || ''
                 }
               }
             })
           },
           isApproved && {
             label: 'Revert to Draft',
             subLabel: 'Move back to unconfirmed draft',
             icon: RotateCcw,
             iconColor: 'text-slate-500 dark:text-slate-400',
             onClick: () => handleStatusUpdate(apt.id, 'Pending', '', null)
           },
           isDraft && {
             header: 'Draft Application'
           },
           isDraft && {
             label: 'Open Loan Application',
             subLabel: 'Fill 6-step form in draft',
             icon: ArrowRight,
             iconColor: 'text-amber-600 dark:text-amber-400',
             badge: 'Draft',
             badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
             onClick: () => navigate('/loans', {
               state: {
                 prefillLead: {
                   id: apt.id,
                   lead_id: apt.id,
                   name: apt.client_name,
                   phone: apt.phone,
                   amount: apt.loan_amount,
                   city: apt.address || apt.city,
                   aadhaar: apt.aadhaar_number,
                   lead_date: apt.lead_date || apt.created_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
                   reference_name: apt.referral_name || ''
                 }
               }
             })
           },
           isDraft && {
             label: 'Confirm Lead',
             subLabel: 'Verify & approve lead inquiry',
             icon: CheckCircle2,
             iconColor: 'text-teal-600 dark:text-teal-400',
             badge: 'Confirm',
             badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
             onClick: () => handleStatusUpdate(apt.id, 'Approved', '', null)
           },
           isDraft && {
             label: 'Reject Lead',
             subLabel: 'Decline with reason notes',
             icon: XCircle,
             iconColor: 'text-rose-600 dark:text-rose-400',
             danger: true,
             onClick: () => { setSelectedAptId(apt.id); setShowRejectModal(true); }
           },
           { divider: true },
           { header: 'Direct Contact' },
           apt.phone && {
             label: 'WhatsApp Client',
             subLabel: `Chat with ${apt.phone}`,
             icon: MessageCircle,
             iconColor: 'text-emerald-600 dark:text-emerald-400',
             onClick: () => {
               const cleanPhone = (apt.phone || '').replace(/\D/g, '').slice(-10);
               window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${apt.client_name}, regarding your appointment with us...`)}`, '_blank');
             }
           },
           apt.phone && {
             label: 'Call Client',
             subLabel: apt.phone,
             icon: Phone,
             iconColor: 'text-sky-600 dark:text-sky-400',
             onClick: () => {
               window.open(`tel:${apt.phone}`, '_self');
             }
           }
         ].filter(Boolean)}
       />
     );
   })()}
 </td>
 </tr>
 );
 })
 ) : (
          <tr>
            <td colSpan="12" className="py-12 text-center text-slate-400 font-semibold">
              No lead records found matching your filters.
            </td>
          </tr>
        )}
 </tbody>
 </table>
 </div>
 )}

 {/* 4. Pagination Footer */}
 <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
 <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
 Showing <strong className="text-slate-900 dark:text-white">{indexOfFirstItem + 1}</strong> to{' '}
 <strong className="text-slate-900 dark:text-white">{Math.min(indexOfLastItem, filteredAppointments.length)}</strong> of{' '}
 <strong className="text-slate-900 dark:text-white">{filteredAppointments.length}</strong> total records
 </p>

 <div className="flex items-center space-x-2">
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="h-[40px] px-3.5 rounded-[12px] border border-slate-300 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1"
 >
 <ChevronLeft className="h-4 w-4" />
 <span>Previous</span>
 </button>

 <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-2 rounded-[12px] border border-emerald-200">
 Page {currentPage} of {totalPages}
 </span>

 <button
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 className="h-[40px] px-3.5 rounded-[12px] border border-slate-300 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1"
 >
 <span>Next</span>
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>

      {/* 5. Create Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="light-card w-full max-w-xl overflow-hidden my-6">
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-lg">Create New Lead</h3>
              </div>
 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 dark:text-slate-200">
 <X className="h-5 w-5" />
 </button>
 </div>

 <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 text-xs font-sans text-slate-900 dark:text-white">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Full Name *</label>
 <input
 type="text"
 required
 placeholder="YOGENDER SINGH"
 value={formData.client_name}
 onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
 className="w-full light-input"
 />
 </div>
 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Mobile Number *</label>
 <input
 type="tel"
 required
 placeholder="9876543210"
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className="w-full light-input"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Aadhaar Number</label>
 <input
 type="text"
 placeholder="6542 5263 4125"
 value={formData.aadhaar_number}
 onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
 className="w-full light-input"
 />
 </div>
  <div>
  <div className="flex justify-between items-center mb-1">
    <label className="block font-bold uppercase tracking-wider">Loan Amount (₹)</label>
    <span className="text-[10px] text-emerald-600 font-bold">Max ₹2 Lakhs</span>
  </div>
  <input
  type="number"
  min="1000"
  max="200000"
  placeholder="Max 200000"
  value={formData.loan_amount}
  onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
  className={`w-full light-input ${parseFloat(formData.loan_amount || 0) > 200000 ? 'border-rose-500 text-rose-600' : ''}`}
  />
  {parseFloat(formData.loan_amount || 0) > 200000 && (
    <p className="text-[10px] text-rose-500 font-bold mt-1">Exceeds ₹2,00,000 maximum limit</p>
  )}
  </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Lead Date</label>
 <input
 type="date"
 value={formData.lead_date}
 onChange={(e) => setFormData({ ...formData, lead_date: e.target.value })}
 className="w-full light-input"
 />
 </div>
 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Source Type *</label>
 <select
 value={formData.source_type}
 onChange={(e) => {
   const val = e.target.value;
   setFormData({
     ...formData,
     source_type: val,
     referral_name: val === 'Referral' ? formData.referral_name : ''
   });
 }}
 className="w-full light-input font-bold"
 >
 <option value="Direct">Direct</option>
 <option value="Referral">Referral</option>
 </select>
 </div>
 </div>

 {formData.source_type === 'Referral' && (
 <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
 <label className="block font-bold uppercase tracking-wider mb-1 text-teal-950 dark:text-teal-200">
 Referral Person / Referrer Name *
 </label>
 <input
 type="text"
 required
 placeholder="Enter referral person's full name (e.g. Ramesh Sharma)"
 value={formData.referral_name}
 onChange={(e) => setFormData({ ...formData, referral_name: e.target.value })}
 className="w-full light-input font-bold"
 />
 <p className="text-[10px] text-teal-700 dark:text-teal-300 mt-1 font-medium">
 Specify who referred this customer to the institution.
 </p>
 </div>
 )}

 <div>
 <label className="block font-bold uppercase tracking-wider mb-1">Full Address</label>
 <textarea
 rows="2"
 placeholder="VILL SEKA, MAHENDERGARH..."
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className="w-full light-input h-auto py-2"
 ></textarea>
 </div>

 <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
 <button
 type="button"
 onClick={() => setShowModal(false)}
 className="h-[48px] px-5 rounded-[12px] border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-950 font-bold"
 >
 Cancel
 </button>
          <button
            type="submit"
            disabled={submitting}
            className="emerald-btn"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Submit Lead</span>
          </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Reject Reason Modal */}
 {showRejectModal && (
 <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
 <div className="light-card w-full max-w-md overflow-hidden">
 <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
 <h3 className="font-bold text-base">Reject Lead Reason</h3>
 <button onClick={() => setShowRejectModal(false)} className="text-slate-300 hover:text-white">
 <X className="h-5 w-5" />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">Reason for Rejection</label>
 <textarea
 rows="3"
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="e.g. Invalid document / Low CIBIL score..."
 className="w-full light-input h-auto py-2"
 ></textarea>
 </div>
 <div className="flex justify-end space-x-3 pt-2">
 <button
 onClick={() => setShowRejectModal(false)}
 className="h-[44px] px-4 rounded-[12px] border border-slate-300 text-xs font-bold text-slate-700 dark:text-slate-200"
 >
 Cancel
 </button>
 <button
 onClick={() => handleStatusUpdate(selectedAptId, 'Rejected', rejectReason)}
 className="h-[44px] px-5 rounded-[12px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
 >
 Confirm Rejection
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

  {/* CSV Import Modal (Admin Only) */}
  {isAdmin && showImportModal && (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="light-card w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl my-auto">
        {/* Modal Header */}
        <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-800/80 flex items-center justify-center border border-emerald-700">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">Import Create Leads from CSV</h3>
              <p className="text-[11px] text-emerald-200 font-medium">Batch upload client leads, loan amounts, and contact details</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowImportModal(false);
              handleResetImportModal();
            }}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {!importResult ? (
            <>
              {/* Template Download Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Standard CSV Template
                  </span>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300 font-medium">
                    Download the pre-formatted Excel/CSV template with expected columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  disabled={downloadingSample}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {downloadingSample ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Sample Template</span>
                </button>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => document.getElementById('create-leads-csv-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  csvFile
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <UploadCloud className="h-6 w-6" />
                </div>
                {csvFileName ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{csvFileName}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold">Click to select a different file</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Click to browse or drop your CSV file here
                    </p>
                    <p className="text-[11px] text-slate-500">Supported format: .csv (UTF-8 encoded)</p>
                  </div>
                )}
                <input
                  id="create-leads-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessCsvFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Error Notification */}
              {csvParseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{csvParseError}</span>
                </div>
              )}

              {/* Preview Table */}
              {csvPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Data Preview ({csvParsedRows.length} total records detected):
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Showing first {csvPreviewRows.length} rows
                    </span>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold">
                        <tr>
                          <th className="py-2 px-2.5">Client Name</th>
                          <th className="py-2 px-2.5">Phone</th>
                          <th className="py-2 px-2.5">Aadhaar</th>
                          <th className="py-2 px-2.5">Loan Amount</th>
                          <th className="py-2 px-2.5">Source</th>
                          <th className="py-2 px-2.5">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                        {csvPreviewRows.map((r, i) => {
                          const clientName = getField(r, ['client_name', 'name', 'client name', 'borrower full name', 'applicant name', 'full name', 'borrower name', 'customer name', 'borrower', 'customer', 'applicant']) || 'N/A';
                          const phone = getField(r, ['phone', 'mobile', 'mobile number', 'mobile phone', 'primary mobile', 'contact', 'phone number', 'primary phone', 'mobile no', 'contact no']) || 'N/A';
                          const aadhaar = getField(r, ['aadhaar_number', 'aadhaar', 'aadhar', 'aadhaar number', 'aadhar number', 'uid', 'uidai']) || '—';
                          const amount = getAmount(r, ['loan_amount', 'amount', 'sanctioned principal', 'loan amount (rs)', 'requested amount', 'principal', 'sanctioned amount', 'loan amt', 'principal amount']);
                          const source = getField(r, ['source_type', 'source', 'source type', 'lead source', 'channel']) || 'Direct';
                          const refName = getField(r, ['referral_name', 'referrer', 'referred_by', 'referral', 'ref_name']) || '';
                          const address = getField(r, ['address', 'city', 'location', 'full address', 'city / town', 'city / location', 'town', 'district', 'village']) || '—';

                          return (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-1.5 px-2.5 font-bold uppercase text-slate-900 dark:text-white">
                                {clientName}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono">{phone}</td>
                              <td className="py-1.5 px-2.5 font-mono">{aadhaar}</td>
                              <td className="py-1.5 px-2.5 font-bold text-emerald-600">
                                ₹{amount.toLocaleString()}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <div>
                                  <span className="font-semibold">{source}</span>
                                  {refName && <span className="block text-[9px] text-slate-400">Ref: {refName}</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-2.5 uppercase text-slate-500">{address}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import Success Result Screen */
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Import Complete!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Batch processed <strong>{importResult.total}</strong> records.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold">Successfully Added</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{importResult.imported}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Skipped / Invalid</span>
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{importResult.skipped}</span>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-left max-w-lg mx-auto">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Skipped Rows / Validation Notices ({importResult.errors.length}):</span>
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-amber-700 dark:text-amber-300 font-mono">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="bg-amber-100/60 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-end space-x-2">
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
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing {csvParsedRows.length} Leads...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Confirm & Import {csvParsedRows.length > 0 ? `${csvParsedRows.length} Leads` : ''}</span>
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
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                <Check className="h-4 w-4" />
                <span>View Create Leads</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
 </div>
 );
}
