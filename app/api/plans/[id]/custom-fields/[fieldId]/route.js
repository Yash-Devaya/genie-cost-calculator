import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// DELETE - Delete custom field (Admin only)
export async function DELETE(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { fieldId } = params;

    console.log('Deleting custom field:', fieldId);

    await prisma.customField.delete({
      where: { id: parseInt(fieldId) },
    });

    console.log('Custom field deleted successfully');

    return NextResponse.json({ success: true, message: 'Custom field deleted' });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ 
      error: 'Failed to delete custom field', 
      message: error.message 
    }, { status: 500 });
  }
}