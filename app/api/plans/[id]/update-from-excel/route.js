import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// POST - Update existing plan from Excel
export async function POST(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read Excel file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 3) {
      return NextResponse.json({ error: 'Invalid Excel format' }, { status: 400 });
    }

    // Parse headers
    const headers = data[0];
    const planIdIndex = headers.findIndex(h => h === 'PLAN_ID');
    const planNameIndex = headers.findIndex(h => h === 'PLAN_NAME');
    const categoryIndex = headers.findIndex(h => h === 'Category');
    const componentIndex = headers.findIndex(h => h === 'Component');

    // Find ticket column indices
    const ticket1Index = headers.findIndex(h => h === '1 Ticket');
    const ticket10Index = headers.findIndex(h => h === '10 Tickets');
    const ticket100Index = headers.findIndex(h => h === '100 Tickets');
    const ticket1000Index = headers.findIndex(h => h === '1000 Tickets');
    const ticket5000Index = headers.findIndex(h => h === '5000 Tickets');

    // Find custom field columns
    const customFieldStartIndex = componentIndex + 1;
    const customFieldHeaders = headers.slice(customFieldStartIndex, ticket1Index);

    console.log('Custom field headers:', customFieldHeaders);

    // Get plan ID from Excel
    const excelPlanId = data[1][planIdIndex];
    
    if (parseInt(excelPlanId) !== parseInt(id)) {
      return NextResponse.json({ 
        error: `Plan ID mismatch. Excel has ID ${excelPlanId} but you're updating plan ${id}` 
      }, { status: 400 });
    }

    // Get new plan name
    const newPlanName = data[1][planNameIndex];

    // Get existing plan
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
      include: {
        customFields: {
          orderBy: { order: 'asc' },
        },
        categories: {
          include: {
            components: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Update plan name if changed
    if (newPlanName && newPlanName !== plan.name) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { name: newPlanName },
      });
    }

    // Parse components from Excel
    const excelComponents = [];
    const excelCategories = new Set();

    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows, instruction rows
      if (!row || !row[componentIndex] || row[componentIndex].includes('INSTRUCTIONS')) {
        continue;
      }

      const categoryName = row[categoryIndex];
      const componentName = row[componentIndex];

      if (!categoryName || !componentName) continue;

      excelCategories.add(categoryName);

      // Parse custom fields
      const customFieldData = {};
      customFieldHeaders.forEach((fieldName, idx) => {
        const value = row[customFieldStartIndex + idx];
        if (value !== undefined && value !== null && value !== '') {
          customFieldData[fieldName] = value.toString();
        }
      });

      // Parse tickets
      const tickets1 = parseFloat(row[ticket1Index]) || 0;
      const tickets10 = parseFloat(row[ticket10Index]) || 0;
      const tickets100 = parseFloat(row[ticket100Index]) || 0;
      const tickets1000 = parseFloat(row[ticket1000Index]) || 0;
      const tickets5000 = parseFloat(row[ticket5000Index]) || 0;

      excelComponents.push({
        categoryName,
        name: componentName,
        customFieldData,
        tickets1,
        tickets10,
        tickets100,
        tickets1000,
        tickets5000,
      });
    }

    console.log('Excel components:', excelComponents.length);
    console.log('Excel categories:', Array.from(excelCategories));

    // Delete all existing components
    await prisma.component.deleteMany({
      where: {
        categoryId: {
          in: plan.categories.map(c => c.id),
        },
      },
    });

    // Map existing categories or create new ones
    const categoryMap = {};
    for (const cat of plan.categories) {
      categoryMap[cat.name] = cat;
    }

    // Create new categories if needed
    for (const catName of excelCategories) {
      if (!categoryMap[catName]) {
        const maxOrder = await prisma.category.findFirst({
          where: { planId: plan.id },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        const newCat = await prisma.category.create({
          data: {
            planId: plan.id,
            name: catName,
            order: (maxOrder?.order || 0) + 1,
            showTotal: true,
          },
        });
        categoryMap[catName] = newCat;
      }
    }

    // Create all components from Excel
    let createdCount = 0;
    for (const comp of excelComponents) {
      const category = categoryMap[comp.categoryName];
      
      if (!category) {
        console.warn(`Category not found: ${comp.categoryName}`);
        continue;
      }

      await prisma.component.create({
        data: {
          categoryId: category.id,
          name: comp.name,
          order: createdCount + 1,
          tickets1: comp.tickets1,
          tickets10: comp.tickets10,
          tickets100: comp.tickets100,
          tickets1000: comp.tickets1000,
          tickets5000: comp.tickets5000,
          customFieldData: comp.customFieldData,
        },
      });
      createdCount++;
    }

    // Delete empty categories
    for (const cat of plan.categories) {
      const componentCount = await prisma.component.count({
        where: { categoryId: cat.id },
      });
      
      if (componentCount === 0 && !Array.from(excelCategories).includes(cat.name)) {
        await prisma.category.delete({
          where: { id: cat.id },
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Plan updated successfully from Excel',
      planId: plan.id,
      planName: newPlanName || plan.name,
      stats: {
        categories: excelCategories.size,
        components: createdCount,
      },
    });

  } catch (error) {
    console.error('Error updating from Excel:', error);
    return NextResponse.json({ 
      error: 'Failed to update plan from Excel',
      message: error.message 
    }, { status: 500 });
  }
}