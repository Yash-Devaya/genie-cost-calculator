import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickets = searchParams.get('tickets');
    const planId = searchParams.get('planId');
    const regionId = searchParams.get('regionId');
    const multiplierProfileId = searchParams.get('multiplierProfileId');
    const currency = searchParams.get('currency') || 'USD';
    const exchangeRate = parseFloat(searchParams.get('exchangeRate')) || 83;

    if (!tickets || !planId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch plan with all details
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
        product: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get region and multiplier info
    let region = null;
    let multiplier = 1.0;
    
    if (regionId && multiplierProfileId) {
      region = await prisma.region.findUnique({
        where: { id: parseInt(regionId) },
      });

      const profile = await prisma.costMultiplierProfile.findUnique({
        where: { id: parseInt(multiplierProfileId) },
        include: {
          multipliers: {
            where: { regionId: parseInt(regionId) },
          },
        },
      });

      if (profile && profile.multipliers.length > 0) {
        multiplier = profile.multipliers[0].multiplier;
      }
    }

    // Calculate totals and build data
    const ticketKey = `tickets${tickets}`;
    const categoriesData = [];
    let grandTotal = 0;

    plan.categories.forEach((category) => {
      const components = [];
      let categoryTotal = 0;

      category.components.forEach((component) => {
        const baseCost = parseFloat(component[ticketKey]) || 0;
        const adjustedCost = baseCost * multiplier;
        const displayCost = currency === 'INR' ? adjustedCost * exchangeRate : adjustedCost;
        categoryTotal += displayCost;

        components.push({
          name: component.name,
          cost: displayCost,
        });
      });

      categoriesData.push({
        name: category.name,
        components,
        total: categoryTotal,
        showTotal: category.showTotal,
      });

      grandTotal += categoryTotal;
    });

    // Return HTML that will generate PDF on client side
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${plan.name} - Cost Breakdown</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
</head>
<body>
  <script>
    window.jsPDF = window.jspdf.jsPDF;
    
    const data = ${JSON.stringify({
      productName: plan.product?.name || 'Cost Calculator',
      planName: plan.name,
      planDescription: plan.description,
      tickets: tickets,
      region: region?.name,
      multiplier: multiplier,
      currency: currency,
      categories: categoriesData,
      grandTotal: grandTotal,
    })};

    const doc = new jsPDF();
    let yPosition = 20;

    // Helper function to format currency properly
    function formatCurrency(amount, currency) {
      const formatted = amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
      
      if (currency === 'INR') {
        return 'Rs. ' + formatted;
      } else {
        return '$ ' + formatted;
      }
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237);
    doc.text(data.productName, 105, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Cost Breakdown Report', 105, yPosition, { align: 'center' });
    
    yPosition += 15;

    // Plan Details Box
    doc.setFillColor(243, 244, 246);
    doc.rect(15, yPosition, 180, 35, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Plan: ' + data.planName, 20, yPosition + 8);
    doc.text('Description: ' + data.planDescription, 20, yPosition + 15);
    doc.text('Tickets: ' + data.tickets, 20, yPosition + 22);
    if (data.region) {
      doc.text('Region: ' + data.region + ' (' + data.multiplier.toFixed(2) + 'x multiplier)', 20, yPosition + 29);
    }
    
    yPosition += 45;

    // Categories and Components
    data.categories.forEach((category, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Category Header
      doc.setFontSize(12);
      doc.setTextColor(124, 58, 237);
      doc.text(category.name, 15, yPosition);
      yPosition += 7;

      // Components Table
      const tableData = category.components.map(comp => {
        return [comp.name, formatCurrency(comp.cost, data.currency)];
      });

      doc.autoTable({
        startY: yPosition,
        head: [['Component', 'Cost (' + data.currency + ')']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [243, 244, 246], 
          textColor: [102, 102, 102], 
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9, textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 60, halign: 'right' }
        },
        margin: { left: 15, right: 15 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });

      yPosition = doc.lastAutoTable.finalY + 3;

      // Category Total
      if (category.showTotal) {
        const totalText = formatCurrency(category.total, data.currency);

        doc.setFontSize(10);
        doc.setTextColor(124, 58, 237);
        doc.setFont(undefined, 'bold');
        doc.text(category.name + ' Total:', 15, yPosition);
        doc.text(totalText, 195, yPosition, { align: 'right' });
        doc.setFont(undefined, 'normal');
        yPosition += 3;
      }

      yPosition += 10;
    });

    // Grand Total Box
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    const grandTotalText = formatCurrency(data.grandTotal, data.currency);

    doc.setFillColor(124, 58, 237);
    doc.rect(15, yPosition, 180, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL MONTHLY COST:', 20, yPosition + 8);
    doc.setFontSize(16);
    doc.text(grandTotalText, 20, yPosition + 16);
    doc.setFont(undefined, 'normal');

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(102, 102, 102);
      doc.text(
        'Generated on ' + currentDate + ' | ' + data.productName,
        105,
        285,
        { align: 'center' }
      );
      doc.text(
        'Page ' + i + ' of ' + pageCount,
        195,
        285,
        { align: 'right' }
      );
    }

    // Download
    const filename = data.planName.replace(/[^a-z0-9]/gi, '_') + '_' + data.tickets + '_Tickets.pdf';
    doc.save(filename);
    
    // Close window after download
    setTimeout(() => window.close(), 1000);
  </script>
  <div style="font-family: Arial; padding: 40px; text-align: center;">
    <h2>Generating PDF...</h2>
    <p>Your download should start automatically.</p>
    <p style="color: #666; font-size: 14px;">If it doesn't, please allow popups for this site.</p>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      message: error.message 
    }, { status: 500 });
  }
}