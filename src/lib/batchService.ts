import fs from 'fs';
import path from 'path';
import { INITIAL_BATCHES } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const BATCHES_FILE = path.join(DATA_DIR, 'batches.json');

let memoryBatches: string[] = [...INITIAL_BATCHES];

function ensureBatchesFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BATCHES_FILE)) {
      fs.writeFileSync(BATCHES_FILE, JSON.stringify(INITIAL_BATCHES, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Filesystem access failed for batches, running in memory-only mode:', err);
  }
}

export function getAllBatches(): string[] {
  try {
    ensureBatchesFile();
    if (fs.existsSync(BATCHES_FILE)) {
      const data = fs.readFileSync(BATCHES_FILE, 'utf-8');
      const list = JSON.parse(data) as string[];
      memoryBatches = list;
      return list;
    }
  } catch (err) {
    console.warn('Error reading batches file:', err);
  }
  return memoryBatches;
}

export function addBatchIfNew(rawName: string): { added: boolean; batch: string; allBatches: string[] } {
  const cleanName = rawName.trim();
  if (!cleanName) {
    return { added: false, batch: '', allBatches: getAllBatches() };
  }

  const current = getAllBatches();
  const existing = current.find(b => b.toLowerCase() === cleanName.toLowerCase());
  
  if (existing) {
    return { added: false, batch: existing, allBatches: current };
  }

  // Add new batch uniformly
  current.push(cleanName);
  memoryBatches = current;

  try {
    ensureBatchesFile();
    fs.writeFileSync(BATCHES_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write new batch to file:', err);
  }

  return { added: true, batch: cleanName, allBatches: current };
}
