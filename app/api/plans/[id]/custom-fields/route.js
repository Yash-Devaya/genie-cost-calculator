import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// POST - Add new custom field (Admin only)
export async function POST(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const { name } = await request.json();

    // Get the highest order number for this plan
    const maxOrder = await prisma.customField.findFirst({
      where: { planId: parseInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newField = await prisma.customField.create({
      data: {
        planId: parseInt(id),
        name,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    return NextResponse.json(newField);
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 });
  }
}