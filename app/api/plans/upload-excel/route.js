import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// POST - Upload Excel and convert to plan structure
export async function POST(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get form data - ONLY ONCE at the beginning
    const formData = await request.formData();
    const file = formData.get('file');
    const planName = formData.get('planName');
    const planDescription = formData.get('planDescription');
    const productId = formData.get('productId');

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!planName || !planDescription || !productId) {
      return NextResponse.json({ 
        error: 'Plan name, description, and product are required' 
      }, { status: 400 });
    }

    // Read Excel file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return NextResponse.json({ error: 'Excel file is empty or invalid' }, { status: 400 });
    }

    console.log('Excel data rows:', data.length);
    console.log('Headers:', data[0]);

    // Parse the Excel structure
    const headers = data[0];
    
    // Find key column indices
    const findColumnIndex = (possibleNames) => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => 
          h && h.toString().toLowerCase().trim() === name.toLowerCase()
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const categoryIndex = findColumnIndex(['category', 'category_name', 'categoryname']);
    const componentIndex = findColumnIndex(['component', 'component_name', 'componentname', 'name']);
    
    // Find ticket columns
    const ticket1Index = findColumnIndex(['1 ticket', '1ticket', 'tickets1', '1']);
    const ticket10Index = findColumnIndex(['10 tickets', '10tickets', 'tickets10', '10']);
    const ticket100Index = findColumnIndex(['100 tickets', '100tickets', 'tickets100', '100']);
    const ticket1000Index = findColumnIndex(['1000 tickets', '1000tickets', 'tickets1000', '1000']);
    const ticket5000Index = findColumnIndex(['5000 tickets', '5000tickets', 'tickets5000', '5000']);

    console.log('Column indices:', {
      category: categoryIndex,
      component: componentIndex,
      ticket1: ticket1Index,
      ticket10: ticket10Index,
      ticket100: ticket100Index,
      ticket1000: ticket1000Index,
      ticket5000: ticket5000Index,
    });

    if (componentIndex === -1) {
      return NextResponse.json({ 
        error: 'Component column not found. Excel must have a column named "Component" or "Component Name"' 
      }, { status: 400 });
    }

    if (ticket1Index === -1) {
      return NextResponse.json({ 
        error: 'Ticket columns not found. Excel must have columns like "1 Ticket", "10 Tickets", etc.' 
      }, { status: 400 });
    }

    // Find custom field columns (everything between component and tickets)
    const customFieldColumns = [];
    const startCol = componentIndex + 1;
    const endCol = ticket1Index;
    
    for (let i = startCol; i < endCol; i++) {
      if (headers[i] && headers[i].toString().trim()) {
        customFieldColumns.push({
          index: i,
          name: headers[i].toString().trim(),
        });
      }
    }

    console.log('Custom fields found:', customFieldColumns.map(c => c.name));

    // Get max order for this product
    const maxOrder = await prisma.plan.findFirst({
      where: { productId: parseInt(productId) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    // Create the plan with productId
    const plan = await prisma.plan.create({
      data: {
        productId: parseInt(productId),
        name: planName,
        description: planDescription,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    console.log('Plan created:', plan.id);

    // Create custom fields
    const customFieldMap = {};
    for (let i = 0; i < customFieldColumns.length; i++) {
      const field = await prisma.customField.create({
        data: {
          planId: plan.id,
          name: customFieldColumns[i].name,
          order: i + 1,
        },
      });
      customFieldMap[customFieldColumns[i].name] = field;
    }

    console.log('Custom fields created:', Object.keys(customFieldMap).length);

    // Parse categories and components
    const categories = new Map();
    const components = [];
    let currentCategory = null;
    let componentOrder = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (!row || row.length === 0) continue;

      // Check if this is a category row (has category but no component values)
      const categoryValue = categoryIndex !== -1 ? row[categoryIndex] : null;
      const componentValue = row[componentIndex];
      
      // Skip empty rows
      if (!categoryValue && !componentValue) continue;

      // If there's a category value, it might be a category header or a component with category
      if (categoryValue && categoryValue.toString().trim()) {
        const catName = categoryValue.toString().trim();
        
        // Check if this row has component data
        const hasComponentData = componentValue && componentValue.toString().trim();
        
        if (!hasComponentData) {
          // This is a category header row
          if (!categories.has(catName)) {
            currentCategory = catName;
            categories.set(catName, {
              name: catName,
              order: categories.size + 1,
              showTotal: true,
              components: [],
            });
          }
          continue;
        } else {
          // This row has both category and component data
          if (!categories.has(catName)) {
            currentCategory = catName;
            categories.set(catName, {
              name: catName,
              order: categories.size + 1,
              showTotal: true,
              components: [],
            });
          } else {
            currentCategory = catName;
          }
        }
      }

      // Parse component data
      if (!componentValue || !componentValue.toString().trim()) continue;

      // If no category was found, create a default one
      if (!currentCategory) {
        currentCategory = 'Default Category';
        if (!categories.has(currentCategory)) {
          categories.set(currentCategory, {
            name: currentCategory,
            order: 1,
            showTotal: true,
            components: [],
          });
        }
      }

      const componentName = componentValue.toString().trim();

      // Parse custom field data
      const customFieldData = {};
      customFieldColumns.forEach(col => {
        const value = row[col.index];
        if (value !== undefined && value !== null && value !== '') {
          customFieldData[col.name] = value.toString().trim();
        }
      });

      // Parse ticket values
      const tickets1 = parseFloat(row[ticket1Index]) || 0;
      const tickets10 = ticket10Index !== -1 ? (parseFloat(row[ticket10Index]) || 0) : tickets1;
      const tickets100 = ticket100Index !== -1 ? (parseFloat(row[ticket100Index]) || 0) : tickets1;
      const tickets1000 = ticket1000Index !== -1 ? (parseFloat(row[ticket1000Index]) || 0) : tickets1;
      const tickets5000 = ticket5000Index !== -1 ? (parseFloat(row[ticket5000Index]) || 0) : tickets1;

      componentOrder++;
      
      components.push({
        categoryName: currentCategory,
        name: componentName,
        order: componentOrder,
        tickets1,
        tickets10,
        tickets100,
        tickets1000,
        tickets5000,
        customFieldData,
      });
    }

    console.log('Categories found:', categories.size);
    console.log('Components found:', components.length);

    // Create categories in database
    const categoryDbMap = {};
    for (const [catName, catData] of categories.entries()) {
      const category = await prisma.category.create({
        data: {
          planId: plan.id,
          name: catData.name,
          order: catData.order,
          showTotal: catData.showTotal,
        },
      });
      categoryDbMap[catName] = category;
    }

    // Create components in database
    let createdComponents = 0;
    for (const comp of components) {
      const category = categoryDbMap[comp.categoryName];
      if (!category) {
        console.warn(`Category not found for component: ${comp.name}`);
        continue;
      }

      await prisma.component.create({
        data: {
          categoryId: category.id,
          name: comp.name,
          order: comp.order,
          tickets1: comp.tickets1,
          tickets10: comp.tickets10,
          tickets100: comp.tickets100,
          tickets1000: comp.tickets1000,
          tickets5000: comp.tickets5000,
          customFieldData: comp.customFieldData,
        },
      });
      createdComponents++;
    }

    console.log('Components created in DB:', createdComponents);

    return NextResponse.json({ 
      success: true,
      message: 'Excel uploaded and plan created successfully',
      planId: plan.id,
      planName: plan.name,
      stats: {
        categories: categories.size,
        components: createdComponents,
        customFields: customFieldColumns.length,
      },
    });

  } catch (error) {
    console.error('Error uploading Excel:', error);
    return NextResponse.json({ 
      error: 'Failed to upload Excel file',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}