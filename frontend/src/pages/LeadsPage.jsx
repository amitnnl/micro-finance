import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Search, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Phone, 
  MapPin, 
  DollarSign, 
  FileText, 
  X,
  Shield,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Check,
  AlertCircle,
  MessageCircle,
  RotateCcw
} from 'lucide-react';
import ActionDropdown from '../components/ActionDropdown';

export default function LeadsPage() {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    amount: '',
    loan_type: 'Microfinance Loan',
    notes: ''
  });

  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('leads');
      if (res.success) {
        setLeads(res.data.leads || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount || 0);
    if (amt > 200000) {
      alert('Microfinance limit: Requested loan amount cannot exceed ₹2,00,000 (2 Lakhs maximum).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('leads', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          city: '',
          amount: '',
          loan_type: 'Microfinance Loan',
          notes: ''
        });
        fetchLeads();
      }
    } catch (err) {
      alert(err.message || 'Failed to create web lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (lead, status) => {
    try {
      const res = await api.put(`leads/status`, { id: lead.id, status });
      if (res.success) {
        if (status === 'Approved') {
          navigate('/loans', { state: { prefillLead: lead } });
        } else {
          fetchLeads();
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to update lead status');
    }
  };

  const handleConvertToLoan = (lead) => {
    navigate('/loans', { state: { prefillLead: lead } });
  };

  // CSV Helpers
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
      alert('Access denied. Only Administrators can import lead data.');
      return;
    }
    if (!csvParsedRows || csvParsedRows.length === 0) {
      setCsvParseError('No rows available to import. Please select a valid CSV file.');
      return;
    }
    setImporting(true);
    setCsvParseError(null);
    try {
      const res = await api.post('leads/import-csv', { rows: csvParsedRows });
      if (res.success) {
        setImportResult(res.data);
        fetchLeads();
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
      const res = await api.get(`leads/export-csv?search=${encodeURIComponent(search)}`, {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `External_Leads_Export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error:', err);
      // Fallback: client-side CSV generation
      try {
        let csvContent = '\uFEFFLead No,Applicant Name,Mobile Phone,Email Address,City / Location,Requested Amount,Status,Created At\n';
        filteredLeads.forEach(l => {
          csvContent += `"${l.lead_no || ''}","${l.name || ''}","${l.phone || ''}","${l.email || ''}","${l.city || ''}","${l.amount || 0}","${l.status || 'Pending'}","${l.created_at || ''}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `External_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (clientErr) {
        alert('Failed to export leads CSV: ' + (err.message || 'Server error'));
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
      const res = await api.get('leads/sample-csv', {
        responseType: 'blob'
      });
      const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'external_lead_import_sample_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const sampleText = '\uFEFFname,phone,email,city,amount,status\nSITA DEVI,9876543210,sita.devi@example.com,NARNAUL,50000,Pending\nRAJESH KUMAR,9812345678,rajesh.kumar@example.com,MAHENDERGARH,100000,Pending\n';
      const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'external_lead_import_sample_template.csv';
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

  const filteredLeads = (leads || []).filter((l) => {
    if (!l) return false;
    const q = (search || '').toLowerCase().trim();
    if (!q) return true;
    const name = String(l.name || '').toLowerCase();
    const phone = String(l.phone || '').toLowerCase();
    const city = String(l.city || '').toLowerCase();
    const leadNo = String(l.lead_no || '').toLowerCase();
    const loanType = String(l.loan_type || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || city.includes(q) || leadNo.includes(q) || loanType.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="light-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-emerald-600">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">External Lead Inquiries</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Manage web inquiries, phone leads, applicant screening, and 1-click conversion to 6-step loan applications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs disabled:opacity-50"
              title="Export external leads to CSV"
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
              title="Import external leads from CSV"
            >
              <UploadCloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          {/* New Web Lead */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="emerald-btn cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Web Lead</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="light-card p-3 sm:p-3.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search external leads by applicant name, mobile, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full light-input pl-10"
          />
        </div>
      </div>

      {/* 8-Column Data Table */}
      <div className="light-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs font-bold">Loading External Leads...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">Loan Amount</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead, index) => (
                    <tr key={lead.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-bold">{index + 1}</td>
                      <td className="py-2 px-3 font-black text-slate-900 dark:text-white uppercase">{lead.name}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-200 font-semibold">{lead.phone}</td>
                      <td className="py-2 px-3 font-extrabold text-emerald-700">
                        ₹{parseFloat(lead.amount || 50000).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 uppercase">{lead.city || 'narnaul'}</td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '28 Jul 2026, 01:22 PM'}
                      </td>
                      <td className="py-2 px-3">
                        {(() => {
                          const isDraft = lead.status === 'Draft' || lead.status === 'Pending' || !lead.status;
                          const isApproved = lead.status === 'Approved' || lead.status === 'Confirmed';
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isApproved
                                ? 'bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                                : lead.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {isApproved ? 'Approved' : lead.status === 'Rejected' ? 'Rejected' : 'Draft'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {(() => {
                          const isDraft = lead.status === 'Draft' || lead.status === 'Pending' || !lead.status;
                          const isApproved = lead.status === 'Approved' || lead.status === 'Confirmed';
                          return (
                            <ActionDropdown
                              label="Actions"
                              menuWidth={230}
                              items={[
                                isApproved && {
                                  header: 'Loan Origination'
                                },
                                isApproved && {
                                  label: 'Convert to Loan',
                                  subLabel: 'Start loan application dossier',
                                  icon: ArrowRight,
                                  iconColor: 'text-teal-600 dark:text-teal-400',
                                  badge: 'Sanction',
                                  badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                                  onClick: () => handleConvertToLoan(lead)
                                },
                                isApproved && {
                                  label: 'Revert to Draft',
                                  subLabel: 'Move back to unconfirmed draft',
                                  icon: RotateCcw,
                                  iconColor: 'text-slate-500 dark:text-slate-400',
                                  onClick: () => handleStatusUpdate(lead, 'Pending')
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
                                  onClick: () => handleConvertToLoan(lead)
                                },
                                isDraft && {
                                  label: 'Confirm Lead',
                                  subLabel: 'Sanction inquiry for processing',
                                  icon: CheckCircle2,
                                  iconColor: 'text-teal-600 dark:text-teal-400',
                                  badge: 'Confirm',
                                  badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                                  onClick: () => handleStatusUpdate(lead, 'Approved')
                                },
                                lead.status !== 'Rejected' && {
                                  label: 'Reject Lead',
                                  subLabel: 'Decline lead inquiry',
                                  icon: XCircle,
                                  iconColor: 'text-rose-600 dark:text-rose-400',
                                  danger: true,
                                  onClick: () => handleStatusUpdate(lead, 'Rejected')
                                },
                            { divider: true },
                            { header: 'Applicant Contact' },
                            lead.phone && {
                              label: 'WhatsApp Borrower',
                              subLabel: `Chat with ${lead.phone}`,
                              icon: MessageCircle,
                              iconColor: 'text-emerald-600 dark:text-emerald-400',
                              onClick: () => {
                                const cleanPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
                                window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name}, regarding your loan inquiry with us...`)}`, '_blank');
                              }
                            },
                            lead.phone && {
                              label: 'Call Mobile',
                              subLabel: lead.phone,
                              icon: Phone,
                              iconColor: 'text-sky-600 dark:text-sky-400',
                              onClick: () => {
                                window.open(`tel:${lead.phone}`, '_self');
                              }
                            }
                          ].filter(Boolean)}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-400 font-semibold">
                      No external lead records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Web Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-3">
          <div className="light-card w-full max-w-md overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-base">Add Web Lead Inquiry</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-4 space-y-3 text-xs text-slate-900 dark:text-white">
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Applicant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full light-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full light-input"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">City / Location</label>
                  <input
                    type="text"
                    placeholder="Jaipur"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full light-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold uppercase tracking-wider text-[11px]">Requested Loan (₹)</label>
                  <span className="text-[10px] text-emerald-600 font-bold">Max ₹2L</span>
                </div>
                <input
                  type="number"
                  min="1000"
                  max="200000"
                  placeholder="Max 200000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full light-input ${parseFloat(formData.amount || 0) > 200000 ? 'border-rose-500 text-rose-600' : ''}`}
                />
                {parseFloat(formData.amount || 0) > 200000 && (
                  <p className="text-[10px] text-rose-500 font-bold mt-0.5">Exceeds ₹2,00,000 limit</p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[11px]">Inquiry Notes</label>
                <textarea
                  rows="2"
                  placeholder="Applicant requested loan for shop extension..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full light-input h-auto py-1.5"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-[36px] px-3.5 rounded-[8px] border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-950 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="emerald-btn cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save External Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal (Admin Only) */}
      {isAdmin && showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Import External Leads (CSV / Excel)</h3>
                  <p className="text-xs text-slate-400">Batch upload lead inquiries from spreadsheet file</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  handleResetImportModal();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
              {!importResult ? (
                <>
                  {/* Step 1: Template helper banner */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Need the standard CSV layout?</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                        Columns supported: <strong>name</strong>, <strong>phone</strong>, <strong>city</strong>, <strong>amount</strong>, <strong>email</strong>, <strong>status</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      disabled={downloadingSample}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      {downloadingSample ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span>Download Sample CSV</span>
                    </button>
                  </div>

                  {/* Step 2: File Dropzone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Choose External Leads CSV File
                    </label>
                    <label
                      htmlFor="external-leads-csv-input"
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/40 hover:bg-emerald-50/20 group"
                    >
                      <UploadCloud className="h-10 w-10 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {csvFileName ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{csvFileName}</span>
                        ) : (
                          <>Drag and drop your file here, or <span className="text-emerald-600 dark:text-emerald-400 underline">browse computer</span></>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Accepts standard .csv format</p>
                    </label>
                    <input
                      id="external-leads-csv-input"
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
                              <th className="py-2 px-2.5">Name</th>
                              <th className="py-2 px-2.5">Phone</th>
                              <th className="py-2 px-2.5">City</th>
                              <th className="py-2 px-2.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                            {csvPreviewRows.map((r, i) => {
                              const name = getField(r, ['name', 'applicant_name', 'applicant name', 'borrower full name', 'client name', 'full name', 'customer name', 'lead name', 'borrower', 'customer']) || 'N/A';
                              const phone = getField(r, ['phone', 'mobile', 'mobile phone', 'primary mobile', 'mobile number', 'contact', 'phone number', 'primary phone', 'mobile no', 'contact no']) || 'N/A';
                              const city = getField(r, ['city', 'location', 'city / location', 'town', 'address', 'district']) || 'N/A';
                              const amount = getAmount(r, ['amount', 'loan_amount', 'requested amount', 'sanctioned principal', 'principal', 'sanctioned amount', 'loan amt', 'principal amount']);

                              return (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  <td className="py-1.5 px-2.5 font-bold uppercase text-slate-900 dark:text-white">
                                    {name}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-mono">{phone}</td>
                                  <td className="py-1.5 px-2.5">{city}</td>
                                  <td className="py-1.5 px-2.5 font-bold text-emerald-600">
                                    ₹{amount.toLocaleString()}
                                  </td>
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
                    <span>View Leads Directory</span>
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
