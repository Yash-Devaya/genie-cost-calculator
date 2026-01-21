const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding regions and default cost multipliers...');

  // Delete existing data
  await prisma.regionMultiplier.deleteMany({});
  await prisma.costMultiplierProfile.deleteMany({});
  await prisma.region.deleteMany({});

  console.log('✓ Cleaned existing data');

  // Create regions in order
  const regions = [
    { name: 'India', order: 1 },
    { name: 'North America', order: 2 },
    { name: 'South America', order: 3 },
    { name: 'East Europe', order: 4 },
    { name: 'Central Europe', order: 5 },
    { name: 'West Europe', order: 6 },
    { name: 'Africa', order: 7 },
    { name: 'Middle East', order: 8 },
    { name: 'South Asia', order: 9 },
    { name: 'South East Asia', order: 10 },
    { name: 'Oceania', order: 11 },
  ];

  const createdRegions = [];
  for (const region of regions) {
    const created = await prisma.region.create({
      data: region,
    });
    createdRegions.push(created);
  }

  console.log('✓ Created', regions.length, 'regions');

  // Create default cost multiplier profile
  const defaultProfile = await prisma.costMultiplierProfile.create({
    data: {
      name: 'Default Multipliers',
      isDefault: true,
    },
  });

  console.log('✓ Created default multiplier profile');

  // Default multiplier values in same order as regions
  const defaultMultipliers = [1.0, 1.3, 2.2, 1.25, 1.30, 1.30, 1.7, 1.9, 1.1, 1.2, 1.6];

  // Create region multipliers
  for (let i = 0; i < createdRegions.length; i++) {
    await prisma.regionMultiplier.create({
      data: {
        profileId: defaultProfile.id,
        regionId: createdRegions[i].id,
        multiplier: defaultMultipliers[i],
      },
    });
  }

  console.log('✓ Created default multipliers for all regions');

  // Verify
  const regionCount = await prisma.region.count();
  const profileCount = await prisma.costMultiplierProfile.count();
  const multiplierCount = await prisma.regionMultiplier.count();

  console.log('\n✅ Seeding complete!');
  console.log('📊 Summary:');
  console.log(`   Regions: ${regionCount}`);
  console.log(`   Profiles: ${profileCount}`);
  console.log(`   Multipliers: ${multiplierCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });