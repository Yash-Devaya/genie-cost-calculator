import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET - Generate sample Excel template
export async function GET(request) {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sample data matching your format
    const data = [
      ['Category', 'Component', 'Azure Service', 'Specifications', 'Scaling Rationale', '1 Ticket', '10 Tickets', '100 Tickets', '1000 Tickets', '5000 Tickets'],
      ['Infrastructure', 'Core Compute', 'Azure Container Apps / App Service', '4 vCPU, 16 GB RAM (Medium Workload)', 'Instances: 1 → 1 → 1 → 1 → 3\nFixed (no scaling) with high availability', 400, 315, 621, 1800, 5400],
      ['Infrastructure', 'Relational Database', 'Azure Database for PostgreSQL - Flexible Server', '4 vCores, 16 GB RAM, 256 GB Storage', 'Fixed (no scaling) with high availability', 3270, 3270, 3270, 3270, 3270],
      ['Infrastructure', 'NoSQL Database', 'Azure Cosmos DB (MongoDB API)', '1,000 RU/s, 25 GB Storage', 'Fixed (no scaling)', 600, 600, 600, 600, 600],
      ['Infrastructure', 'Message Queue', 'Azure Event Hubs & CloudAMQP', 'Event Hubs Standard, CloudAMQP\'s "Power Panda" plan', 'Fixed (no scaling)', 600, 600, 600, 600, 600],
      ['Infrastructure', 'Networking', 'Azure Data Transfer', '1 TB of monthly egress from core to edge', 'Incremental(KB-level data)\nFixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets', 0, 0, 60, 200, 200],
      ['Infrastructure', 'Edge Compute', 'Azure Virtual Machines', '2 VMs, D4ds v5 series (4 vCores, 16 GB RAM)', 'Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets', 1000, 924, 1848, 1848, 2800],
      ['Infrastructure', 'Monitoring & Security', 'Azure Monitor / Log Analytics / Security', 'Variable based on data volume', 'Log Volume: 1x → 1.05x → 1.15x → 1.30x → 1.50x', 2000, 1575, 1725, 1950, 3000],
      [],
      ['Deployment', 'Deployment', 'Deployment', 'One-time setup and configuration', 'Fixed', 15000, 15000, 15000, 15000, 15000],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Category
      { wch: 25 }, // Component
      { wch: 35 }, // Azure Service
      { wch: 40 }, // Specifications
      { wch: 45 }, // Scaling Rationale
      { wch: 12 }, // 1 Ticket
      { wch: 12 }, // 10 Tickets
      { wch: 12 }, // 100 Tickets
      { wch: 12 }, // 1000 Tickets
      { wch: 12 }, // 5000 Tickets
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Sample_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating sample template:', error);
    return NextResponse.json({ 
      error: 'Failed to generate sample template',
      message: error.message 
    }, { status: 500 });
  }
}