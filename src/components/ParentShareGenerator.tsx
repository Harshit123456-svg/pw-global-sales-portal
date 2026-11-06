'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Link as LinkIcon, Copy, Check, MessageSquare, ExternalLink, 
  Sparkles, AlertCircle, EyeOff, Plus, Mail 
} from 'lucide-react';
import { 
  CURRENCIES, LEAD_SOURCES, ACADEMIC_YEARS, PROGRAM_TYPES, 
  GROUP_HOURS_OPTIONS, PW_GLOBAL_DEFAULT_SUPPORT_EMAIL 
} from '@/lib/constants';
import { BookingRecord } from '@/lib/types';
import { PhoneInput } from '@/components/PhoneInput';

interface ParentShareGeneratorProps {
  onCreated?: (booking: BookingRecord) => void;
  sharedBatches?: string[];
  onAddBatch?: (batch: string) => void;
}

export const ParentShareGenerator: React.FC<ParentShareGeneratorProps> = ({ 
  onCreated,
  sharedBatches,
  onAddBatch
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Batches (synced with global batches)
  const [batches, setBatches] = useState<string[]>(sharedBatches || []);
  const [productEnrolled, setProductEnrolled] = useState(sharedBatches?.[0] || '');
  const [isAddingNewBatch, setIsAddingNewBatch] = useState(false);
  const [newBatchInput, setNewBatchInput] = useState('');

  useEffect(() => {
    if (sharedBatches) {
      setBatches(sharedBatches);
      if (!productEnrolled && sharedBatches.length > 0) {
        setProductEnrolled(sharedBatches[0]);
      }
    }
  }, [sharedBatches, productEnrolled]);

  // Counsellor & Sales Info
  const [salesRepresentative, setSalesRepresentative] = useState('');
  const [counsellorEmail, setCounsellorEmail] = useState('');
  const [sourceOfLead, setSourceOfLead] = useState(LEAD_SOURCES[0]);
  const [saleDate, setSaleDate] = useState(todayStr);

  // Program Info
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[1]); // 2025-2026
  const [programSelection, setProgramSelection] = useState<'1-1' | 'Group'>('Group');
  const [groupHours, setGroupHours] = useState(GROUP_HOURS_OPTIONS[0]); // 16 - English
  const [courseStartDate, setCourseStartDate] = useState(todayStr);
  const [courseEndDate, setCourseEndDate] = useState('');

  // Optional Parent Contact Pre-fill
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Payment
  const [currency, setCurrency] = useState('INR');
  const [coursePrice, setCoursePrice] = useState<number | ''>(65000);
  const [soldPrice, setSoldPrice] = useState<number | ''>(50000);
  const [fullAmountPaid, setFullAmountPaid] = useState<'yes' | 'no'>('yes');
  const [amountPaid, setAmountPaid] = useState<number | ''>(50000);
  const [dueDate, setDueDate] = useState('');

  // Link state
  const [generatedBooking, setGeneratedBooking] = useState<BookingRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch('/api/batches');
        const data = await res.json();
        if (data.success && Array.isArray(data.batches)) {
          setBatches(data.batches);
          if (data.batches.length > 0 && !productEnrolled) {
            setProductEnrolled(data.batches[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      }
    }
    loadBatches();
  }, [productEnrolled]);

  // Discount computation
  const discountAmount = useMemo(() => {
    const cp = Number(coursePrice) || 0;
    const sp = Number(soldPrice) || 0;
    return Math.max(0, cp - sp);
  }, [coursePrice, soldPrice]);

  const discountPercent = useMemo(() => {
    const cp = Number(coursePrice) || 0;
    if (cp <= 0) return 0;
    return Math.round((discountAmount / cp) * 100);
  }, [coursePrice, discountAmount]);

  const dueAmount = useMemo(() => {
    if (fullAmountPaid === 'yes') return 0;
    const sp = Number(soldPrice) || 0;
    const ap = Number(amountPaid) || 0;
    return Math.max(0, sp - ap);
  }, [fullAmountPaid, soldPrice, amountPaid]);

  const maxDueDate = useMemo(() => {
    if (!saleDate) return '';
    const d = new Date(saleDate);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }, [saleDate]);

  const isDueDateInvalid = useMemo(() => {
    if (fullAmountPaid === 'yes') return false;
    if (!dueDate) return false;
    return dueDate > maxDueDate;
  }, [fullAmountPaid, dueDate, maxDueDate]);

  const handleAddNewBatch = async () => {
    const clean = newBatchInput.trim();
    if (!clean) return;
    if (onAddBatch) {
      onAddBatch(clean);
    }
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName: clean })
      });
      const data = await res.json();
      if (data.success && data.batches) {
        setBatches(data.batches);
        setProductEnrolled(data.batch || clean);
        setIsAddingNewBatch(false);
        setNewBatchInput('');
      }
    } catch (err) {
      console.warn('Failed to add batch to server, saved locally:', err);
      setProductEnrolled(clean);
      setIsAddingNewBatch(false);
      setNewBatchInput('');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!salesRepresentative.trim() || !counsellorEmail.trim()) {
      setErrorMsg('Sale Representative Name and Email are required.');
      return;
    }
    if (fullAmountPaid === 'no') {
      if (!dueDate) {
        setErrorMsg('Please specify a Due Date for partial payment.');
        return;
      }
      if (isDueDateInvalid) {
        setErrorMsg(`Due Date cannot exceed 1 month from enrollment date (${maxDueDate}).`);
        return;
      }
    }

    const effectiveBatch = (productEnrolled || newBatchInput).trim();
    if (!effectiveBatch) {
      setErrorMsg('Please select or add a Product / Batch Name.');
      return;
    }
    if (newBatchInput.trim() && !batches.includes(newBatchInput.trim())) {
      handleAddNewBatch();
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fillMode: 'parent_link',
        status: 'pending_parent_fill',
        batchName: effectiveBatch,
        sales: {
          salesRepresentative: salesRepresentative.trim(),
          counsellorEmail: counsellorEmail.trim(),
          sourceOfLead, // Stored internally, hidden from parent link
          saleDate
        },
        program: {
          academicYear,
          programSelection,
          groupHours: programSelection === 'Group' ? groupHours : undefined,
          courseStartDate,
          courseEndDate,
          productEnrolled: effectiveBatch
        },
        supportEmailRecipient: PW_GLOBAL_DEFAULT_SUPPORT_EMAIL,
        student: {
          name: studentName.trim(),
          fatherName: parentName.trim(),
          grade: 'Grade 11',
          studentEmail: '',
          parentEmail: parentEmail.trim().toLowerCase(),
          parentPhone: parentPhone.trim(),
        },
        payment: {
          currency,
          coursePrice: Number(coursePrice) || 0,
          soldPrice: Number(soldPrice) || 0,
          fullAmountPaid,
          amountPaid: fullAmountPaid === 'yes' ? (Number(soldPrice) || 0) : (Number(amountPaid) || 0),
          dueDate: fullAmountPaid === 'no' ? dueDate : '',
          enrollmentDate: saleDate,
          paymentMode: 'Online Transfer / Gateway'
        }
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate link.');
      }

      setGeneratedBooking(data.booking);
      if (onCreated) onCreated(data.booking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShareUrl = () => {
    if (!generatedBooking) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = generatedBooking.token || '';
    if (token.startsWith('tok_')) {
      return `${origin}/parent/${generatedBooking.id}?t=${token}`;
    }
    return `${origin}/parent/${token || generatedBooking.id}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [copiedMessage, setCopiedMessage] = useState(false);

  const getWhatsAppMessageRaw = () => {
    if (!generatedBooking) return '';
    const url = getShareUrl();
    const batch = generatedBooking.program?.productEnrolled || generatedBooking.batchName;
    return `Dear Parent,\n\nGreetings from PhysicsWallah Global!\n\nWe have successfully received your payment for ${batch}.\n\nPlease complete your student's official onboarding & portal access form here:\n${url}\n\nImportant: You will be asked to confirm your student access email and digitally sign the admission terms.\n\nThank you,\n${generatedBooking.sales.salesRepresentative} (PW Global Admissions)`;
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessageRaw());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const getGmailShareUrl = () => {
    if (!generatedBooking) return '';
    const to = encodeURIComponent(generatedBooking.student.parentEmail || '');
    const batch = generatedBooking.program?.productEnrolled || generatedBooking.batchName;
    const subject = encodeURIComponent(`[Action Required] Review & Sign Admission Terms: ${generatedBooking.student.name || 'Student'} (${batch}) - Ref: ${generatedBooking.id}`);
    const body = encodeURIComponent(getWhatsAppMessageRaw());
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  };

  const getWhatsAppShareUrl = () => {
    if (!generatedBooking) return '';
    const url = getShareUrl();
    const batch = generatedBooking.program?.productEnrolled || generatedBooking.batchName;
    const text = encodeURIComponent(
      `Dear Parent,\n\nGreetings from PhysicsWallah Global!\n\nWe have successfully received your payment for *${batch}*.\n\nPlease complete your student's official onboarding & portal access form here:\n${url}\n\n⚠️ Important: You will be asked to confirm your student access email and digitally sign the admission terms.\n\nThank you,\n${generatedBooking.sales.salesRepresentative} (PW Global Admissions)`
    );
    const cleanDigits = (generatedBooking.student.parentPhone || '').replace(/\D/g, '');
    if (cleanDigits.length >= 7) {
      return `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  return (
    <div className="max-w-4xl mx-auto my-6 space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-emerald-900/50">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold uppercase tracking-widest mb-1">
          <LinkIcon className="w-4 h-4" />
          <span>Post-Payment Parent Link Generator</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Generate Onboarding Link for Parent</h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
          Lock in the payment details, batch selection, and sales representative, then share this link directly with the parent via WhatsApp or Email.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* Generated Link Display */}
      {generatedBooking ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-200 space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Ready to Share</span>
              <h2 className="text-xl font-black text-slate-900">Parent Onboarding Link Active!</h2>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Unique Shareable Parent URL:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getShareUrl()}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-indigo-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-extrabold transition shadow-md"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Share on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyWhatsAppMessage}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300"
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMessage ? 'Copied Message!' : 'Copy WhatsApp Message'}</span>
            </button>

            {generatedBooking.student.parentEmail && (
              <a
                href={getGmailShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                title="Opens Gmail compose window with parent email, subject and signing link pre-filled"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Gmail (1-Click)</span>
              </a>
            )}

            <a
              href={getShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview Parent View</span>
            </a>

            <button
              type="button"
              onClick={() => setGeneratedBooking(null)}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
            >
              + Generate Another Link
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed">
            <strong>Parent Onboarding Flow:</strong> When the parent opens this link, they will fill in their student details, mandatory country of residence and city, review the agreed payment terms, and sign the official 10 Terms &amp; Conditions by typing their legal name and checking the confirmation box.
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-6">
          
          {/* Sales Representative & Internal Lead Source */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">1. Sales Representative &amp; Lead Source</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Representative *</label>
                <input
                  type="text"
                  required
                  value={salesRepresentative}
                  onChange={(e) => setSalesRepresentative(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Counsellor Email *</label>
                <input
                  type="email"
                  required
                  value={counsellorEmail}
                  onChange={(e) => setCounsellorEmail(e.target.value)}
                  placeholder="rahul.sharma@pw.live"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Date *</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Lead Source (Internal) *</span>
                </label>
                <select
                  value={sourceOfLead}
                  onChange={(e) => setSourceOfLead(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold text-amber-900"
                >
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Program & Uniform Batch */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">2. Program Selection &amp; Product Enrolled</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program Selection</label>
                <select
                  value={programSelection}
                  onChange={(e: any) => setProgramSelection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700"
                >
                  <option value="Group">Group</option>
                  <option value="1-1">1-1</option>
                </select>
              </div>

              {programSelection === 'Group' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Hours</label>
                  <select
                    value={groupHours}
                    onChange={(e) => setGroupHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    {GROUP_HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">1-1 Mentorship</label>
                  <input
                    type="text"
                    readOnly
                    value="Custom 1-on-1 Sessions"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Start Date</label>
                <input
                  type="date"
                  value={courseStartDate}
                  onChange={(e) => setCourseStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Product Enrolled (Full Batch Name) */}
              <div className="md:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-900">
                    Product Enrolled (Full Batch Name) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewBatch(!isAddingNewBatch)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNewBatch ? 'Cancel' : '+ Add New Batch Name'}</span>
                  </button>
                </div>

                {isAddingNewBatch || batches.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newBatchInput}
                      onChange={(e) => {
                        setNewBatchInput(e.target.value);
                        setProductEnrolled(e.target.value);
                      }}
                      placeholder="Type batch name to add for all counsellors"
                      className="flex-1 bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewBatch}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 whitespace-nowrap"
                    >
                      Save Batch
                    </button>
                  </div>
                ) : (
                  <select
                    value={productEnrolled}
                    onChange={(e) => setProductEnrolled(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="">-- Select Enrolled Batch --</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">3. Payment &amp; Due Terms</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Price *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={coursePrice}
                  onChange={(e) => setCoursePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sold Price *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Amount Paid?</label>
                <div className="flex rounded-lg p-0.5 bg-slate-200 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setFullAmountPaid('yes')}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition ${
                      fullAmountPaid === 'yes' ? 'bg-emerald-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullAmountPaid('no')}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition ${
                      fullAmountPaid === 'no' ? 'bg-amber-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>

            {/* Discount Display */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200 text-xs">
              <span className="text-slate-600">Calculated Discount:</span>
              <span className="font-extrabold text-emerald-700 text-sm">
                {currency} {discountAmount.toLocaleString()} ({discountPercent}% OFF)
              </span>
            </div>

            {/* Partial Dues */}
            {fullAmountPaid === 'no' && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid Today</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Due Amount</label>
                    <div className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-extrabold text-amber-800">
                      {currency} {dueAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Due Date * (Max 1 month)
                    </label>
                    <input
                      type="date"
                      min={saleDate}
                      max={maxDueDate}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-bold ${
                        isDueDateInvalid ? 'border-red-500 text-red-600' : 'border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {isDueDateInvalid && (
                  <div className="text-xs text-red-600 font-bold">
                    ⚠️ Due date cannot exceed 1 month from enrollment ({maxDueDate}).
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Pre-fill for Parent */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              4. Parent / Student Contact (Optional Pre-fill)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              If already known, enter parent contact details so the share link is pre-addressed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Name</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Father / Mother Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Email</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="sm:col-span-1">
                <PhoneInput
                  label="Parent WhatsApp / Mobile"
                  value={parentPhone}
                  onChange={(val) => setParentPhone(val)}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="text-right">
            <button
              type="submit"
              disabled={isSubmitting || isDueDateInvalid}
              className={`px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition ${
                isSubmitting || isDueDateInvalid
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {isSubmitting ? 'Generating...' : 'Generate Parent Share Link'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
