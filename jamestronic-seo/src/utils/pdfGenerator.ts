import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Customer, Ticket, Quotation, QuotationItem, Invoice } from '../types/database';
import { formatDateTime, formatCurrency } from './formatters';

interface PDFGeneratorOptions {
    type: 'QUOTATION' | 'INVOICE';
    ticket: Ticket;
    customer: Customer;
    quotation?: Quotation;
    invoice?: Invoice;
}

export const generatePDF = ({ type, ticket, customer, quotation, invoice }: PDFGeneratorOptions): jsPDF => {
    // A4 Portrait: 210 x 297 mm
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();

    // COLORS
    const primaryColor: [number, number, number] = [108, 99, 255]; // #6C63FF
    const darkColor: [number, number, number] = [30, 41, 59]; // #1E293B
    const lightGray: [number, number, number] = [148, 163, 184]; // #94A3B8

    // Helper: Add centered Text
    const addCenteredText = (text: string, y: number, fontSize: number, isBold: boolean, color: [number, number, number]) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
        const textOffset = (pageWidth - textWidth) / 2;
        doc.text(text, textOffset, y);
    };

    // ==========================================
    // HEADER (BRANDING)
    // ==========================================
    // JamesTronic Logo/Text
    addCenteredText('JAMESTRONIC', 20, 24, true, primaryColor);
    addCenteredText('TV REPAIR SPECIALIST', 28, 12, true, darkColor);
    addCenteredText('Manikonda, Hyderabad', 35, 10, false, lightGray);
    addCenteredText('Phone: +91 93923 37049', 41, 10, false, lightGray);

    // Divider Line
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 48, pageWidth - 15, 48);

    // ==========================================
    // DOCUMENT TITLE
    // ==========================================
    const docTitle = type === 'QUOTATION' ? 'SERVICE QUOTATION' : 'TAX INVOICE';
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, 55, pageWidth - 30, 10, 'F');
    addCenteredText(docTitle, 62, 14, true, [255, 255, 255]);

    // ==========================================
    // METADATA & CUSTOMER INFO
    // ==========================================
    doc.setFontSize(10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont('helvetica', 'normal');

    const startY = 80;
    const rightColX = pageWidth / 2 + 10;

    // Left Column: Customer Details
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 15, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${customer.name}`, 15, startY + 6);
    doc.text(`Mobile: ${customer.mobile}`, 15, startY + 12);
    doc.text(`Address: ${customer.address}`, 15, startY + 18, { maxWidth: pageWidth / 2 - 20 });

    // Right Column: Document & TV Details
    doc.setFont('helvetica', 'bold');
    doc.text('Document Details:', rightColX, startY);
    doc.setFont('helvetica', 'normal');
    
    const docDate = type === 'QUOTATION' ? quotation?.created_at : invoice?.created_at;
    const formattedDate = docDate ? formatDateTime(docDate).split(' ')[0] : formatDateTime(new Date().toISOString()).split(' ')[0];
    const docRef = type === 'QUOTATION' ? `QTN-${ticket.ticket_number}` : `INV-${ticket.ticket_number}`;

    doc.text(`Reference No: ${docRef}`, rightColX, startY + 6);
    doc.text(`Ticket No: ${ticket.ticket_number}`, rightColX, startY + 12);
    doc.text(`Date: ${formattedDate}`, rightColX, startY + 18);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Device Details:', rightColX, startY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`Brand: ${ticket.tv_brand}`, rightColX, startY + 34);
    if(ticket.tv_size) doc.text(`Size: ${ticket.tv_size}"`, rightColX, startY + 40);
    if(ticket.tv_model) doc.text(`Model: ${ticket.tv_model}`, rightColX + 30, startY + 40);

    // ==========================================
    // ITEMIZED TABLE
    // ==========================================
    let tableStartY = startY + 55;
    
    // Prepare table rows
    const tableBody: any[] = [];
    let itemsTotal = 0;

    if (quotation && quotation.items) {
        quotation.items.forEach((item: QuotationItem, index: number) => {
            tableBody.push([
                index + 1,
                item.name,
                item.qty.toString(),
                formatCurrency(item.unit_price),
                formatCurrency(item.total)
            ]);
            itemsTotal += item.total;
        });
    }

    (doc as any).autoTable({
        startY: tableStartY,
        head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 40 }
        },
        margin: { top: 10, right: 15, bottom: 10, left: 15 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // ==========================================
    // TOTALS SUMMARY
    // ==========================================
    doc.setFontSize(10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    
    const summaryX = pageWidth - 60;
    const totalsY = finalY;

    if (quotation) {
        doc.text('Items Total:', summaryX - 25, totalsY);
        doc.text(formatCurrency(itemsTotal), pageWidth - 15, totalsY, { align: 'right' });

        doc.text('Labour Charge:', summaryX - 25, totalsY + 6);
        doc.text(formatCurrency(quotation.labour_charge), pageWidth - 15, totalsY + 6, { align: 'right' });

        if (quotation.discount > 0) {
            doc.setTextColor(239, 68, 68); // Red
            doc.text('Discount:', summaryX - 25, totalsY + 12);
            doc.text(`-${formatCurrency(quotation.discount)}`, pageWidth - 15, totalsY + 12, { align: 'right' });
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        }

        // Final Total Box
        doc.setFillColor(241, 245, 249); // light blue-gray
        doc.rect(summaryX - 30, totalsY + 16, 90, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Grand Total:', summaryX - 25, totalsY + 23);
        doc.text(formatCurrency(quotation.total), pageWidth - 15, totalsY + 23, { align: 'right' });
    }

    // ==========================================
    // FOOTER
    // ==========================================
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    
    // Notes section
    if (invoice && invoice.notes) {
        doc.text('Notes / Terms:', 15, totalsY);
        doc.text(invoice.notes, 15, totalsY + 6, { maxWidth: pageWidth / 2 });
    } else {
        doc.text('Terms & Conditions:', 15, totalsY);
        doc.text('1. Quotation valid for 7 days.', 15, totalsY + 5);
        doc.text('2. Parts remain property of Jamestronic until paid.', 15, totalsY + 10);
        doc.text('3. Warranty applies only to repaired components.', 15, totalsY + 15);
    }

    addCenteredText('Thank you for choosing Jamestronic!', 280, 10, true, primaryColor);
    addCenteredText('This is a computer-generated document. No signature is required.', 285, 8, false, lightGray);

    return doc;
};
