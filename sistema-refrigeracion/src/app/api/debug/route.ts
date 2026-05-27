import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        DATABASE_URL_PREVIEW: process.env.DATABASE_URL?.substring(0, 40) ?? 'UNDEFINED',
        NODE_ENV: process.env.NODE_ENV,
    });
}
