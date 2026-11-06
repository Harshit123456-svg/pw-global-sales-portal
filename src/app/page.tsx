'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { CounsellorForm } from '@/components/CounsellorForm';
import { ParentShareGenerator } from '@/components/ParentShareGenerator';
import { BookingsTable } from '@/components/BookingsTable';
import { BookingRecord, AppSettings } from '@/lib/types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/googleSheetTemplate';
import { INITIAL_BATCHES } from '@/lib/constants';
import { 
  Settings, Mail, Sheet, Check, Copy, AlertCircle, 
  Send, Sparkles, X, ExternalLink, ShieldCheck, RefreshCw, Globe, HelpCircle 
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'counsellor' | 'share' | 'records'>('counsellor');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Global Batches State (Shared across all tabs)
  const [batches, setBatches] = useState<string[]>([]);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'sheets' | 'email' | 'publish'>('sheets');
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    supportEmail: 'pwglobal_support@pw.live',
    googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbwpb2aS5d6qttGkBzjcuHE8zeyH6XupIPlE-HXGPfyKS1LzFzOG551MPbnoWz_PVaAuvQ/exec'
  });
  const [copiedScript, setCopiedScript] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      const data = await res.json();
      let serverList: BookingRecord[] = (data.success && data.bookings) ? data.bookings : [];

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('pw_local_bookings');
          if (cached) {
            const localList = JSON.parse(cached) as BookingRecord[];
            const map = new Map<string, BookingRecord>();
            for (const b of localList) map.set(b.id, b);
            for (const b of serverList) map.set(b.id, b);
            serverList = Array.from(map.values()).sort((a, b) => 
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          }
          localStorage.setItem('pw_local_bookings', JSON.stringify(serverList));
        } catch (e) {
          // ignore
        }
      }

      setBookings(serverList);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        let mergedSettings = { ...data.settings };
        if (typeof window !== 'undefined') {
          try {
            const localSettings = localStorage.getItem('pw_local_settings');
            if (localSettings) {
              const parsed = JSON.parse(localSettings);
              if (parsed.googleSheetWebhookUrl && !mergedSettings.googleSheetWebhookUrl) {
                mergedSettings.googleSheetWebhookUrl = parsed.googleSheetWebhookUrl;
              }
            }
          } catch (e) {}
        }
        setSettings(prev => ({
          ...prev,
          ...mergedSettings
        }));
        if (data.settings.smtpUser && !testEmailAddress) {
          setTestEmailAddress(data.settings.smtpUser);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, [testEmailAddress]);

  const fetchBatches = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pw_local_batches');
        const cached = localStorage.getItem('pw_local_batches_v3');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            setBatches(list);
          }
        }
      }
      const res = await fetch('/api/batches');
      const data = await res.json();
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pw_local_batches_v3', JSON.stringify(data.batches));
        }
      }
    } catch (e) {}
  }, []);

  const handleAddBatch = (newBatch: string) => {
    const clean = newBatch.trim();
    if (!clean) return;
    setBatches(prev => {
      if (prev.includes(clean)) return prev;
      const updated = [...prev, clean];
      if (typeof window !== 'undefined') {
        localStorage.setItem('pw_local_batches_v3', JSON.stringify(updated));
      }
      return updated;
    });
  };

  useEffect(() => {
    fetchBookings();
    loadSettings();
    fetchBatches();
  }, [fetchBookings, loadSettings, fetchBatches]);

  const handleBookingCreated = (newBooking: BookingRecord) => {
    setBookings(prev => {
      const updated = [newBooking, ...prev.filter(b => b.id !== newBooking.id)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pw_local_bookings', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
    fetchBookings();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pw_local_settings', JSON.stringify(settings));
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }
      setSettingsNotice({ type: 'success', message: 'Settings saved successfully!' });
      loadSettings();
    } catch (err: any) {
      setSettingsNotice({ type: 'error', message: err.message });
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      alert('Please enter a test recipient email address');
      return;
    }
    setSettingsNotice(null);
    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_email',
          testEmail: testEmailAddress,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
          smtpFrom: settings.smtpFrom
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }
      setSettingsNotice({ type: 'success', message: data.message });
    } catch (err: any) {
      setSettingsNotice({ type: 'error', message: err.message });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTestSheet = async () => {
    if (!settings.googleSheetWebhookUrl) {
      alert('Please enter a Google Apps Script Webhook URL');
      return;
    }
    setSettingsNotice(null);
    setIsTestingSheet(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_sheet',
          webhookUrl: settings.googleSheetWebhookUrl
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect to Google Sheet');
      }
      setSettingsNotice({ type: 'success', message: data.message });
    } catch (err: any) {
      setSettingsNotice({ type: 'error', message: err.message });
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recordsCount={bookings.length}
        />

        {/* Workflow & Quick Settings Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-900">Current Sales Workflow:</span>
              <span className="text-slate-600">
                {activeTab === 'counsellor' && 'Direct Counsellor Entry (All details filled & submitted in one go)'}
                {activeTab === 'share' && 'Post-Payment Link Mode (Generate pre-filled link for parent to complete & sign TnCs)'}
                {activeTab === 'records' && 'Sales Management Hub (Track receipts, dues countdown, Google Sheet sync, and CSV)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsTab('publish');
                  setShowSettingsModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publish Free on Web</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Sheet &amp; Mail Setup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {activeTab === 'counsellor' && (
            <CounsellorForm 
              onSuccess={handleBookingCreated} 
              sharedBatches={batches}
              onAddBatch={handleAddBatch}
            />
          )}

          {activeTab === 'share' && (
            <ParentShareGenerator 
              onCreated={handleBookingCreated} 
              sharedBatches={batches}
              onAddBatch={handleAddBatch}
            />
          )}

          {activeTab === 'records' && (
            <BookingsTable
              bookings={bookings}
              onRefresh={fetchBookings}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} <strong>PhysicsWallah Global (PW Global)</strong>. Admissions &amp; Sales Technology.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Sheet className="w-3.5 h-3.5 text-emerald-600" /> Sorted Google Sheet (IST)
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Direct Parent Email Delivery
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Authenticity Audit Active
            </span>
          </div>
        </div>
      </footer>

      {/* Settings Modal (Google Sheet, SMTP, and Free Web Publishing) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Google Sheet, Mail &amp; Free Web Hosting</h3>
                  <p className="text-xs text-slate-500">Configure IST sorted Google Sheets, SMTP delivery, and free web publishing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSettingsTab('sheets')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                  settingsTab === 'sheets' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Sheet className="w-4 h-4 text-emerald-600" />
                <span>1. Google Sheet (IST Sorted)</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('email')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                  settingsTab === 'email' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>2. Parent Email (SMTP)</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('publish')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                  settingsTab === 'publish' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>3. Publish Free on Web</span>
              </button>
            </div>

            {settingsNotice && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                settingsNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {settingsNotice.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{settingsNotice.message}</span>
              </div>
            )}

            {/* TAB 1: GOOGLE SHEETS */}
            {settingsTab === 'sheets' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1">
                    Where is the Google Sheet &amp; How Does it Sort?
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The Google Sheet is created directly in <strong>your Google Drive</strong> so your organization maintains 100% data ownership. Every submission is formatted in <strong>Indian Standard Time (IST)</strong> and automatically inserted at the top of the sheet so the newest admissions are always first!
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span>How to Create Your Google Sheet (60 Seconds):</span>
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold underline"
                    >
                      <span>Open sheets.new &rarr;</span>
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11.5px]">
                    <li>Open a new Google Sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600">sheets.new</a> and name it <strong>&ldquo;PW Global - Admissions Master Sheet&rdquo;</strong>.</li>
                    <li>In the top menu, click <strong>Extensions &rarr; Apps Script</strong>.</li>
                    <li>Click the copy button below and paste the code into the script editor.</li>
                    <li>Click <strong>Deploy &rarr; New deployment</strong>:
                      <ul className="list-disc list-inside ml-4 mt-0.5 text-slate-500">
                        <li>Type: <strong>Web app</strong></li>
                        <li>Execute as: <strong>Me</strong></li>
                        <li>Who has access: <strong>Anyone</strong></li>
                      </ul>
                    </li>
                    <li>Click <strong>Deploy</strong>, copy the <strong>Web App URL</strong>, paste it below, and click <strong>Test Google Sheet Connection</strong>!</li>
                  </ol>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{copiedScript ? 'Copied Apps Script Code!' : 'Copy Google Apps Script Code'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    value={settings.googleSheetWebhookUrl || ''}
                    onChange={(e) => setSettings({ ...settings, googleSheetWebhookUrl: e.target.value })}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleTestSheet}
                    disabled={isTestingSheet || !settings.googleSheetWebhookUrl}
                    className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                  >
                    {isTestingSheet ? 'Testing...' : 'Test Google Sheet Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Save Google Sheet Settings
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EMAIL / SMTP */}
            {settingsTab === 'email' && (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-1">
                    Direct Email Dispatch to Parent &amp; Student (SMTP)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Configure your official sender credentials (e.g. Gmail App Password, Microsoft 365, or SendGrid) so invitations and final confirmed receipts are delivered directly to parent inboxes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SMTP Host *</label>
                    <input
                      type="text"
                      required
                      value={settings.smtpHost || ''}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="e.g. smtp.gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SMTP Port *</label>
                    <input
                      type="number"
                      required
                      value={settings.smtpPort || 587}
                      onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sender Email / Username *</label>
                    <input
                      type="email"
                      required
                      value={settings.smtpUser || ''}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      placeholder="e.g. admissions.global@pw.live"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      App Password * {settings.hasSmtpPass ? '(Password Saved)' : ''}
                    </label>
                    <input
                      type="password"
                      value={settings.smtpPass || ''}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder={settings.hasSmtpPass ? '••••••••••••••••' : 'Enter 16-char App Password'}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">From Header</label>
                    <input
                      type="text"
                      value={settings.smtpFrom || ''}
                      onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                      placeholder='PW Global Admissions <noreply@pw.live>'
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed">
                  <strong>Gmail Tip:</strong> Enable 2-Step Verification &rarr; go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold">Google App Passwords</a> &rarr; generate 16-character password &rarr; paste it above.
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Test Direct Email Delivery Right Now:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter your email to receive test message"
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail || !testEmailAddress}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0"
                    >
                      {isTestingEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                  </div>
                </div>

                <div className="text-right pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Save Email Settings
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: PUBLISH FOR FREE ON WEB */}
            {settingsTab === 'publish' && (
              <div className="space-y-5 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-1">
                    How to Publish This Portal Online for Free
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    You can host this entire Next.js portal on the web completely free with high speed, global CDN, and free SSL certificate (<code className="text-indigo-600">https://</code>) using <strong>Vercel</strong> or <strong>Render</strong>.
                  </p>
                </div>

                {/* Vercel Option */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                    <span>Option A: Vercel (100% Free Forever &bull; Recommended)</span>
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">60 Seconds</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11.5px]">
                    <li>Push this project directory to your <strong>GitHub</strong> account:
                      <div className="bg-slate-950 text-slate-200 p-2 rounded-lg font-mono text-[10.5px] my-1">
                        git init &amp;&amp; git add . &amp;&amp; git commit -m &quot;PW Global Portal&quot;<br />
                        git branch -M main &amp;&amp; git push -u origin main
                      </div>
                    </li>
                    <li>Go to <a href="https://vercel.com" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600">vercel.com</a>, sign up with GitHub, and click <strong>&ldquo;Add New... &rarr; Project&rdquo;</strong>.</li>
                    <li>Select this repository and click <strong>&ldquo;Deploy&rdquo;</strong>. Vercel automatically builds and deploys it!</li>
                    <li>Add your environment variables under <strong>Settings &rarr; Environment Variables</strong> on Vercel:
                      <ul className="list-disc list-inside ml-4 text-[11px] text-slate-500">
                        <li><code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code></li>
                        <li><code>GOOGLE_SHEET_WEBHOOK_URL</code></li>
                      </ul>
                    </li>
                    <li>Done! You get a live web URL (e.g. <code>https://pw-global-sales.vercel.app</code>) that counsellors and parents can open from anywhere in the world!</li>
                  </ol>
                </div>

                {/* Render Option */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                    <span>Option B: Render.com (Free Web Service)</span>
                    <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Free</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px]">
                    Go to <a href="https://render.com" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600">render.com</a> &rarr; New Web Service &rarr; Connect GitHub repository &rarr; Build command: <code>npm run build</code> &rarr; Start command: <code>npm start</code>.
                  </p>
                </div>

                <div className="text-right pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Got It!
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
