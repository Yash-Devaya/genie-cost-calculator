import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// POST - Add new component (Admin only)
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
    const componentData = await request.json();

    // Get the highest order number for this plan
    const maxOrder = await prisma.component.findFirst({
      where: { planId: parseInt(id) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newComponent = await prisma.component.create({
      data: {
        planId: parseInt(id),
        name: componentData.name,
        service: componentData.service,
        specifications: componentData.specifications,
        scalingRationale: componentData.scalingRationale,
        isDeployment: componentData.isDeployment || false,
        order: (maxOrder?.order || 0) + 1,
        tickets1: parseFloat(componentData.tickets1) || 0,
        tickets10: parseFloat(componentData.tickets10) || 0,
        tickets100: parseFloat(componentData.tickets100) || 0,
        tickets1000: parseFloat(componentData.tickets1000) || 0,
        tickets5000: parseFloat(componentData.tickets5000) || 0,
      },
    });

    return NextResponse.json(newComponent);
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json({ error: 'Failed to create component' }, { status: 500 });
  }
}

// PUT - Update all components (Admin only)
export async function PUT(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const { components } = await request.json();

    // Update each component
    const updates = components.map((comp) =>
      prisma.component.update({
        where: { id: comp.id },
        data: {
          name: comp.name,
          service: comp.service,
          specifications: comp.specifications,
          scalingRationale: comp.scalingRationale,
          tickets1: parseFloat(comp.tickets1) || 0,
          tickets10: parseFloat(comp.tickets10) || 0,
          tickets100: parseFloat(comp.tickets100) || 0,
          tickets1000: parseFloat(comp.tickets1000) || 0,
          tickets5000: parseFloat(comp.tickets5000) || 0,
          order: comp.order,
        },
      })
    );

    await Promise.all(updates);

    const updatedPlan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
      include: {
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating components:', error);
    return NextResponse.json({ error: 'Failed to update components' }, { status: 500 });
  }
}