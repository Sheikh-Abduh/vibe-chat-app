import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for network connectivity testing
 * Used by call error handler to verify network connectivity
 */

export async function GET(request: NextRequest) {
  try {
    // Simple health check response
    return NextResponse.json(
      { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  try {
    // HEAD request for lightweight connectivity check
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check HEAD failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // POST endpoint for more detailed connectivity testing
    const body = await request.json().catch(() => ({}));
    
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        requestId: body.requestId || 'unknown'
      },
      server: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Health check POST failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}