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

    console.log('Deleting component:', componentId);

    await prisma.component.delete({
      where: { id: parseInt(componentId) },
    });

    console.log('Component deleted successfully');

    return NextResponse.json({ success: true, message: 'Component deleted' });
  } catch (error) {
    console.error('Error deleting component:', error);
    return NextResponse.json({ 
      error: 'Failed to delete component', 
      message: error.message 
    }, { status: 500 });
  }
}