'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Download, Mail, Trash2, CheckCircle2, Clock, 
  RefreshCw, FileText, Share2, Sheet, AlertCircle, ArrowUpRight, 
  Smartphone, Monitor, ShieldCheck, ShieldAlert 
} from 'lucide-react';
import { BookingRecord } from '@/lib/types';
import { formatToIST } from '@/lib/timeUtils';

interface BookingsTableProps {
  bookings: BookingRecord[];
  onRefresh: () => void;
}

export const BookingsTable: React.FC<BookingsTableProps> = ({ 
  bookings, 
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'full' | 'due'>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'genuine' | 'same_device'>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const query = searchTerm.toLowerCase();
      const studentName = b.student?.name || '';
      const studentEmail = b.student?.studentEmail || '';
      const parentEmail = b.student?.parentEmail || '';
      const salesRep = b.sales?.salesRepresentative || b.counsellor?.counsellorName || '';
      const batch = b.program?.productEnrolled || b.batchName || '';
      const leadSource = b.sales?.sourceOfLead || '';
      const city = b.student?.city || '';
      const residence = b.student?.countryOfResidence || '';
      const auditBadge = b.audit?.authenticityBadge || '';

      const matchesSearch = 
        studentName.toLowerCase().includes(query) ||
        studentEmail.toLowerCase().includes(query) ||
        parentEmail.toLowerCase().includes(query) ||
        salesRep.toLowerCase().includes(query) ||
        batch.toLowerCase().includes(query) ||
        leadSource.toLowerCase().includes(query) ||
        city.toLowerCase().includes(query) ||
        residence.toLowerCase().includes(query) ||
        auditBadge.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === 'completed' && b.status !== 'completed') return false;
      if (statusFilter === 'pending' && b.status !== 'pending_parent_fill') return false;

      if (paymentFilter === 'full' && b.payment?.fullAmountPaid !== 'yes') return false;
      if (paymentFilter === 'due' && b.payment?.fullAmountPaid === 'yes') return false;

      if (auditFilter === 'genuine' && b.audit?.authenticityStatus !== 'GENUINE_PARENT') return false;
      if (auditFilter === 'same_device' && b.audit?.authenticityStatus !== 'SAME_DEVICE_AS_COUNSELLOR') return false;

      return true;
    });
  }, [bookings, searchTerm, statusFilter, paymentFilter, auditFilter]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalDues = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let genuineParentCount = 0;
    let flaggedSameDeviceCount = 0;

    bookings.forEach(b => {
      if (b.status === 'completed') completedCount++;
      else pendingCount++;

      if (b.audit?.authenticityStatus === 'GENUINE_PARENT') genuineParentCount++;
      if (b.audit?.authenticityStatus === 'SAME_DEVICE_AS_COUNSELLOR') flaggedSameDeviceCount++;

      totalRevenue += Number(b.payment?.soldPrice) || 0;
      if (b.payment?.fullAmountPaid === 'no') {
        totalDues += Number(b.payment?.dueAmount) || 0;
      }
    });

    return { 
      totalRevenue, 
      totalDues, 
      completedCount, 
      pendingCount, 
      genuineParentCount, 
      flaggedSameDeviceCount,
      totalCount: bookings.length 
    };
  }, [bookings]);

  // Due status badge helper
  const getDueStatus = (b: BookingRecord) => {
    if (b.payment?.fullAmountPaid === 'yes') return null;
    if (!b.payment?.dueDate) return { label: 'Due Date Not Set', color: 'bg-slate-100 text-slate-700' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(b.payment.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (diffDays <= 7) {
      return { label: `Due in ${diffDays}d (${b.payment.dueDate})`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else {
      return { label: `Due on ${b.payment.dueDate}`, color: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
  };

  // Sync all to Google Sheet
  const handleSyncAllToGoogleSheet = async () => {
    try {
      setSyncingAll(true);
      const res = await fetch('/api/sync-sheets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.errors?.join('; ') || 'Google Sheet sync failed. Make sure your webhook URL is set in Settings.');
      }
      alert(`Google Sheet Sync Complete! Successfully inserted/sorted ${data.successCount} rows in IST.`);
      onRefresh();
    } catch (err: any) {
      alert(`Google Sheet Sync Notice: ${err.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  // Export to CSV with IST timestamps
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('No records to export.');
      return;
    }

    const headers = [
      'Booking ID',
      'Status',
      'Sale Date (IST)',
      'Academic Year',
      'Sale Representative',
      'Source of Lead',
      'Authenticity Audit',
      'Parent Device & IP',
      'Student Name',
      'Father Name',
      'Grade',
      'Student Email (Access)',
      'Parent Email',
      'Parent Phone',
      'Origin Country',
      'Country of Residence',
      'City',
      'Program Selection',
      'Group Hours',
      'Course Start Date',
      'Course End Date',
      'Product Enrolled (Batch)',
      'Course Price',
      'Sold Price',
      'Discount',
      'Discount %',
      'Full Paid?',
      'Amount Paid',
      'Due Amount',
      'Due Date',
      'Terms Accepted?',
      'Parent Legal Signature',
      'Signed At (IST)',
      'Current School',
      'Mock Score',
      'Target Score',
      'Target Month',
      'Target School',
      'Submission Timestamp (IST)'
    ];

    const rows = bookings.map(b => [
      `"${b.id}"`,
      `"${b.status}"`,
      `"${b.sales?.saleDate || ''}"`,
      `"${b.program?.academicYear || '2025-2026'}"`,
      `"${b.sales?.salesRepresentative || b.counsellor?.counsellorName || ''}"`,
      `"${b.sales?.sourceOfLead || ''}"`,
      `"${b.audit?.authenticityBadge || 'N/A'}"`,
      `"${b.audit?.auditNotes || ''}"`,
      `"${b.student?.name || ''}"`,
      `"${b.student?.fatherName || ''}"`,
      `"${b.student?.grade || ''}"`,
      `"${b.student?.studentEmail || ''}"`,
      `"${b.student?.parentEmail || ''}"`,
      `"${b.student?.parentPhone || ''}"`,
      `"${b.student?.originCountry || ''}"`,
      `"${b.student?.countryOfResidence || ''}"`,
      `"${b.student?.city || ''}"`,
      `"${b.program?.programSelection || 'Group'}"`,
      `"${b.program?.groupHours || 'Complete Course'}"`,
      `"${b.program?.courseStartDate || ''}"`,
      `"${b.program?.courseEndDate || ''}"`,
      `"${(b.program?.productEnrolled || b.batchName || '').replace(/"/g, '""')}"`,
      b.payment?.coursePrice || 0,
      b.payment?.soldPrice || 0,
      b.payment?.discount || 0,
      b.payment?.discountPercent || 0,
      `"${b.payment?.fullAmountPaid || 'yes'}"`,
      b.payment?.amountPaid || 0,
      b.payment?.dueAmount || 0,
      `"${b.payment?.dueDate || ''}"`,
      `"${b.terms?.termsAccepted ? 'YES' : 'NO'}"`,
      `"${b.terms?.parentLegalSignature || ''}"`,
      `"${b.terms?.signedAtIST || (b.terms?.signedAt ? formatToIST(b.terms.signedAt) : '')}"`,
      `"${b.student?.currentSchool || ''}"`,
      `"${b.student?.mockTestScore || ''}"`,
      `"${b.student?.targetScore || ''}"`,
      `"${b.student?.targetExamMonth || ''}"`,
      `"${b.student?.targetSchool || ''}"`,
      `"${b.createdAtIST || formatToIST(b.createdAt)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PW_Global_Sales_IST_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResendEmail = async (bookingId: string) => {
    try {
      setResendingId(bookingId);
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email. Check SMTP settings.');
      }
      alert('Admission copy resent successfully to parent, student, and counsellor!');
      onRefresh();
    } catch (err: any) {
      alert(`Error sending email: ${err.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm(`Are you sure you want to delete sales record ${bookingId}?`)) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto my-6 space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Bookings</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stats.completedCount} confirmed &bull; {stats.pendingCount} pending
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Parent Audit Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-emerald-700">{stats.genuineParentCount}</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Verified Parent</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.flaggedSameDeviceCount > 0 ? (
              <span className="text-amber-700 font-bold">⚠️ {stats.flaggedSameDeviceCount} signed on counsellor device</span>
            ) : (
              'All parent signatures from external devices'
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Outstanding Dues</span>
          <div className="text-2xl font-black text-amber-600 mt-1">₹ {stats.totalDues.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5">Strict 30-day collection cycle</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-2">
          <button
            type="button"
            onClick={handleSyncAllToGoogleSheet}
            disabled={syncingAll}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition shadow-xs"
          >
            <Sheet className="w-3.5 h-3.5" />
            <span>{syncingAll ? 'Sorting & Syncing...' : 'Sync to Google Sheet (IST)'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV (IST)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, email, audit, city, counsellor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Audit Authenticity Filter */}
          <select
            value={auditFilter}
            onChange={(e: any) => setAuditFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Submitter Audits</option>
            <option value="genuine">Verified Genuine Parent</option>
            <option value="same_device">Flagged: Same IP/Device as Counsellor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Form Status</option>
            <option value="completed">Completed &amp; Signed</option>
            <option value="pending">Pending Parent Link</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e: any) => setPaymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Payment Status</option>
            <option value="full">Fully Paid</option>
            <option value="due">Partial / Dues Pending</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            title="Refresh records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Ref ID / Sale Date (IST)</th>
                <th className="py-3.5 px-4">Student &amp; Access Email</th>
                <th className="py-3.5 px-4">Submitter Audit (Who Filled)</th>
                <th className="py-3.5 px-4">Product Enrolled</th>
                <th className="py-3.5 px-4">Sale Rep / Lead</th>
                <th className="py-3.5 px-4">Fee &amp; Dues</th>
                <th className="py-3.5 px-4">Status &amp; TnCs</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    No sales booking records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const currencySymbol = b.payment?.currency === 'INR' ? '₹' : b.payment?.currency === 'USD' ? '$' : b.payment?.currency === 'AED' ? 'AED' : b.payment?.currency;
                  const isFullPaid = b.payment?.fullAmountPaid === 'yes';
                  const dueInfo = getDueStatus(b);
                  const batchName = b.program?.productEnrolled || b.batchName;

                  // Audit Info
                  const isGenuineParent = b.audit?.authenticityStatus === 'GENUINE_PARENT';
                  const isSameDevice = b.audit?.authenticityStatus === 'SAME_DEVICE_AS_COUNSELLOR';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* ID / Sale Date (IST) */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{b.id}</span>
                        <span className="text-[10px] text-slate-500">
                          {b.sales?.saleDate || b.payment?.enrollmentDate} (IST)
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded block w-fit mt-0.5">
                          {b.program?.academicYear || '2025-2026'}
                        </span>
                      </td>

                      {/* Student & Access Email */}
                      <td className="py-3.5 px-4">
                        {b.student?.name ? (
                          <div className="font-bold text-slate-900">{b.student.name}</div>
                        ) : (
                          <div className="text-amber-600 font-semibold italic">Awaiting Parent Form</div>
                        )}
                        <div className="text-[11px] text-indigo-700 font-mono truncate max-w-[180px]" title={b.student?.studentEmail}>
                          {b.student?.studentEmail || b.student?.parentEmail || 'No email set'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {b.student?.city ? `${b.student.city}, ` : ''}{b.student?.countryOfResidence || ''}
                        </div>
                      </td>

                      {/* Submitter Audit (Who Genuinely Filled) */}
                      <td className="py-3.5 px-4">
                        {isGenuineParent ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified Parent ({b.audit?.parentDeviceType || 'Remote'})</span>
                            </span>
                            <div className="text-[9.5px] text-slate-500 mt-0.5 truncate max-w-[170px]" title={b.audit?.auditNotes}>
                              {b.audit?.auditNotes}
                            </div>
                          </div>
                        ) : isSameDevice ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              <span>Same IP as Counsellor</span>
                            </span>
                            <div className="text-[9.5px] text-amber-800 font-medium mt-0.5">
                              Filled on counsellor device / local network
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span>Pending Parent Link</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Product Enrolled */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 max-w-[170px] truncate" title={batchName}>
                          {batchName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {b.program?.programSelection || 'Group'} {b.program?.groupHours ? `(${b.program.groupHours})` : ''}
                        </div>
                      </td>

                      {/* Sale Rep & Lead Source */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {b.sales?.salesRepresentative || b.counsellor?.counsellorName}
                        </div>
                        <div className="text-[10px] text-amber-700 font-semibold max-w-[130px] truncate" title={b.sales?.sourceOfLead}>
                          Lead: {b.sales?.sourceOfLead || 'Direct'}
                        </div>
                      </td>

                      {/* Fee & Dues */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {currencySymbol} {b.payment?.soldPrice.toLocaleString()}
                        </div>
                        {isFullPaid ? (
                          <span className="text-[10px] text-emerald-700 font-bold">Paid in Full</span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-red-600">
                              Due: {currencySymbol} {b.payment?.dueAmount.toLocaleString()}
                            </div>
                            {dueInfo && (
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${dueInfo.color}`}>
                                {dueInfo.label}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status & TnCs */}
                      <td className="py-3.5 px-4">
                        {b.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mb-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mb-1">
                            <Clock className="w-3 h-3" /> Pending Parent
                          </span>
                        )}

                        <div>
                          {b.terms?.termsAccepted ? (
                            <span className="text-[9px] text-emerald-700 font-semibold block">
                              &#10003; Signed ({b.terms.parentLegalSignature})
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 block">TnCs Unsigned</span>
                          )}
                          {b.googleSheetSync?.synced && (
                            <span className="text-[9px] text-emerald-800 font-bold block">
                              &#10003; Sorted in Sheet (IST)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Receipt */}
                          <a
                            href={`/receipt/${b.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View / Print Receipt"
                          >
                            <FileText className="w-4 h-4" />
                          </a>

                          {/* Share link if pending */}
                          {b.status === 'pending_parent_fill' && (
                            <a
                              href={b.token && b.token.startsWith('tok_') ? `/parent/${b.id}?t=${b.token}` : `/parent/${b.token || b.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Open Parent Link"
                            >
                              <Share2 className="w-4 h-4" />
                            </a>
                          )}

                          {/* Resend email */}
                          <button
                            type="button"
                            onClick={() => handleResendEmail(b.id)}
                            disabled={resendingId === b.id}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="Resend email confirmation to Parent, Student & Counsellor"
                          >
                            <Mail className={`w-4 h-4 ${resendingId === b.id ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
