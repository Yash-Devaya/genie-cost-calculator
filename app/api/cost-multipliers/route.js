import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET all cost multiplier profiles
export async function GET(request) {
  try {
    const profiles = await prisma.costMultiplierProfile.findMany({
      include: {
        multipliers: {
          include: {
            region: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching cost multipliers:', error);
    return NextResponse.json({ error: 'Failed to fetch cost multipliers' }, { status: 500 });
  }
}

// POST - Create new cost multiplier profile (Admin only)
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
    }

    const { name, multipliers } = await request.json();

    if (!name || !multipliers) {
      return NextResponse.json({ error: 'Name and multipliers are required' }, { status: 400 });
    }

    // Create profile with multipliers
    const profile = await prisma.costMultiplierProfile.create({
      data: {
        name,
        isDefault: false,
        multipliers: {
          create: multipliers.map(m => ({
            regionId: m.regionId,
            multiplier: parseFloat(m.multiplier),
          })),
        },
      },
      include: {
        multipliers: {
          include: {
            region: true,
          },
        },
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error creating cost multiplier:', error);
    return NextResponse.json({ 
      error: 'Failed to create cost multiplier',
      message: error.message 
    }, { status: 500 });
  }
}