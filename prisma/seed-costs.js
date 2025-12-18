const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default costs...');

  const components = [
    { component: 'coreCompute', tickets1: 400, tickets10: 315, tickets100: 621, tickets1000: 1800, tickets5000: 5400 },
    { component: 'relationalDb', tickets1: 3270, tickets10: 3270, tickets100: 3270, tickets1000: 3270, tickets5000: 3270 },
    { component: 'nosqlDb', tickets1: 600, tickets10: 600, tickets100: 600, tickets1000: 600, tickets5000: 600 },
    { component: 'messageQueue', tickets1: 600, tickets10: 600, tickets100: 600, tickets1000: 600, tickets5000: 600 },
    { component: 'networking', tickets1: 0, tickets10: 0, tickets100: 60, tickets1000: 200, tickets5000: 200 },
    { component: 'edgeCompute', tickets1: 1000, tickets10: 924, tickets100: 1848, tickets1000: 1848, tickets5000: 2800 },
    { component: 'monitoring', tickets1: 2000, tickets10: 1575, tickets100: 1725, tickets1000: 1950, tickets5000: 3000 },
    { component: 'deployment', tickets1: 15000, tickets10: 15000, tickets100: 15000, tickets1000: 15000, tickets5000: 15000 },
  ];

  for (const cost of components) {
    await prisma.componentCost.upsert({
      where: { component: cost.component },
      update: cost,
      create: cost,
    });
  }

  console.log('✓ Seeded component costs');

  // Seed default settings
  await prisma.appSettings.upsert({
    where: { key: 'excelUrl' },
    update: { value: 'https://microland-my.sharepoint.com/:x:/r/personal/yash_devaya_microland_com/Documents/Book.xlsx?d=wb1ced5f392b24e008283fc05f7f9ca0e&csf=1&web=1&e=IqFWtW' },
    create: { key: 'excelUrl', value: 'https://microland-my.sharepoint.com/:x:/r/personal/yash_devaya_microland_com/Documents/Book.xlsx?d=wb1ced5f392b24e008283fc05f7f9ca0e&csf=1&web=1&e=IqFWtW' },
  });

  console.log('✓ Seeded app settings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });