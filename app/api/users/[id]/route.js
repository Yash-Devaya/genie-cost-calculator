// FILE 4: app/api/users/[id]/route.js (NEW - Delete user)
// ============================================
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

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

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super admin
    if (targetUser.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete super admin' },
        { status: 403 }
      );
    }

    // Prevent user from deleting themselves
    if (parseInt(token.id) === parseInt(id)) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 403 }
      );
    }

    // Delete user (cascade will delete sessions)
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
