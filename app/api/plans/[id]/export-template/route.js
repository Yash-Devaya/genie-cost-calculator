import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// GET - Generate Excel template for a plan (Single Sheet)
export async function GET(request, { params }) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Fetch plan with all data
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            components: {
              orderBy: { order: 'asc' },
            },
          },
        },
        customFields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Create workbook with single sheet
    const workbook = XLSX.utils.book_new();

    // Build headers
    const headers = [
      'PLAN_ID',
      'PLAN_NAME',
      'CATEGORY_ID',
      'CATEGORY_NAME',
      'COMPONENT_ID',
      'COMPONENT_NAME',
    ];

    // Add custom field headers
    plan.customFields.forEach(field => {
      headers.push(field.name);
    });

    // Add ticket headers
    headers.push('1 Ticket', '10 Tickets', '100 Tickets', '1000 Tickets', '5000 Tickets');

    // Build data rows
    const rows = [headers];

    // Add metadata row
    rows.push([
      plan.id,
      plan.name,
      '',
      '',
      '',
      '⚠️ DO NOT MODIFY PLAN_ID, CATEGORY_ID, COMPONENT_ID for existing data',
      ...Array(plan.customFields.length + 5).fill(''),
    ]);

    rows.push([]); // Empty row

    // Add components grouped by category
    plan.categories.forEach(category => {
      category.components.forEach(comp => {
        const row = [
          plan.id,
          plan.name,
          category.id,
          category.name,
          comp.id,
          comp.name,
        ];

        // Add custom field values
        const customData = typeof comp.customFieldData === 'string' 
          ? JSON.parse(comp.customFieldData) 
          : comp.customFieldData || {};

        plan.customFields.forEach(field => {
          row.push(customData[field.name] || '');
        });

        // Add ticket values
        row.push(
          comp.tickets1,
          comp.tickets10,
          comp.tickets100,
          comp.tickets1000,
          comp.tickets5000
        );

        rows.push(row);
      });

      // Add empty row between categories
      rows.push([]);
    });

    // Add instructions at the bottom
    rows.push([]);
    rows.push(['INSTRUCTIONS:']);
    rows.push(['• Keep PLAN_ID, CATEGORY_ID, COMPONENT_ID unchanged for existing rows']);
    rows.push(['• To add new component: Copy a row, leave COMPONENT_ID empty, fill other fields']);
    rows.push(['• To delete component: Delete the entire row']);
    rows.push(['• To edit values: Modify cells directly']);
    rows.push(['• Save as .xlsx and upload to update the plan']);

    // Create sheet
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    const colWidths = [
      { wch: 10 },  // PLAN_ID
      { wch: 25 },  // PLAN_NAME
      { wch: 12 },  // CATEGORY_ID
      { wch: 20 },  // CATEGORY_NAME
      { wch: 15 },  // COMPONENT_ID
      { wch: 25 },  // COMPONENT_NAME
    ];

    // Add widths for custom fields
    plan.customFields.forEach(() => {
      colWidths.push({ wch: 30 });
    });

    // Add widths for ticket columns
    colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 });

    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, plan.name);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${plan.name.replace(/[^a-z0-9]/gi, '_')}_Data.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ 
      error: 'Failed to generate template',
      message: error.message 
    }, { status: 500 });
  }
}