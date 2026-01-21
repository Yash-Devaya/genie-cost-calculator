import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

// DELETE - Delete cost multiplier profile (Admin only)
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

    // Check if it's the default profile
    const profile = await prisma.costMultiplierProfile.findUnique({
      where: { id: parseInt(id) },
    });

    if (profile?.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default profile' }, { status: 403 });
    }

    await prisma.costMultiplierProfile.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cost multiplier:', error);
    return NextResponse.json({ error: 'Failed to delete cost multiplier' }, { status: 500 });
  }
}