import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// GET specific product
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        plans: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PATCH - Update product (Admin only)
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
    const { name, description, icon } = await request.json();

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        icon,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Delete product (Admin only) with cascade
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

    // Get all plans for this product
    const plans = await prisma.plan.findMany({
      where: { productId: parseInt(id) },
      include: {
        categories: {
          include: {
            components: true,
          },
        },
        customFields: true,
      },
    });

    // Delete all related data for each plan
    for (const plan of plans) {
      // Delete components
      for (const category of plan.categories) {
        await prisma.component.deleteMany({
          where: { categoryId: category.id },
        });
      }

      // Delete categories
      await prisma.category.deleteMany({
        where: { planId: plan.id },
      });

      // Delete custom fields
      await prisma.customField.deleteMany({
        where: { planId: plan.id },
      });
    }

    // Delete all plans for this product
    await prisma.plan.deleteMany({
      where: { productId: parseInt(id) },
    });

    // Finally delete the product
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ 
      success: true,
      message: `Product and ${plans.length} plan(s) deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ 
      error: 'Failed to delete product',
      message: error.message 
    }, { status: 500 });
  }
}