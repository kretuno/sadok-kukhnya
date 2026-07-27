import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ROBOTO_BASE64 } from './robotoFont';

export function exportToExcel(filename: string, sheetName: string, headers: string[], dataRows: any[][]) {
  const wsData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(title: string, headers: string[], dataRows: any[][]) {
  const doc = new jsPDF();
  
  // Register Cyrillic Roboto Font in jsPDF
  try {
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } catch (err) {
    console.error('Error adding font to jsPDF:', err);
  }

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`КЗДО №145 КМР | Дата формування: ${new Date().toLocaleDateString('uk-UA')}`, 14, 22);

  (doc as any).autoTable({
    head: [headers],
    body: dataRows,
    startY: 28,
    theme: 'grid',
    styles: { 
      font: 'Roboto', 
      fontStyle: 'normal', 
      fontSize: 8, 
      cellPadding: 2 
    },
    headStyles: { 
      font: 'Roboto', 
      fontStyle: 'normal', 
      fillColor: [37, 99, 235], 
      textColor: [255, 255, 255] 
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
