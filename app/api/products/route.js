import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET all active products
export async function GET(request) {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { plans: true },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Create new product (Admin only)
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description, icon } = await request.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description required' }, { status: 400 });
    }

    // Get max order
    const maxOrder = await prisma.product.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const product = await prisma.product.create({
      data: {
        name,
        description,
        icon: icon || '📦',
        order: (maxOrder?.order || 0) + 1,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ 
      error: 'Failed to create product',
      message: error.message 
    }, { status: 500 });
  }
}