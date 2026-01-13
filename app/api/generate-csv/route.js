import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickets = searchParams.get('tickets');

    if (!tickets) {
      return NextResponse.json({ error: 'Tickets parameter required' }, { status: 400 });
    }

    // Fetch costs from database
    const costs = await prisma.componentCost.findMany();
    
    const costsData = {};
    costs.forEach(cost => {
      costsData[cost.component] = {
        '1': cost.tickets1,
        '10': cost.tickets10,
        '100': cost.tickets100,
        '1000': cost.tickets1000,
        '5000': cost.tickets5000,
      };
    });

    // Component definitions
    const components = [
      {
        component: 'Core Compute',
        service: 'Azure Container Apps / App Service',
        specs: '4 vCPU, 16 GB RAM (Medium Workload)',
        cost: costsData.coreCompute?.[tickets] || 0,
        scaling: 'Instances: 1 → 1 → 1 → 1 → 3 Fixed (no scaling) with high availability',
      },
      {
        component: 'Relational Database',
        service: 'Azure Database for PostgreSQL - Flexible Server',
        specs: '4 vCores, 16 GB RAM, 256 GB Storage',
        cost: costsData.relationalDb?.[tickets] || 0,
        scaling: 'Fixed (no scaling) with high availability',
      },
      {
        component: 'NoSQL Database',
        service: 'Azure Cosmos DB (MongoDB API)',
        specs: '1,000 RU/s, 25 GB Storage',
        cost: costsData.nosqlDb?.[tickets] || 0,
        scaling: 'Fixed (no scaling)',
      },
      {
        component: 'Message Queue',
        service: 'Azure Event Hubs & CloudAMQP',
        specs: 'Event Hubs Standard, CloudAMQP Power Panda plan',
        cost: costsData.messageQueue?.[tickets] || 0,
        scaling: 'Fixed (no scaling)',
      },
      {
        component: 'Networking',
        service: 'Azure Data Transfer',
        specs: '1 TB of monthly egress from core to edge',
        cost: costsData.networking?.[tickets] || 0,
        scaling: 'Incremental(KB-level data) Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      },
      {
        component: 'Edge Compute',
        service: 'Azure Virtual Machines',
        specs: '2 VMs, D4ds v5 series (4 vCores, 16 GB RAM)',
        cost: costsData.edgeCompute?.[tickets] || 0,
        scaling: 'Fixed at 2 VMs for 1000 tickets and 3VMs for 5000 tickets',
      },
      {
        component: 'Monitoring & Security',
        service: 'Azure Monitor / Log Analytics / Security',
        specs: 'Variable based on data volume',
        cost: costsData.monitoring?.[tickets] || 0,
        scaling: 'Log Volume: 1x → 1.05x → 1.15x → 1.30x → 1.50x',
      },
    ];

    // Calculate totals
    let infrastructureTotal = 0;
    components.forEach(comp => {
      infrastructureTotal += parseFloat(comp.cost);
    });

    const deploymentCost = costsData.deployment?.[tickets] || 0;
    const grandTotal = infrastructureTotal + parseFloat(deploymentCost);

    // Build CSV content
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    let csvContent = '';
    
    // Header
    csvContent += 'Component,Azure Service,Specifications,Cost (USD) - ' + tickets + ' Tickets,Scaling Rationale\n';
    
    // Data rows
    components.forEach(comp => {
      csvContent += [
        escapeCSV(comp.component),
        escapeCSV(comp.service),
        escapeCSV(comp.specs),
        escapeCSV(comp.cost),
        escapeCSV(comp.scaling),
      ].join(',') + '\n';
    });

    // Infrastructure Total row
    csvContent += escapeCSV('Infrastructure Total') + ',,,';
    csvContent += escapeCSV(infrastructureTotal.toFixed(2)) + ',\n';

    // Deployment row
    csvContent += [
      escapeCSV('Deployment'),
      escapeCSV('One-time setup and configuration'),
      escapeCSV('Initial deployment'),
      escapeCSV(deploymentCost),
      escapeCSV('Fixed'),
    ].join(',') + '\n';

    // Grand Total row
    csvContent += escapeCSV('TOTAL (Exclusive of LLM)') + ',,,';
    csvContent += escapeCSV(grandTotal.toFixed(2)) + ',\n';

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Azure_Cost_${tickets}_Tickets.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json({ error: 'Failed to generate CSV file' }, { status: 500 });
  }
}