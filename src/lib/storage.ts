import fs from 'fs';
import path from 'path';
import os from 'os';
import { BookingRecord } from './types';
import { decodeBookingToken } from './tokenUtils';

// In-memory fallback
let memoryStore: BookingRecord[] = [];

// Local workspace paths
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');

// Serverless /tmp path (writable on Vercel AWS Lambda)
const TMP_FILE = path.join(os.tmpdir(), 'pw_global_bookings.json');

function readFromDisk(): BookingRecord[] {
  // 1. Try reading from /tmp (most up-to-date in serverless environment)
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = fs.readFileSync(TMP_FILE, 'utf-8');
      const list = JSON.parse(data) as BookingRecord[];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    // ignore
  }

  // 2. Try reading from project data/bookings.json
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const list = JSON.parse(data) as BookingRecord[];
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    // ignore
  }

  return [];
}

function writeToDisk(bookings: BookingRecord[]) {
  const jsonStr = JSON.stringify(bookings, null, 2);

  // 1. Always attempt write to serverless /tmp
  try {
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // ignore
  }

  // 2. Attempt write to project workspace data folder (may be read-only on Vercel)
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, jsonStr, 'utf-8');
  } catch (err) {
    // Expected on Vercel read-only filesystem
  }
}

export function getAllBookings(): BookingRecord[] {
  const diskBookings = readFromDisk();
  
  // Merge memoryStore with diskBookings to ensure no data is lost
  const map = new Map<string, BookingRecord>();
  for (const b of memoryStore) {
    map.set(b.id, b);
  }
  for (const b of diskBookings) {
    map.set(b.id, b);
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  memoryStore = merged;
  return merged;
}

export function getBookingById(idOrToken: string): BookingRecord | null {
  // 1. First check if idOrToken is a stateless compressed token
  const decoded = decodeBookingToken(idOrToken);
  
  const bookings = getAllBookings();
  const existing = bookings.find(b => b.id === idOrToken || b.token === idOrToken || (decoded && b.id === decoded.id));

  // If we already have an existing version stored (e.g. marked completed or updated), return that
  if (existing) {
    return existing;
  }

  // If not found in storage but decoded successfully from stateless token, return the decoded record!
  if (decoded) {
    // Also cache it into memoryStore so subsequent actions within this session can find it
    memoryStore.unshift(decoded);
    writeToDisk(memoryStore);
    return decoded;
  }

  return null;
}

export function saveBooking(booking: BookingRecord): BookingRecord {
  const bookings = getAllBookings();
  const existingIdx = bookings.findIndex(b => b.id === booking.id || (booking.token && b.token === booking.token));

  const updatedBooking = { ...booking, updatedAt: new Date().toISOString() };

  if (existingIdx >= 0) {
    bookings[existingIdx] = updatedBooking;
  } else {
    bookings.unshift(updatedBooking);
  }

  memoryStore = bookings;
  writeToDisk(bookings);

  return updatedBooking;
}

export function deleteBooking(id: string): boolean {
  let bookings = getAllBookings();
  const initialLen = bookings.length;
  bookings = bookings.filter(b => b.id !== id);

  if (bookings.length !== initialLen) {
    memoryStore = bookings;
    writeToDisk(bookings);
    return true;
  }
  return false;
}
