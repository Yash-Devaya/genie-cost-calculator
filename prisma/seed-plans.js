const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default plan...');

  // Create Plan 1
  const plan1 = await prisma.plan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Plan 1',
      description: 'Complete Azure Infrastructure Setup',
      isActive: true,
      order: 1,
    },
  });

  console.log('✓ Created Plan 1');

  // Create components for Plan 1
  const components = [
    {
      planId: plan1.id,
      name: 'Core Compute',
      service: 'Azure Container Apps / App Service',
      specifications: '4 vCPU, 16 GB RAM (Medium Workload)',
      scalingRationale: 'Instances: 1 → 1 → 1 → 1 → 3\nFixed (no scaling) with high availability',
      order: 1,
      tickets1: 400,
      tickets10: 315,
      tickets100: 621,
      tickets1000: 1800,
      tickets5000: 5400,
    },
    {
      planId: plan1.id,
      name: 'Relational Database',
      service: 'Azure Database for PostgreSQL - Flexible Server',
      specifications: '4 vCores, 16 GB RAM, 256 GB Storage',
      scalingRationale: 'Fixed (no scaling) with high availability',
      order: 2,
      tickets1: 3270,
      tickets10: 3270,
      tickets100: 3270,
      tickets1000: 3270,
      tickets5000: 3270,
    },
    {
      planId: plan1.id,
      name: 'NoSQL Database',
      service: 'Azure Cosmos DB (MongoDB API)',
      specifications: '1,000 RU/s, 25 GB Storage',
      scalingRationale: 'Fixed (no scaling)',
      order: 3,
      tickets1: 600,
      tickets10: 600,
      tickets100: 600,
      tickets1000: 600,
      tickets5000: 600,
    },
    {
      planId: plan1.id,
      name: 'Message Queue',
      service: 'Azure Event Hubs & CloudAMQP',
      specifications: 'Event Hubs Standard, CloudAMQP\'s "Power Panda" plan',
      scalingRationale: 'Fixed (no scaling)',
      order: 4,
      tickets1: 600,
      tickets10: 600,
      tickets100: 600,
      tickets1000: 600,
      tickets5000: 600,
    },
    {
      planId: plan1.id,
      name: 'Networking',
      service: 'Azure Data Transfer',
      specifications: '1 TB of monthly egress from core to edge',
      scalingRationale: 'Incremental(KB-level data)\nFixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      order: 5,
      tickets1: 0,
      tickets10: 0,
      tickets100: 60,
      tickets1000: 200,
      tickets5000: 200,
    },
    {
      planId: plan1.id,
      name: 'Edge Compute',
      service: 'Azure Virtual Machines',
      specifications: '2 VMs, D4ds v5 series (4 vCores, 16 GB RAM)',
      scalingRationale: 'Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      order: 6,
      tickets1: 1000,
      tickets10: 924,
      tickets100: 1848,
      tickets1000: 1848,
      tickets5000: 2800,
    },
    {
      planId: plan1.id,
      name: 'Monitoring & Security',
      service: 'Azure Monitor / Log Analytics / Security',
      specifications: 'Variable based on data volume',
      scalingRationale: 'Log Volume: 1x → 1.05x → 1.15x → 1.30x → 1.50x',
      order: 7,
      tickets1: 2000,
      tickets10: 1575,
      tickets100: 1725,
      tickets1000: 1950,
      tickets5000: 3000,
    },
    {
      planId: plan1.id,
      name: 'Deployment',
      service: 'Deployment',
      specifications: 'One-time setup and configuration',
      scalingRationale: 'Fixed',
      order: 8,
      isDeployment: true,
      tickets1: 15000,
      tickets10: 15000,
      tickets100: 15000,
      tickets1000: 15000,
      tickets5000: 15000,
    },
  ];

  for (const comp of components) {
    await prisma.component.upsert({
      where: {
        id: comp.order, // Using order as temporary unique identifier
      },
      update: comp,
      create: comp,
    });
  }

  console.log('✓ Created components for Plan 1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });