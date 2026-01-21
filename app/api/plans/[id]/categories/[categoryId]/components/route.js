import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// POST - Add new component to category (Admin only)
export async function POST(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { categoryId } = params;
    const componentData = await request.json();

    // Get the highest order number for this category
    const maxOrder = await prisma.component.findFirst({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newComponent = await prisma.component.create({
      data: {
        categoryId: parseInt(categoryId),
        name: componentData.name || 'New Component',
        order: (maxOrder?.order || 0) + 1,
        tickets1: parseFloat(componentData.tickets1) || 0,
        tickets10: parseFloat(componentData.tickets10) || 0,
        tickets100: parseFloat(componentData.tickets100) || 0,
        tickets1000: parseFloat(componentData.tickets1000) || 0,
        tickets5000: parseFloat(componentData.tickets5000) || 0,
        customFieldData: componentData.customFieldData || {},
      },
    });

    return NextResponse.json(newComponent);
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json({ error: 'Failed to create component' }, { status: 500 });
  }
}

// PUT - Update all components in category (Admin only)
export async function PUT(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { categoryId } = params;
    const { components } = await request.json();

    // Update each component
    const updates = components.map((comp) =>
      prisma.component.update({
        where: { id: comp.id },
        data: {
          name: comp.name,
          tickets1: parseFloat(comp.tickets1) || 0,
          tickets10: parseFloat(comp.tickets10) || 0,
          tickets100: parseFloat(comp.tickets100) || 0,
          tickets1000: parseFloat(comp.tickets1000) || 0,
          tickets5000: parseFloat(comp.tickets5000) || 0,
          customFieldData: comp.customFieldData || {},
          order: comp.order,
        },
      })
    );

    await Promise.all(updates);

    const updatedComponents = await prisma.component.findMany({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(updatedComponents);
  } catch (error) {
    console.error('Error updating components:', error);
    return NextResponse.json({ error: 'Failed to update components' }, { status: 500 });
  }
}