import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all regions
export async function GET(request) {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
  }
}