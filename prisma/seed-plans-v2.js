const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Plan 1 with categories...');

  // Delete existing data in correct order
  await prisma.component.deleteMany({});
  await prisma.customField.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.plan.deleteMany({});

  console.log('✓ Cleaned existing data');

  // Get or create Genie product
  let genieProduct = await prisma.product.findFirst({
    where: { name: 'Genie' }
  });

  if (!genieProduct) {
    genieProduct = await prisma.product.create({
      data: {
        name: 'Genie',
        description: 'Azure Infrastructure Cost Calculator',
        icon: '🧞',
        isActive: true,
        order: 1,
      }
    });
    console.log('✓ Created Genie product');
  } else {
    console.log('✓ Using existing Genie product');
  }

  // Create Plan 1 linked to Genie
  const plan1 = await prisma.plan.create({
    data: {
      productId: genieProduct.id,
      name: "Plan 1",
      description: "Complete Azure Infrastructure Setup",
      isActive: true,
      order: 1,
    }
  });

  console.log('✓ Created Plan 1');

  // Create Custom Fields for Plan 1
  const customField1 = await prisma.customField.create({
    data: {
      planId: plan1.id,
      name: 'Azure Service',
      order: 1,
    },
  });

  const customField2 = await prisma.customField.create({
    data: {
      planId: plan1.id,
      name: 'Specifications',
      order: 2,
    },
  });

  const customField3 = await prisma.customField.create({
    data: {
      planId: plan1.id,
      name: 'Scaling Rationale',
      order: 3,
    },
  });

  console.log('✓ Created Custom Fields');

  // Create Infrastructure Category
  const infrastructureCategory = await prisma.category.create({
    data: {
      planId: plan1.id,
      name: 'Infrastructure',
      order: 1,
      showTotal: true,
    },
  });

  console.log('✓ Created Infrastructure Category');

  // Create Infrastructure Components
  const infrastructureComponents = [
    {
      name: 'Core Compute',
      customFieldData: {
        'Azure Service': 'Azure Container Apps / App Service',
        'Specifications': '4 vCPU, 16 GB RAM (Medium Workload)',
        'Scaling Rationale': 'Instances: 1 → 1 → 1 → 1 → 3\nFixed (no scaling) with high availability',
      },
      tickets1: 400,
      tickets10: 315,
      tickets100: 621,
      tickets1000: 1800,
      tickets5000: 5400,
    },
    {
      name: 'Relational Database',
      customFieldData: {
        'Azure Service': 'Azure Database for PostgreSQL - Flexible Server',
        'Specifications': '4 vCores, 16 GB RAM, 256 GB Storage',
        'Scaling Rationale': 'Fixed (no scaling) with high availability',
      },
      tickets1: 3270,
      tickets10: 3270,
      tickets100: 3270,
      tickets1000: 3270,
      tickets5000: 3270,
    },
    {
      name: 'NoSQL Database',
      customFieldData: {
        'Azure Service': 'Azure Cosmos DB (MongoDB API)',
        'Specifications': '1,000 RU/s, 25 GB Storage',
        'Scaling Rationale': 'Fixed (no scaling)',
      },
      tickets1: 600,
      tickets10: 600,
      tickets100: 600,
      tickets1000: 600,
      tickets5000: 600,
    },
    {
      name: 'Message Queue',
      customFieldData: {
        'Azure Service': 'Azure Event Hubs & CloudAMQP',
        'Specifications': 'Event Hubs Standard, CloudAMQP\'s "Power Panda" plan',
        'Scaling Rationale': 'Fixed (no scaling)',
      },
      tickets1: 600,
      tickets10: 600,
      tickets100: 600,
      tickets1000: 600,
      tickets5000: 600,
    },
    {
      name: 'Networking',
      customFieldData: {
        'Azure Service': 'Azure Data Transfer',
        'Specifications': '1 TB of monthly egress from core to edge',
        'Scaling Rationale': 'Incremental(KB-level data)\nFixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      },
      tickets1: 0,
      tickets10: 0,
      tickets100: 60,
      tickets1000: 200,
      tickets5000: 200,
    },
    {
      name: 'Edge Compute',
      customFieldData: {
        'Azure Service': 'Azure Virtual Machines',
        'Specifications': '2 VMs, D4ds v5 series (4 vCores, 16 GB RAM)',
        'Scaling Rationale': 'Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      },
      tickets1: 1000,
      tickets10: 924,
      tickets100: 1848,
      tickets1000: 1848,
      tickets5000: 2800,
    },
    {
      name: 'Monitoring & Security',
      customFieldData: {
        'Azure Service': 'Azure Monitor / Log Analytics / Security',
        'Specifications': 'Variable based on data volume',
        'Scaling Rationale': 'Log Volume: 1x → 1.05x → 1.15x → 1.30x → 1.50x',
      },
      tickets1: 2000,
      tickets10: 1575,
      tickets100: 1725,
      tickets1000: 1950,
      tickets5000: 3000,
    },
  ];

  for (let i = 0; i < infrastructureComponents.length; i++) {
    await prisma.component.create({
      data: {
        categoryId: infrastructureCategory.id,
        name: infrastructureComponents[i].name,
        order: i + 1,
        tickets1: infrastructureComponents[i].tickets1,
        tickets10: infrastructureComponents[i].tickets10,
        tickets100: infrastructureComponents[i].tickets100,
        tickets1000: infrastructureComponents[i].tickets1000,
        tickets5000: infrastructureComponents[i].tickets5000,
        customFieldData: infrastructureComponents[i].customFieldData,
      },
    });
  }

  console.log('✓ Created Infrastructure Components');

  // Create Deployment Category
  const deploymentCategory = await prisma.category.create({
    data: {
      planId: plan1.id,
      name: 'Deployment',
      order: 2,
      showTotal: false,
    },
  });

  console.log('✓ Created Deployment Category');

  // Create Deployment Component
  await prisma.component.create({
    data: {
      categoryId: deploymentCategory.id,
      name: 'Deployment',
      order: 1,
      tickets1: 15000,
      tickets10: 15000,
      tickets100: 15000,
      tickets1000: 15000,
      tickets5000: 15000,
      customFieldData: {
        'Azure Service': 'Deployment',
        'Specifications': 'One-time setup and configuration',
        'Scaling Rationale': 'Fixed',
      },
    },
  });

  console.log('✓ Created Deployment Component');

  // Summary
  const planCount = await prisma.plan.count();
  const categoryCount = await prisma.category.count();
  const componentCount = await prisma.component.count();
  const customFieldCount = await prisma.customField.count();

  console.log('\n✅ Seeding complete!');
  console.log('📊 Summary:');
  console.log(`   Plans: ${planCount}`);
  console.log(`   Categories: ${categoryCount}`);
  console.log(`   Components: ${componentCount}`);
  console.log(`   Custom Fields: ${customFieldCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });