import fs from 'fs';
import path from 'path';
import os from 'os';
import { INITIAL_BATCHES } from './constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const BATCHES_FILE = path.join(DATA_DIR, 'batches.json');
const TMP_BATCHES_FILE = path.join(os.tmpdir(), 'pw_global_batches.json');

let memoryBatches: string[] = [...INITIAL_BATCHES];

function readBatchesFromDisk(): string[] {
  // 1. Try reading from serverless /tmp
  try {
    if (fs.existsSync(TMP_BATCHES_FILE)) {
      const data = fs.readFileSync(TMP_BATCHES_FILE, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {}

  // 2. Try reading from workspace data folder
  try {
    if (fs.existsSync(BATCHES_FILE)) {
      const data = fs.readFileSync(BATCHES_FILE, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {}

  return [...INITIAL_BATCHES];
}

function writeBatchesToDisk(list: string[]) {
  const jsonStr = JSON.stringify(list, null, 2);

  // 1. Try serverless /tmp
  try {
    fs.writeFileSync(TMP_BATCHES_FILE, jsonStr, 'utf-8');
  } catch (err) {}

  // 2. Try workspace data folder
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BATCHES_FILE, jsonStr, 'utf-8');
  } catch (err) {}
}

export function getAllBatches(): string[] {
  const disk = readBatchesFromDisk();
  // Merge uniquely
  const set = new Set([...INITIAL_BATCHES, ...memoryBatches, ...disk]);
  memoryBatches = Array.from(set);
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
  writeBatchesToDisk(current);

  return { added: true, batch: cleanName, allBatches: current };
}
