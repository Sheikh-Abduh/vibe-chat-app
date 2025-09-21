// Deprecated endpoint: VideoSDK was removed. Keep a stub to avoid runtime 404s if still referenced.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'VideoSDK integration removed. Use WebRTC flows instead.' },
    { status: 410 }
  );
}
