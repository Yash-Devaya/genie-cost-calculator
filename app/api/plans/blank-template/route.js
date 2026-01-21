import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

// GET - Generate blank Excel template (Single Sheet)
export async function GET(request) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sample data
    const headers = [
      'PLAN_ID',
      'PLAN_NAME',
      'CATEGORY_ID',
      'CATEGORY_NAME',
      'COMPONENT_ID',
      'COMPONENT_NAME',
      'Azure Service',
      'Specifications',
      'Scaling Rationale',
      '1 Ticket',
      '10 Tickets',
      '100 Tickets',
      '1000 Tickets',
      '5000 Tickets',
    ];

    const rows = [
      headers,
      ['', 'New Plan Name', '', '', '', '⚠️ Leave IDs empty for new plan/components'],
      [],
      ['', 'New Plan Name', '1', 'Infrastructure', '', 'Core Compute', 'Azure Container Apps', '4 vCPU, 16 GB RAM', 'Fixed with HA', 400, 315, 621, 1800, 5400],
      ['', 'New Plan Name', '1', 'Infrastructure', '', 'Database', 'Azure PostgreSQL', '4 vCores, 16 GB', 'Fixed with HA', 3270, 3270, 3270, 3270, 3270],
      [],
      ['', 'New Plan Name', '2', 'Deployment', '', 'Deployment', 'Initial Setup', 'One-time', 'Fixed', 15000, 15000, 15000, 15000, 15000],
      [],
      [],
      ['INSTRUCTIONS:'],
      ['• Fill PLAN_NAME (same for all rows)'],
      ['• Leave PLAN_ID empty (system generates it)'],
      ['• Use CATEGORY_ID 1, 2, 3... and CATEGORY_NAME to organize components'],
      ['• Leave COMPONENT_ID empty for new components'],
      ['• Fill all ticket columns with numbers'],
      ['• Save and upload to create the plan'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 25 },
      { wch: 30 }, { wch: 30 }, { wch: 30 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Blank_Plan_Template.xlsx"`,
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







