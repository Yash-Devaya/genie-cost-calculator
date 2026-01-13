// ============================================
// FILE 7: prisma/seed-users.js (UPDATE - Add Super Admin)
// ============================================
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Create super admin user
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password: adminPassword,
      role: 'ADMIN',
      email: 'superadmin@genie.com',
      isSuperAdmin: true, // THIS IS THE SUPER ADMIN
    },
  });

  console.log('✓ Created super admin user:', superAdmin.username);

  // Create regular admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      email: 'admin@genie.com',
      isSuperAdmin: false,
    },
  });

  console.log('✓ Created admin user:', admin.username);

  // Create regular user
  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: userPassword,
      role: 'USER',
      email: 'user@genie.com',
      isSuperAdmin: false,
    },
  });

  console.log('✓ Created regular user:', user.username);

  console.log('\nDefault credentials:');
  console.log('Super Admin - username: superadmin, password: admin123');
  console.log('Admin       - username: admin, password: admin123');
  console.log('User        - username: user, password: user123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
