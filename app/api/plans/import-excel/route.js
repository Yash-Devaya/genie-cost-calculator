import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// POST - Import Excel file to update plan (Single Sheet)
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
    const planIdIndex = headers.indexOf('PLAN_ID');
    const planNameIndex = headers.indexOf('PLAN_NAME');
    const categoryIdIndex = headers.indexOf('CATEGORY_ID');
    const categoryNameIndex = headers.indexOf('CATEGORY_NAME');
    const componentIdIndex = headers.indexOf('COMPONENT_ID');
    const componentNameIndex = headers.indexOf('COMPONENT_NAME');

    // Find custom field columns (between component name and tickets)
    const customFieldStartIndex = componentNameIndex + 1;
    const ticket1Index = headers.indexOf('1 Ticket');
    const customFieldHeaders = headers.slice(customFieldStartIndex, ticket1Index);

    // Get plan info from first data row (row 1)
    const planId = data[1][planIdIndex];
    const planName = data[1][planNameIndex];

    if (!planId) {
      return NextResponse.json({ error: 'PLAN_ID not found in Excel' }, { status: 400 });
    }

    // Get plan and custom fields
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(planId) },
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
    if (planName && planName !== plan.name) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { name: planName },
      });
    }

    // Parse components from Excel (skip header, metadata, and empty rows)
    const excelComponents = [];
    const excelCategories = new Set();

    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows and instruction rows
      if (!row || !row[componentNameIndex] || row[componentNameIndex].includes('INSTRUCTIONS')) {
        continue;
      }

      const categoryId = row[categoryIdIndex] ? parseInt(row[categoryIdIndex]) : null;
      const categoryName = row[categoryNameIndex];
      const componentId = row[componentIdIndex] ? parseInt(row[componentIdIndex]) : null;
      const componentName = row[componentNameIndex];

      // Collect category names
      if (categoryName) {
        excelCategories.add(JSON.stringify({ id: categoryId, name: categoryName }));
      }

      // Parse custom fields
      const customFieldData = {};
      customFieldHeaders.forEach((fieldName, idx) => {
        const value = row[customFieldStartIndex + idx];
        if (value) {
          customFieldData[fieldName] = value;
        }
      });

      // Parse tickets
      const tickets1 = parseFloat(row[ticket1Index]) || 0;
      const tickets10 = parseFloat(row[ticket1Index + 1]) || 0;
      const tickets100 = parseFloat(row[ticket1Index + 2]) || 0;
      const tickets1000 = parseFloat(row[ticket1Index + 3]) || 0;
      const tickets5000 = parseFloat(row[ticket1Index + 4]) || 0;

      excelComponents.push({
        id: componentId,
        categoryId: categoryId,
        categoryName: categoryName,
        name: componentName,
        customFieldData: customFieldData,
        tickets1,
        tickets10,
        tickets100,
        tickets1000,
        tickets5000,
      });
    }

    // Get existing component IDs
    const existingComponentIds = plan.categories.flatMap(cat => 
      cat.components.map(comp => comp.id)
    );

    // Get component IDs from Excel
    const excelComponentIds = excelComponents
      .filter(comp => comp.id)
      .map(comp => comp.id);

    // Delete components not in Excel
    const componentsToDelete = existingComponentIds.filter(id => 
      !excelComponentIds.includes(id)
    );

    for (const compId of componentsToDelete) {
      await prisma.component.delete({
        where: { id: compId },
      });
    }

    // Map category names to IDs (for new components with category names)
    const categoryMap = {};
    plan.categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Update/Create components
    for (const comp of excelComponents) {
      // Determine category ID
      let categoryId = comp.categoryId;
      if (!categoryId && comp.categoryName) {
        categoryId = categoryMap[comp.categoryName];
      }

      if (!categoryId) {
        console.warn(`Skipping component ${comp.name} - no valid category`);
        continue;
      }

      if (comp.id) {
        // Update existing component
        await prisma.component.update({
          where: { id: comp.id },
          data: {
            categoryId: categoryId,
            name: comp.name,
            tickets1: comp.tickets1,
            tickets10: comp.tickets10,
            tickets100: comp.tickets100,
            tickets1000: comp.tickets1000,
            tickets5000: comp.tickets5000,
            customFieldData: comp.customFieldData,
          },
        });
      } else {
        // Create new component
        const maxOrder = await prisma.component.findFirst({
          where: { categoryId: categoryId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        await prisma.component.create({
          data: {
            categoryId: categoryId,
            name: comp.name,
            order: (maxOrder?.order || 0) + 1,
            tickets1: comp.tickets1,
            tickets10: comp.tickets10,
            tickets100: comp.tickets100,
            tickets1000: comp.tickets1000,
            tickets5000: comp.tickets5000,
            customFieldData: comp.customFieldData,
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Plan updated successfully',
      planId: plan.id,
      planName: plan.name,
      componentsUpdated: excelComponents.length,
      componentsDeleted: componentsToDelete.length,
    });

  } catch (error) {
    console.error('Error importing Excel:', error);
    return NextResponse.json({ 
      error: 'Failed to import Excel file',
      message: error.message 
    }, { status: 500 });
  }
}