import fs from 'fs';
import path from 'path';
import { AppSettings } from './types';
import { PW_GLOBAL_DEFAULT_SUPPORT_EMAIL } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const defaultSettings: AppSettings = {
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'PW Global Admissions <noreply@pw.live>',
  supportEmail: process.env.PW_GLOBAL_SUPPORT_EMAIL || PW_GLOBAL_DEFAULT_SUPPORT_EMAIL,
  googleSheetWebhookUrl: process.env.GOOGLE_SHEET_WEBHOOK_URL || '',
  googleSheetId: process.env.GOOGLE_SHEET_ID || ''
};

let memorySettings: AppSettings = { ...defaultSettings };

function ensureSettingsFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Filesystem access failed for settings:', err);
  }
}

export function getSettings(): AppSettings {
  try {
    ensureSettingsFile();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data) as Partial<AppSettings>;
      memorySettings = {
        ...defaultSettings,
        ...parsed,
        // Allow env to override if provided
        smtpHost: parsed.smtpHost || process.env.SMTP_HOST || '',
        smtpUser: parsed.smtpUser || process.env.SMTP_USER || '',
        smtpPass: parsed.smtpPass || process.env.SMTP_PASS || '',
        googleSheetWebhookUrl: parsed.googleSheetWebhookUrl || process.env.GOOGLE_SHEET_WEBHOOK_URL || ''
      };
      return memorySettings;
    }
  } catch (err) {
    console.warn('Error reading settings file:', err);
  }
  return memorySettings;
}

export function saveSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const merged: AppSettings = {
    ...current,
    ...updates,
    smtpPort: updates.smtpPort ? Number(updates.smtpPort) : current.smtpPort
  };

  memorySettings = merged;

  try {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write settings to file:', err);
  }

  return merged;
}
