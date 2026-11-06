'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Mail, GraduationCap, DollarSign, Calendar, AlertCircle, 
  CheckCircle2, Upload, X, ShieldAlert, Sparkles, Send, FileCheck, 
  Plus, EyeOff, Globe, BookOpen, Clock, CheckSquare, Copy, Check, MessageSquare, ExternalLink
} from 'lucide-react';
import { 
  GRADES, TARGET_EXAM_MONTHS, CURRENCIES, LEAD_SOURCES, 
  ACADEMIC_YEARS, PROGRAM_TYPES, GROUP_HOURS_OPTIONS, COUNTRIES, 
  PW_GLOBAL_DEFAULT_SUPPORT_EMAIL 
} from '@/lib/constants';
import { BookingRecord } from '@/lib/types';
import { PhoneInput } from '@/components/PhoneInput';
import confetti from 'canvas-confetti';

interface CounsellorFormProps {
  onSuccess?: (booking: BookingRecord) => void;
  sharedBatches?: string[];
  onAddBatch?: (batch: string) => void;
}

export const CounsellorForm: React.FC<CounsellorFormProps> = ({ 
  onSuccess,
  sharedBatches,
  onAddBatch
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Batches state (synced globally across tabs)
  const [batches, setBatches] = useState<string[]>(sharedBatches || []);
  const [selectedBatch, setSelectedBatch] = useState(sharedBatches?.[0] || '');
  const [isAddingNewBatch, setIsAddingNewBatch] = useState(false);
  const [newBatchInput, setNewBatchInput] = useState('');

  useEffect(() => {
    if (sharedBatches) {
      setBatches(sharedBatches);
      if (!selectedBatch && sharedBatches.length > 0) {
        setSelectedBatch(sharedBatches[0]);
      }
    }
  }, [sharedBatches, selectedBatch]);

  // Form State: Sales & Counsellor
  const [salesRepresentative, setSalesRepresentative] = useState('');
  const [counsellorEmail, setCounsellorEmail] = useState('');
  const [sourceOfLead, setSourceOfLead] = useState(LEAD_SOURCES[0]);
  const [saleDate, setSaleDate] = useState(todayStr);
  const [supportEmail, setSupportEmail] = useState(PW_GLOBAL_DEFAULT_SUPPORT_EMAIL);

  // Form State: Academic & Program
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[1]); // 2025-2026
  const [programSelection, setProgramSelection] = useState<'1-1' | 'Group'>('Group');
  const [groupHours, setGroupHours] = useState(GROUP_HOURS_OPTIONS[0]); // 16 - English
  const [courseStartDate, setCourseStartDate] = useState(todayStr);
  const [courseEndDate, setCourseEndDate] = useState('');

  // Form State: Student Details
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [grade, setGrade] = useState(GRADES[6]); // Grade 11
  const [studentEmail, setStudentEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [originCountry, setOriginCountry] = useState(COUNTRIES[2]); // India default
  const [countryOfResidence, setCountryOfResidence] = useState(COUNTRIES[0]); // UAE default
  const [city, setCity] = useState('Dubai');
  const [currentSchool, setCurrentSchool] = useState('');
  const [mockTestScore, setMockTestScore] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [targetExamMonth, setTargetExamMonth] = useState(TARGET_EXAM_MONTHS[1]);
  const [targetSchool, setTargetSchool] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form State: Payment Section
  const [currency, setCurrency] = useState('INR');
  const [coursePrice, setCoursePrice] = useState<number | ''>(65000);
  const [soldPrice, setSoldPrice] = useState<number | ''>(50000);
  const [fullAmountPaid, setFullAmountPaid] = useState<'yes' | 'no'>('yes');
  const [amountPaid, setAmountPaid] = useState<number | ''>(50000);
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Online Gateway / Wire');
  const [transactionRef, setTransactionRef] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<BookingRecord | null>(null);
  const [parentSigningUrl, setParentSigningUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Fetch batches on mount
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch('/api/batches');
        const data = await res.json();
        if (data.success && Array.isArray(data.batches)) {
          setBatches(data.batches);
          if (data.batches.length > 0 && !selectedBatch) {
            setSelectedBatch(data.batches[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      }
    }
    loadBatches();
  }, [selectedBatch]);

  // Auto calculate discount
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

  // Auto calculate due amount
  const dueAmount = useMemo(() => {
    if (fullAmountPaid === 'yes') return 0;
    const sp = Number(soldPrice) || 0;
    const ap = Number(amountPaid) || 0;
    return Math.max(0, sp - ap);
  }, [fullAmountPaid, soldPrice, amountPaid]);

  // Max allowed due date calculation (strict 1 month limit from sale/enrollment date)
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

  // Keep amountPaid synced when fullAmountPaid toggle flips
  useEffect(() => {
    if (fullAmountPaid === 'yes') {
      setAmountPaid(soldPrice);
      setDueDate('');
    } else {
      if (amountPaid === soldPrice) {
        setAmountPaid(Math.round((Number(soldPrice) || 0) * 0.5));
      }
      if (!dueDate && maxDueDate) {
        setDueDate(maxDueDate);
      }
    }
  }, [fullAmountPaid, soldPrice]);

  // Handle Photo upload with client-side canvas downscaling (max 320px, ~15KB JPEG)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo size exceeds 10MB. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Add new uniform batch
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
        setSelectedBatch(data.batch || clean);
        setIsAddingNewBatch(false);
        setNewBatchInput('');
      }
    } catch (err) {
      console.warn('Failed to add batch to server, saved locally:', err);
      setSelectedBatch(clean);
      setIsAddingNewBatch(false);
      setNewBatchInput('');
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!studentName.trim()) {
      setErrorMsg('Student Name is required.');
      return;
    }
    if (!fatherName.trim()) {
      setErrorMsg("Father's Name is required.");
      return;
    }
    if (!studentEmail.trim()) {
      setErrorMsg('Student Mail ID is required for portal access.');
      return;
    }
    if (!parentEmail.trim()) {
      setErrorMsg('Parent Email is required to send the unique signing link.');
      return;
    }
    if (!salesRepresentative.trim() || !counsellorEmail.trim()) {
      setErrorMsg('Sale Representative Name and Email are required.');
      return;
    }
    if (fullAmountPaid === 'no') {
      if (!dueDate) {
        setErrorMsg('Please specify a payment Due Date for partial payment.');
        return;
      }
      if (isDueDateInvalid) {
        setErrorMsg(`Due Date cannot be greater than 1 month from enrollment date (${maxDueDate}).`);
        return;
      }
    }

    const effectiveBatch = (selectedBatch || newBatchInput).trim();
    if (!effectiveBatch) {
      setErrorMsg('Please select or add a Product / Batch Name.');
      return;
    }
    if (newBatchInput.trim() && !batches.includes(newBatchInput.trim())) {
      handleAddNewBatch();
    }

    setIsSubmitting(true);

    try {
      // REQUIREMENT: Without parent signing the TnCs, enrollment is NOT confirmed (pending_parent_fill)
      const payload = {
        fillMode: 'counsellor_direct',
        status: 'pending_parent_fill',
        batchName: effectiveBatch,
        sales: {
          salesRepresentative: salesRepresentative.trim(),
          counsellorEmail: counsellorEmail.trim(),
          sourceOfLead,
          saleDate,
        },
        program: {
          academicYear,
          programSelection,
          groupHours: programSelection === 'Group' ? groupHours : undefined,
          courseStartDate,
          courseEndDate,
          productEnrolled: effectiveBatch
        },
        supportEmailRecipient: supportEmail.trim(),
        student: {
          name: studentName.trim(),
          fatherName: fatherName.trim(),
          grade,
          studentEmail: studentEmail.trim().toLowerCase(),
          parentEmail: parentEmail.trim().toLowerCase(),
          parentPhone: parentPhone.trim(),
          originCountry,
          countryOfResidence,
          city,
          currentSchool: currentSchool.trim(),
          mockTestScore: mockTestScore.trim(),
          targetScore: targetScore.trim(),
          targetExamMonth,
          targetSchool: targetSchool.trim(),
          photoUrl: photoPreview || '',
        },
        payment: {
          currency,
          coursePrice: Number(coursePrice) || 0,
          soldPrice: Number(soldPrice) || 0,
          fullAmountPaid,
          amountPaid: fullAmountPaid === 'yes' ? (Number(soldPrice) || 0) : (Number(amountPaid) || 0),
          dueDate: fullAmountPaid === 'no' ? dueDate : '',
          enrollmentDate: saleDate,
          paymentMode,
          transactionRef,
        }
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save sales booking.');
      }

      setCompletedBooking(data.booking);
      const hostOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const token = data.booking.token;
      const shareUrl = token && token.startsWith('tok_')
        ? `${hostOrigin}/parent/${data.booking.id}?t=${token}`
        : `${hostOrigin}/parent/${token || data.booking.id}`;
      setParentSigningUrl(shareUrl);
      if (onSuccess) onSuccess(data.booking);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(parentSigningUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    if (!completedBooking) return '';
    const cleanDigits = (completedBooking.student.parentPhone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Dear ${completedBooking.student.fatherName || 'Parent'},\n\nGreetings from PhysicsWallah Global!\n\nYour sales representative, *${completedBooking.sales.salesRepresentative}*, has prepared the admission for *${completedBooking.student.name}* in *${completedBooking.batchName}*.\n\n⚠️ Action Required: Please click the official link below to review your student details, accept the Admission Rules, and digitally sign the document:\n${parentSigningUrl}\n\nNote: The enrollment will only be confirmed once you digitally sign the document.\n\nThank you,\nPhysicsWallah Global Admissions`
    );
    if (cleanDigits.length >= 7) {
      return `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${text}`;
    }
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const getWhatsAppMessageRaw = () => {
    if (!completedBooking) return '';
    return `Dear ${completedBooking.student.fatherName || 'Parent'},\n\nGreetings from PhysicsWallah Global!\n\nYour sales representative, ${completedBooking.sales.salesRepresentative}, has prepared the admission for ${completedBooking.student.name} in ${completedBooking.batchName}.\n\nAction Required: Please click the link below to review student details, accept Admission Rules, and digitally sign:\n${parentSigningUrl}\n\nThank you,\nPhysicsWallah Global Admissions`;
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessageRaw());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const getGmailShareUrl = () => {
    if (!completedBooking || !completedBooking.student.parentEmail) return '';
    const to = encodeURIComponent(completedBooking.student.parentEmail);
    const subject = encodeURIComponent(`[Action Required] Review & Sign Admission Terms: ${completedBooking.student.name} (${completedBooking.batchName}) - Ref: ${completedBooking.id}`);
    const body = encodeURIComponent(
      `Dear ${completedBooking.student.fatherName || 'Parent'},\n\nGreetings from PhysicsWallah Global!\n\nWe have received your enrollment booking for ${completedBooking.student.name} in ${completedBooking.batchName}.\n\nPlease click the official link below to complete the student onboarding details, accept the Admission Rules, and digitally sign the document:\n${parentSigningUrl}\n\n⚠️ Crucial Portal Access Policy: The access email provided for the student portal cannot be changed later under any circumstances.\n\nThank you,\n${completedBooking.sales.salesRepresentative}\nPhysicsWallah Global Admissions`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
  };

  const handleReset = () => {
    setCompletedBooking(null);
    setStudentName('');
    setFatherName('');
    setStudentEmail('');
    setParentEmail('');
    setParentPhone('');
    setCurrentSchool('');
    setMockTestScore('');
    setTargetScore('');
    setTargetSchool('');
    setPhotoPreview(null);
    setTransactionRef('');
  };

  // POST-SUBMISSION VIEW: UNIQUE PARENT SIGNING LINK & INVITATION STATUS
  if (completedBooking) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8 animate-fade-in">
        <div className="bg-gradient-to-r from-amber-600 via-indigo-700 to-slate-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <span className="bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
            Awaiting Parent TnC Signature
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold">Sales Entry Recorded &bull; Link Sent to Parent</h2>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
            Admission Ref: <strong className="text-white underline font-mono">{completedBooking.id}</strong>. As per policy, enrolment will be <strong>CONFIRMED</strong> only after the parent reviews and digitally signs the TnCs.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Direct Email Dispatch Notification */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <Send className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                Direct Parent Email Sent
              </div>
              <p className="text-xs text-indigo-900/90 mt-0.5 leading-relaxed">
                An invitation email with the review and signature button has been sent directly to parent inbox: <strong>{completedBooking.student.parentEmail}</strong>.
              </p>
            </div>
          </div>

          {/* Unique Parent Signing Link Display */}
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-xl p-5 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Unique Parent Signing Link for {completedBooking.student.name}:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={parentSigningUrl}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-indigo-700 select-all font-bold"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                  copiedLink ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              The parent can open this link on their mobile or desktop, review the agreement, and sign by typing their legal name.
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
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

              {completedBooking.student.parentEmail && (
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
                href={parentSigningUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Parent Form</span>
              </a>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              + Create Another Sales Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8 my-6">
      
      {/* SECTION 1: SALES & LEAD IDENTIFIERS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-extrabold uppercase tracking-widest mb-1">
          <Sparkles className="w-4 h-4" />
          <span>PhysicsWallah Global &bull; Admissions &amp; Sales Desk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Sales Counsellor Admission Booking</h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
          Enter sales and student details. Upon submission, a unique signing link is automatically emailed directly to the parent. Enrolment is formally confirmed once the parent digitally signs the TnCs.
        </p>

        {/* Sales Rep & Lead Source Row */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Sale Representative *
            </label>
            <input
              type="text"
              required
              value={salesRepresentative}
              onChange={(e) => setSalesRepresentative(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Counsellor Email *
            </label>
            <input
              type="email"
              required
              value={counsellorEmail}
              onChange={(e) => setCounsellorEmail(e.target.value)}
              placeholder="rahul.sharma@pw.live"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Sale Date *
            </label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Source of Lead (Internal) *</span>
            </label>
            <select
              value={sourceOfLead}
              onChange={(e) => setSourceOfLead(e.target.value)}
              className="w-full bg-slate-800/90 border border-amber-500/50 rounded-lg px-3 py-2 text-xs text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              title="This field is strictly internal and hidden from parent view"
            >
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* SECTION 2: PROGRAM SELECTION & UNIFORM BATCH */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Program Selection &amp; Product Enrolled</h2>
            <p className="text-xs text-slate-500">Select program format, course duration, and uniform batch name.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900"
            >
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Program Selection *</label>
            <select
              value={programSelection}
              onChange={(e: any) => setProgramSelection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-700"
            >
              <option value="Group">Group</option>
              <option value="1-1">1-1 (Personalized Mentorship)</option>
            </select>
          </div>

          {programSelection === 'Group' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Hours *</label>
              <select
                value={groupHours}
                onChange={(e) => setGroupHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900"
              >
                {GROUP_HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1-1 Mentorship Mode</label>
              <input
                type="text"
                readOnly
                value="Custom 1-on-1 Sessions"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 cursor-not-allowed"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Course End Date</label>
            <input
              type="date"
              value={courseEndDate}
              onChange={(e) => setCourseEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Product Enrolled */}
          <div className="md:col-span-3">
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
                    setSelectedBatch(e.target.value);
                  }}
                  placeholder="Type new official batch name"
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
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900"
              >
                <option value="">-- Select Enrolled Batch --</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: STUDENT & PARENT DETAILS */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Student &amp; Parent Identity Details</h2>
            <p className="text-xs text-slate-500">Provide verified student details for the admission record.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name *</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Full Name as on Passport/ID"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Father Name *</label>
            <input
              type="text"
              required
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="Father's / Guardian's Full Name"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Grade *</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900"
            >
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Student Email */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-900 mb-1">Student E-mail ID *</label>
            <input
              type="email"
              required
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student.email@example.com"
              className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-amber-900 leading-tight">
                <strong>Mandatory Policy:</strong> Portal &amp; class access will be given on this email and <u>cannot be changed later under any circumstances</u>.
              </p>
            </div>
          </div>

          {/* Parent Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Email ID * <span className="text-indigo-600 font-bold">(Receives Signing Link)</span>
            </label>
            <input
              type="email"
              required
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full bg-slate-50 border border-indigo-300 rounded-xl px-3.5 py-2 text-xs text-slate-900"
            />
          </div>

          <PhoneInput
            label="Parent WhatsApp / Mobile No."
            required
            value={parentPhone}
            onChange={(val) => setParentPhone(val)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Origin Country</label>
            <select
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Country of Residence</label>
            <select
              value={countryOfResidence}
              onChange={(e) => setCountryOfResidence(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Dubai, Riyadh, Mumbai"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current School</label>
            <input
              type="text"
              value={currentSchool}
              onChange={(e) => setCurrentSchool(e.target.value)}
              placeholder="e.g. GEMS Modern Academy"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mock Test Score (if given)</label>
            <input
              type="text"
              value={mockTestScore}
              onChange={(e) => setMockTestScore(e.target.value)}
              placeholder="e.g. 1380 / 1600"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Score</label>
            <input
              type="text"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder="e.g. 1550+"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Exam Month</label>
            <select
              value={targetExamMonth}
              onChange={(e) => setTargetExamMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
            >
              {TARGET_EXAM_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target School / University</label>
            <input
              type="text"
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="e.g. Stanford / IIT Bombay"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Photo */}
          <div className="md:col-span-3 pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Student Photo</label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-indigo-400">
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-500 transition">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Choose Student Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: PAYMENT DETAILS & DUE ENGINE */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Payment &amp; Due Date Section</h2>
            <p className="text-xs text-slate-500">Auto-calculated discount and strictly capped 1-month due dates.</p>
          </div>
        </div>

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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            >
              <option value="Online Gateway (Stripe/Razorpay)">Online Gateway</option>
              <option value="International Wire / SWIFT">International Wire / SWIFT</option>
              <option value="Direct UPI / NetBanking">Direct UPI / NetBanking</option>
              <option value="Bank Branch Deposit">Bank Branch Deposit</option>
            </select>
          </div>
        </div>

        {/* Auto Discount Display */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-700 font-medium">
            <span>Calculated Discount: </span>
            <strong className="text-emerald-700 font-extrabold text-sm ml-1">
              {currency} {discountAmount.toLocaleString()} ({discountPercent}% OFF)
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Full Amount Paid?</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200">
              <button
                type="button"
                onClick={() => setFullAmountPaid('yes')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  fullAmountPaid === 'yes' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setFullAmountPaid('no')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  fullAmountPaid === 'no' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700'
                }`}
              >
                NO
              </button>
            </div>
          </div>
        </div>

        {/* If Partial Amount */}
        {fullAmountPaid === 'no' && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid Today *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={Number(soldPrice) || 0}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Amount (Auto-Calculated)</label>
                <div className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-extrabold text-amber-800">
                  {currency} {dueAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Due Date * <span className="text-amber-700 font-semibold">(Max 1 month)</span>
                </label>
                <input
                  type="date"
                  required
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
                ⚠️ Error: Due date cannot be greater than 1 month from enrollment date ({maxDueDate}).
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUBMISSION FOOTER: DISPATCH LINK DIRECTLY TO PARENT */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <span>Submit Sales Entry &amp; Dispatch Parent Signing Link</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">Action Required</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
            Creates a unique parent onboarding link and automatically emails it directly to the parent. Enrolment will remain pending until the parent reviews and digitally signs the TnCs.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isDueDateInvalid}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
            isSubmitting || isDueDateInvalid
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
          }`}
        >
          {isSubmitting ? 'Dispatching...' : 'Submit & Send Parent Signing Link'}
        </button>
      </div>

    </form>
  );
};
