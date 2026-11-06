import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppSettings } from './types';
import { PW_GLOBAL_DEFAULT_SUPPORT_EMAIL } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TMP_SETTINGS_FILE = path.join(os.tmpdir(), 'pw_global_settings.json');

const defaultSettings: AppSettings = {
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'PW Global Admissions <noreply@pw.live>',
  supportEmail: process.env.PW_GLOBAL_SUPPORT_EMAIL || PW_GLOBAL_DEFAULT_SUPPORT_EMAIL,
  googleSheetWebhookUrl: process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwpb2aS5d6qttGkBzjcuHE8zeyH6XupIPlE-HXGPfyKS1LzFzOG551MPbnoWz_PVaAuvQ/exec',
  googleSheetId: process.env.GOOGLE_SHEET_ID || ''
};

let memorySettings: AppSettings = { ...defaultSettings };

function readSettingsFromDisk(): Partial<AppSettings> {
  // 1. Try reading from /tmp (writable on Vercel)
  try {
    if (fs.existsSync(TMP_SETTINGS_FILE)) {
      const data = fs.readFileSync(TMP_SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    // ignore
  }

  // 2. Try reading from project workspace settings file
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    // ignore
  }

  return {};
}

function writeSettingsToDisk(settings: AppSettings) {
  const jsonStr = JSON.stringify(settings, null, 2);

  // 1. Always attempt write to serverless /tmp
  try {
    fs.writeFileSync(TMP_SETTINGS_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // ignore
  }

  // 2. Attempt write to project workspace data folder (may be read-only on Vercel)
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // Expected on Vercel read-only filesystem
  }
}

export function getSettings(): AppSettings {
  const diskSettings = readSettingsFromDisk();

  memorySettings = {
    ...defaultSettings,
    ...diskSettings,
    // Always let explicit environment variables override if present
    smtpHost: diskSettings.smtpHost || process.env.SMTP_HOST || defaultSettings.smtpHost,
    smtpUser: diskSettings.smtpUser || process.env.SMTP_USER || defaultSettings.smtpUser,
    smtpPass: diskSettings.smtpPass || process.env.SMTP_PASS || defaultSettings.smtpPass,
    googleSheetWebhookUrl: diskSettings.googleSheetWebhookUrl || process.env.GOOGLE_SHEET_WEBHOOK_URL || defaultSettings.googleSheetWebhookUrl
  };

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
  writeSettingsToDisk(merged);

  return merged;
}
