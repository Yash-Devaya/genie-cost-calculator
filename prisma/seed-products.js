const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding products...');

  // Create Genie product
  const genieProduct = await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Genie',
      description: 'Azure Infrastructure Cost Calculator',
      icon: '🧞',
      isActive: true,
      order: 1,
    },
  });

  console.log('✓ Created Genie product');

  // Update existing plans to belong to Genie product
  const existingPlans = await prisma.plan.findMany();
  
  for (const plan of existingPlans) {
    await prisma.plan.update({
      where: { id: plan.id },
      data: { productId: genieProduct.id },
    });
  }

  console.log('✓ Linked existing plans to Genie product');
  console.log(`✅ Seeding complete! Product: ${genieProduct.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });