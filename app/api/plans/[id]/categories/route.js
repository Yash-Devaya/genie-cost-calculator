import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// POST - Add new category (Admin only)
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
    const { name, showTotal } = await request.json();

    // Get the highest order number for this plan
    const maxOrder = await prisma.category.findFirst({
      where: { planId: parseInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newCategory = await prisma.category.create({
      data: {
        planId: parseInt(id),
        name,
        showTotal: showTotal !== undefined ? showTotal : true,
        order: (maxOrder?.order || 0) + 1,
      },
      include: {
        components: true,
      },
    });

    return NextResponse.json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}