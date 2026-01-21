import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET specific plan with all related data
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
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
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: 'Failed to fetch plan', message: error.message }, { status: 500 });
  }
}

// PATCH - Update plan (Admin only)
export async function PATCH(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const data = await request.json();

    const updatedPlan = await prisma.plan.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        description: data.description,
      },
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
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Failed to update plan', message: error.message }, { status: 500 });
  }
}

// DELETE - Delete plan (Admin only)
// DELETE - Delete plan (Admin only)
export async function DELETE(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Delete all related data first (in correct order)
    await prisma.component.deleteMany({
      where: {
        category: {
          planId: parseInt(id),
        },
      },
    });

    await prisma.customField.deleteMany({
      where: { planId: parseInt(id) },
    });

    await prisma.category.deleteMany({
      where: { planId: parseInt(id) },
    });

    // Finally delete the plan
    await prisma.plan.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ 
      error: 'Failed to delete plan',
      message: error.message 
    }, { status: 500 });
  }
}