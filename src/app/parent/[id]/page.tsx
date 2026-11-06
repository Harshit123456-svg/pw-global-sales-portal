'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PWLogo } from '@/components/PWLogo';
import { 
  CheckCircle2, ShieldAlert, Upload, X, AlertCircle, 
  Send, FileCheck, ArrowRight, ArrowLeft, BookOpen, Clock, 
  FileText, CheckSquare, Square
} from 'lucide-react';
import { GRADES, TARGET_EXAM_MONTHS, COUNTRIES, ADMISSION_TERMS_AND_CONDITIONS } from '@/lib/constants';
import { BookingRecord } from '@/lib/types';
import { PhoneInput } from '@/components/PhoneInput';
import { decodeBookingToken } from '@/lib/tokenUtils';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function ParentOnboardingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idOrToken = (params?.id as string) || '';
  const tokenFromQuery = searchParams?.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-step navigation: Step 1 (Student Details) -> Step 2 (Terms & Conditions)
  const [step, setStep] = useState<1 | 2>(1);

  // Student Details Form State
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [grade, setGrade] = useState(GRADES[6]);
  const [studentEmail, setStudentEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [originCountry, setOriginCountry] = useState(COUNTRIES[2]); // India default
  const [countryOfResidence, setCountryOfResidence] = useState(''); // Mandatory
  const [city, setCity] = useState(''); // Mandatory
  const [currentSchool, setCurrentSchool] = useState('');
  const [mockTestScore, setMockTestScore] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [targetExamMonth, setTargetExamMonth] = useState(TARGET_EXAM_MONTHS[1]);
  const [targetSchool, setTargetSchool] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Terms & Conditions State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [parentLegalSignature, setParentLegalSignature] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const populateForm = useCallback((b: BookingRecord) => {
    if (b.student.name) setStudentName(b.student.name);
    if (b.student.fatherName) setFatherName(b.student.fatherName);
    if (b.student.grade) setGrade(b.student.grade);
    if (b.student.studentEmail) setStudentEmail(b.student.studentEmail);
    if (b.student.parentEmail) setParentEmail(b.student.parentEmail);
    if (b.student.parentPhone) setParentPhone(b.student.parentPhone);
    if (b.student.originCountry) setOriginCountry(b.student.originCountry);
    if (b.student.countryOfResidence) setCountryOfResidence(b.student.countryOfResidence);
    if (b.student.city) setCity(b.student.city);
    if (b.student.currentSchool) setCurrentSchool(b.student.currentSchool);
    if (b.student.mockTestScore) setMockTestScore(b.student.mockTestScore);
    if (b.student.targetScore) setTargetScore(b.student.targetScore);
    if (b.student.targetSchool) setTargetSchool(b.student.targetSchool);
    if (b.student.photoUrl) setPhotoPreview(b.student.photoUrl);
    if (b.status === 'completed') {
      setIsCompleted(true);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Check if token is present (either in query param ?t=tok_... or in path /parent/tok_...)
        const candidateToken = tokenFromQuery.startsWith('tok_') 
          ? tokenFromQuery 
          : (idOrToken.startsWith('tok_') ? idOrToken : null);

        let localBooking: BookingRecord | null = null;
        if (candidateToken) {
          localBooking = decodeBookingToken(candidateToken);
        }

        // If decoded locally, render immediately with 0ms network latency
        if (localBooking) {
          setBooking(localBooking);
          populateForm(localBooking);
          setLoading(false);
        }

        // 2. Fetch server record using short clean ID to check for live updates/completion
        const lookupId = localBooking?.id || (idOrToken.startsWith('tok_') ? '' : idOrToken);
        if (lookupId) {
          try {
            const res = await fetch(`/api/bookings/${encodeURIComponent(lookupId)}?role=parent`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.booking) {
                setBooking(data.booking);
                populateForm(data.booking);
              }
            }
          } catch (e) {
            console.log('[ParentPage] Running in self-contained mode:', e);
          }
        } else if (!localBooking) {
          throw new Error('Onboarding link not found or expired. Please contact your PW Global Sales Counsellor.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Could not load enrollment details.');
      } finally {
        setLoading(false);
      }
    }

    if (idOrToken || tokenFromQuery) {
      loadData();
    }
  }, [idOrToken, tokenFromQuery, populateForm]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo must be less than 10MB');
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
        // Small sharp ~15KB JPEG
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleValidateStep1 = (e: React.FormEvent) => {
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
      setErrorMsg('Parent Email is required to receive the official admission copy.');
      return;
    }
    if (!countryOfResidence.trim()) {
      setErrorMsg('Country of Residence is mandatory.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('City is mandatory.');
      return;
    }

    // Advance to Step 2: Terms and Conditions
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!termsAccepted) {
      setErrorMsg('You must check the box agreeing to the Admission Rules & Terms.');
      return;
    }
    if (!parentLegalSignature.trim()) {
      setErrorMsg('Please type your Full Legal Name as your digital signature.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        status: 'completed',
        student: {
          name: studentName.trim(),
          fatherName: fatherName.trim(),
          grade,
          studentEmail: studentEmail.trim().toLowerCase(),
          parentEmail: parentEmail.trim().toLowerCase(),
          parentPhone: parentPhone.trim(),
          originCountry,
          countryOfResidence: countryOfResidence.trim(),
          city: city.trim(),
          currentSchool: currentSchool.trim(),
          mockTestScore: mockTestScore.trim(),
          targetScore: targetScore.trim(),
          targetExamMonth,
          targetSchool: targetSchool.trim(),
          photoUrl: photoPreview || '',
        },
        terms: {
          termsAccepted: true,
          parentLegalSignature: parentLegalSignature.trim(),
          signedAt: new Date().toISOString()
        }
      };

      const submitId = booking?.id || (idOrToken.startsWith('tok_') ? 'stateless' : idOrToken);
      const res = await fetch(`/api/bookings/${encodeURIComponent(submitId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          originalBooking: booking,
          token: booking?.token || (idOrToken.startsWith('tok_') ? idOrToken : '')
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      setBooking(data.booking);
      setIsCompleted(true);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">Loading PW Global Onboarding Portal...</div>
        </div>
      </div>
    );
  }

  if (errorMsg && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enrollment Link Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {errorMsg}. Please contact your assigned PhysicsWallah Global Sales Counsellor to verify the link.
          </p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const currencySymbol = booking.payment.currency === 'INR' ? '₹' : booking.payment.currency === 'USD' ? '$' : booking.payment.currency === 'AED' ? 'AED' : booking.payment.currency;
  const batchName = booking.program?.productEnrolled || booking.batchName;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <PWLogo size="md" />
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Admission Reference</span>
            <div className="font-mono text-xs font-bold text-slate-800">{booking.id}</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Completed State */}
        {isCompleted ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <span className="bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
                Admission Formally Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black">Enrolment Complete &amp; Dispatched!</h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
                Thank you! The student details and digitally signed admission terms for <strong>{booking.student.name || studentName}</strong> in <strong>{batchName}</strong> have been accepted.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Copies Automatically Sent Directly to:</span>
                </div>
                <div className="text-xs text-emerald-950 space-y-1">
                  <div>&bull; Parent Email: <strong>{booking.student.parentEmail || parentEmail}</strong></div>
                  <div>&bull; Student Email (Portal Access): <strong>{booking.student.studentEmail || studentEmail}</strong></div>
                  <div>&bull; Counsellor: <strong>{booking.sales?.counsellorEmail}</strong></div>
                  <div>&bull; PW Global Support: <strong>{booking.supportEmailRecipient}</strong></div>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link
                  href={`/receipt/${booking.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>View / Download Official Signed Admission Receipt</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Payment & Batch Summary Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-md">
                Official Post-Payment Student Onboarding
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2">Welcome to PhysicsWallah Global!</h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Your admission payment has been confirmed. Please complete the student onboarding details and digitally sign the admission terms below.
              </p>

              {/* Verified Details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Enrolled Batch</span>
                  <div className="text-xs font-bold text-white mt-0.5 truncate" title={batchName}>{batchName}</div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Program Format</span>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {booking.program?.programSelection || 'Group'} 
                    {booking.program?.groupHours ? ` (${booking.program.groupHours})` : ''}
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Fee Status</span>
                  <div className="text-xs font-bold mt-0.5">
                    {booking.payment.fullAmountPaid === 'yes' ? (
                      <span className="text-emerald-400">Paid in Full ({currencySymbol} {booking.payment.soldPrice.toLocaleString()})</span>
                    ) : (
                      <span className="text-amber-400">Due: {currencySymbol} {booking.payment.dueAmount.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Sales Counsellor</span>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">{booking.sales?.salesRepresentative}</div>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>Step 1: Student Details &amp; Residency</span>
              </button>

              <span className="text-slate-400">&rarr;</span>

              <button
                type="button"
                onClick={() => {
                  if (studentName && studentEmail && parentEmail && countryOfResidence && city) {
                    setStep(2);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                }`}
              >
                <span>Step 2: Admission Rules &amp; Terms (TnCs)</span>
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 font-semibold">{errorMsg}</div>
              </div>
            )}

            {/* STEP 1: STUDENT DETAILS & RESIDENCY */}
            {step === 1 && (
              <form onSubmit={handleValidateStep1} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 animate-fade-in">
                <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Step 1: Student Information &amp; Residency
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Student Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Student's Legal Full Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Father&apos;s / Guardian&apos;s Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Father's Legal Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Grade */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grade / Class *
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Student Mail ID with Critical Disclaimer */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Student E-mail ID * (Portal Access)
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student.email@example.com"
                      className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-amber-900 leading-tight">
                        <strong>Mandatory Policy:</strong> Digital portal and class access will be given on this Student Mail ID. <u>This email cannot be changed later under any circumstances</u>.
                      </p>
                    </div>
                  </div>

                  {/* Parent Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Parent Email ID *
                    </label>
                    <input
                      type="email"
                      required
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                    />
                  </div>

                  {/* Parent Phone with Country-wise Digit Check */}
                  <PhoneInput
                    label="Parent WhatsApp / Mobile No."
                    required
                    value={parentPhone}
                    onChange={(val) => setParentPhone(val)}
                  />

                  {/* MANDATORY: Country of Residence */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      Country of Residence * <span className="text-red-500 font-bold">(Mandatory)</span>
                    </label>
                    <select
                      required
                      value={countryOfResidence}
                      onChange={(e) => setCountryOfResidence(e.target.value)}
                      className="w-full bg-indigo-50/40 border border-indigo-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Country of Residence --</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* MANDATORY: City */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      City * <span className="text-red-500 font-bold">(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dubai, Abu Dhabi, Riyadh, Jeddah"
                      className="w-full bg-indigo-50/40 border border-indigo-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Origin Country */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Origin Country
                    </label>
                    <select
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Current School */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current School
                    </label>
                    <input
                      type="text"
                      value={currentSchool}
                      onChange={(e) => setCurrentSchool(e.target.value)}
                      placeholder="e.g. Dubai College / DPS"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>

                  {/* Mock Score */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mock Test Score (if given)
                    </label>
                    <input
                      type="text"
                      value={mockTestScore}
                      onChange={(e) => setMockTestScore(e.target.value)}
                      placeholder="e.g. 1320 or 85%"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>

                  {/* Target Score */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Score
                    </label>
                    <input
                      type="text"
                      value={targetScore}
                      onChange={(e) => setTargetScore(e.target.value)}
                      placeholder="e.g. 1550+"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>

                  {/* Target Exam Month */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Exam Month
                    </label>
                    <select
                      value={targetExamMonth}
                      onChange={(e) => setTargetExamMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                    >
                      {TARGET_EXAM_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Target School */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target School / University
                    </label>
                    <input
                      type="text"
                      value={targetSchool}
                      onChange={(e) => setTargetSchool(e.target.value)}
                      placeholder="e.g. Stanford / IIT Bombay"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900"
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
                          <span className="text-xs font-bold text-slate-700">Upload Student Photo (Max 5MB)</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                  >
                    <span>Continue to Terms &amp; Conditions</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: TERMS & CONDITIONS (TnCs) & DIGITAL SIGNATURE */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
                
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
                  
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                      <FileText className="w-4 h-4" />
                      <span>Legal Agreement &bull; Mandatory Acceptance</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Admission Rules &amp; Terms</h2>
                    <p className="text-xs text-slate-600 mt-1">
                      We hereby confirm that at the time of enrolment, we have read, understood, and agreed to the following terms and conditions:
                    </p>
                  </div>

                  {/* The 10 Terms Clauses clearly rendered */}
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2">
                    {ADMISSION_TERMS_AND_CONDITIONS.map((clause) => (
                      <div key={clause.number} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="font-extrabold text-slate-900 mb-1">
                          Clause {clause.number}. {clause.title}
                        </div>
                        <div className="text-slate-700 leading-relaxed font-normal">
                          {clause.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mandatory Checkbox */}
                  <div className="p-4 bg-amber-50/70 border-2 border-amber-300 rounded-xl">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded text-indigo-600 border-amber-400 focus:ring-indigo-500 shrink-0 cursor-pointer"
                      />
                      <div className="text-xs font-bold text-amber-950 leading-relaxed">
                        I hereby declare that I have read, understood, and accept all the above PhysicsWallah Global Admission Rules &amp; Terms. I confirm that all the student information provided is accurate and agree that portal access will be locked to the provided email.
                        <span className="text-red-600 block mt-0.5">* (Admission cannot be confirmed without checking this box)</span>
                      </div>
                    </label>
                  </div>

                  {/* Digital Legal Signature */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-900">
                      Parent / Guardian Digital Signature (Type Full Legal Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={parentLegalSignature}
                      onChange={(e) => setParentLegalSignature(e.target.value)}
                      placeholder="Type your Full Legal Name (e.g. Vikram Sharma)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold font-serif text-slate-900 tracking-wide focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="text-[11px] text-slate-500">
                      By typing your full legal name above, you are providing a legally binding electronic signature acknowledging acceptance of all course rules, fee schedules, and non-refundable terms.
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Student Details</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !termsAccepted || !parentLegalSignature.trim()}
                      className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition ${
                        submitting || !termsAccepted || !parentLegalSignature.trim()
                          ? 'bg-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      }`}
                    >
                      {submitting ? 'Confirming Admission...' : 'Accept Terms & Confirm Admission'}
                    </button>
                  </div>

                  {!termsAccepted && (
                    <div className="text-center text-xs text-red-600 font-semibold">
                      ⚠️ Note: The submit button remains disabled until you click the agreement checkbox and type your signature.
                    </div>
                  )}

                </div>

              </form>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
