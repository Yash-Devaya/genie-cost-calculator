import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickets = searchParams.get('tickets');
    const planId = searchParams.get('planId');

    if (!tickets) {
      return NextResponse.json({ error: 'Tickets parameter required' }, { status: 400 });
    }

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    // Fetch plan with categories, components, and custom fields
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(planId) },
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

    const ticketKey = `tickets${tickets}`;

    // CSV helper
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const getCustomFieldValue = (component, fieldName) => {
      try {
        const data = typeof component.customFieldData === 'string' 
          ? JSON.parse(component.customFieldData) 
          : component.customFieldData || {};
        return data[fieldName] || '';
      } catch {
        return '';
      }
    };

    let csvContent = '';
    
    // Header with plan info
    csvContent += `Plan: ${escapeCSV(plan.name)}\n`;
    csvContent += `Description: ${escapeCSV(plan.description)}\n`;
    csvContent += `Ticket Count: ${tickets}\n`;
    csvContent += `\n`;
    
    // Column headers
    const headers = ['Component'];
    plan.customFields.forEach(field => {
      headers.push(field.name);
    });
    headers.push(`Cost (USD) - ${tickets} Tickets`);
    csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';

    // Process each category
    plan.categories.forEach(category => {
      // Category name row
      csvContent += `\n${escapeCSV(category.name)}\n`;
      
      let categoryTotal = 0;

      // Components in category
      category.components.forEach(comp => {
        const cost = parseFloat(comp[ticketKey]) || 0;
        categoryTotal += cost;

        const row = [escapeCSV(comp.name)];
        
        // Add custom field values
        plan.customFields.forEach(field => {
          row.push(escapeCSV(getCustomFieldValue(comp, field.name)));
        });
        
        // Add cost
        row.push(escapeCSV(cost));
        
        csvContent += row.join(',') + '\n';
      });

      // Category total
      if (category.showTotal) {
        const totalRow = [escapeCSV(`${category.name} Total`)];
        for (let i = 0; i < plan.customFields.length; i++) {
          totalRow.push('');
        }
        totalRow.push(escapeCSV(categoryTotal.toFixed(2)));
        csvContent += totalRow.join(',') + '\n';
      }
    });

    // Grand total
    let grandTotal = 0;
    plan.categories.forEach(category => {
      category.components.forEach(comp => {
        grandTotal += parseFloat(comp[ticketKey]) || 0;
      });
    });

    csvContent += '\n';
    const grandTotalRow = [escapeCSV('TOTAL (Exclusive of LLM)')];
    for (let i = 0; i < plan.customFields.length; i++) {
      grandTotalRow.push('');
    }
    grandTotalRow.push(escapeCSV(grandTotal.toFixed(2)));
    csvContent += grandTotalRow.join(',') + '\n';

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${plan.name.replace(/[^a-z0-9]/gi, '_')}_${tickets}_Tickets.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json({ error: 'Failed to generate CSV file' }, { status: 500 });
  }
}