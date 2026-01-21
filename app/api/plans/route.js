import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET all plans
export async function GET(request) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            components: {
              orderBy: { order: 'asc' },
            },
          },
        },
        customFields: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST - Create new plan (Admin only)
// POST - Create new plan (Admin only)
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, productId } = body;

    if (!name || !description || !productId) {
      return NextResponse.json({ 
        error: 'Name, description, and productId are required' 
      }, { status: 400 });
    }

    // Get the highest order number for this product
    const maxOrder = await prisma.plan.findFirst({
      where: { productId: parseInt(productId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newPlan = await prisma.plan.create({
      data: {
        productId: parseInt(productId),
        name,
        description,
        order: (maxOrder?.order || 0) + 1,
      },
      include: {
        categories: true,
        customFields: true,
      },
    });

    return NextResponse.json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ 
      error: 'Failed to create plan', 
      message: error.message 
    }, { status: 500 });
  }
}