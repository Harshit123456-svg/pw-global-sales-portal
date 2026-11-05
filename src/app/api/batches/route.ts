import { NextRequest, NextResponse } from 'next/server';
import { getAllBatches, addBatchIfNew } from '@/lib/batchService';

export async function GET() {
  try {
    const batches = getAllBatches();
    return NextResponse.json({ success: true, batches });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { batchName } = await req.json();
    if (!batchName || !batchName.trim()) {
      return NextResponse.json({ success: false, error: 'Batch name cannot be empty' }, { status: 400 });
    }

    const result = addBatchIfNew(batchName);
    return NextResponse.json({
      success: true,
      added: result.added,
      batch: result.batch,
      batches: result.allBatches
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
