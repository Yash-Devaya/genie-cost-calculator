import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// DELETE - Delete component (Admin only)
export async function DELETE(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { componentId } = params;

    await prisma.component.delete({
      where: { id: parseInt(componentId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting component:', error);
    return NextResponse.json({ error: 'Failed to delete component' }, { status: 500 });
  }
}