import fs from 'fs';
import path from 'path';
import { BookingRecord } from './types';

// In-memory fallback in case of serverless / read-only filesystem
let memoryStore: BookingRecord[] = [];

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Filesystem access failed, running in memory-only mode:', err);
  }
}

export function getAllBookings(): BookingRecord[] {
  try {
    ensureDataFile();
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const list = JSON.parse(data) as BookingRecord[];
      // Keep memory store synced
      memoryStore = list;
      return list;
    }
  } catch (err) {
    console.warn('Error reading bookings file, falling back to memoryStore:', err);
  }
  return memoryStore;
}

export function getBookingById(idOrToken: string): BookingRecord | null {
  const bookings = getAllBookings();
  return bookings.find(b => b.id === idOrToken || b.token === idOrToken) || null;
}

export function saveBooking(booking: BookingRecord): BookingRecord {
  const bookings = getAllBookings();
  const existingIdx = bookings.findIndex(b => b.id === booking.id);
  
  if (existingIdx >= 0) {
    bookings[existingIdx] = { ...booking, updatedAt: new Date().toISOString() };
  } else {
    bookings.unshift(booking);
  }

  memoryStore = bookings;

  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving booking to file, saved in memoryStore:', err);
  }

  return booking;
}

export function deleteBooking(id: string): boolean {
  let bookings = getAllBookings();
  const initialLen = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  
  if (bookings.length !== initialLen) {
    memoryStore = bookings;
    try {
      ensureDataFile();
      fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Error deleting booking from file:', err);
    }
    return true;
  }
  return false;
}
