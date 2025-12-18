import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET all costs
export async function GET(request) {
  try {
    const costs = await prisma.componentCost.findMany();
    
    const costsObj = {};
    costs.forEach(cost => {
      costsObj[cost.component] = {
        '1': cost.tickets1,
        '10': cost.tickets10,
        '100': cost.tickets100,
        '1000': cost.tickets1000,
        '5000': cost.tickets5000,
      };
    });

    return NextResponse.json(costsObj);
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
  }
}

// POST/UPDATE costs (Admin only)
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const costsData = await request.json();

    // Update each component
    const updates = [];
    for (const [component, values] of Object.entries(costsData)) {
      updates.push(
        prisma.componentCost.upsert({
          where: { component },
          update: {
            tickets1: parseFloat(values['1']) || 0,
            tickets10: parseFloat(values['10']) || 0,
            tickets100: parseFloat(values['100']) || 0,
            tickets1000: parseFloat(values['1000']) || 0,
            tickets5000: parseFloat(values['5000']) || 0,
          },
          create: {
            component,
            tickets1: parseFloat(values['1']) || 0,
            tickets10: parseFloat(values['10']) || 0,
            tickets100: parseFloat(values['100']) || 0,
            tickets1000: parseFloat(values['1000']) || 0,
            tickets5000: parseFloat(values['5000']) || 0,
          },
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating costs:', error);
    return NextResponse.json({ error: 'Failed to update costs' }, { status: 500 });
  }
}