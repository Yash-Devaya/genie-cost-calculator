import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all plans for a product
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const plans = await prisma.plan.findMany({
      where: { 
        productId: parseInt(id),
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}