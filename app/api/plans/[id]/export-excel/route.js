import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// GET - Export plan to Excel for editing
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

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Build headers
    const headers = ['PLAN_ID', 'PLAN_NAME', 'Category'];

    // Add Component header
    headers.push('Component');

    // Add custom field headers
    plan.customFields.forEach(field => {
      headers.push(field.name);
    });

    // Add ticket headers
    headers.push('1 Ticket', '10 Tickets', '100 Tickets', '1000 Tickets', '5000 Tickets');

    // Build data rows
    const rows = [headers];

    // Add info row
    rows.push([
      plan.id,
      plan.name,
      '⚠️ DO NOT MODIFY PLAN_ID',
      'You can edit Plan Name, all other data',
      ...Array(plan.customFields.length + 5).fill(''),
    ]);

    rows.push([]); // Empty row

    // Add components grouped by category
    plan.categories.forEach(category => {
      category.components.forEach(comp => {
        const row = [
          plan.id,
          plan.name,
          category.name,
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

      // Add empty row between categories for readability
      rows.push([]);
    });

    // Add instructions
    rows.push([]);
    rows.push(['INSTRUCTIONS FOR EDITING:']);
    rows.push(['• Keep PLAN_ID unchanged (this identifies which plan to update)']);
    rows.push(['• You can change PLAN_NAME to rename the plan']);
    rows.push(['• Add new rows to add components (they will be added to the category you specify)']);
    rows.push(['• Delete rows to remove components']);
    rows.push(['• Edit any values in the table']);
    rows.push(['• Save and upload back to update this plan']);

    // Create sheet
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    const colWidths = [
      { wch: 10 },  // PLAN_ID
      { wch: 25 },  // PLAN_NAME
      { wch: 20 },  // Category
      { wch: 25 },  // Component
    ];

    // Add widths for custom fields
    plan.customFields.forEach(() => {
      colWidths.push({ wch: 35 });
    });

    // Add widths for ticket columns
    colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 });

    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, plan.name.substring(0, 31)); // Excel sheet name limit

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${plan.name.replace(/[^a-z0-9]/gi, '_')}_Edit.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting plan:', error);
    return NextResponse.json({ 
      error: 'Failed to export plan',
      message: error.message 
    }, { status: 500 });
  }
}