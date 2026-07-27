import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function exportToExcel(filename: string, sheetName: string, headers: string[], dataRows: any[][]) {
  const wsData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPDF(title: string, headers: string[], dataRows: any[][]) {
  // Create temporary container positioned in fixed viewport with non-zero opacity
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px'; // A4 standard width at 96 DPI
  container.style.zIndex = '999999';
  container.style.opacity = '0.01'; // Non-zero opacity so browser layout engine measures bounds
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.padding = '30px';
  container.style.boxSizing = 'border-box';

  // Build official Ukrainian table rows
  const rowsHtml = dataRows.map((row, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #000000;">
      <td style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size: 10px; font-weight: bold; color: #000000;">${idx + 1}</td>
      ${row.map(cell => `<td style="padding: 6px 8px; border: 1px solid #000000; font-size: 10px; color: #000000;">${cell === null || cell === undefined ? '' : String(cell)}</td>`).join('')}
    </tr>
  `).join('');

  const fullHtml = `
    <div style="font-family: Arial, sans-serif; color: #000000; background: #ffffff; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px;">
        <div>
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">УКРАЇНА | ДНІПРОПЕТРОВСЬКА ОБЛАСТЬ</div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">КРИВОРІЗЬКИЙ КЗДО (ЯСЛА-САДОК) КТ №145 КМР</div>
          <div style="font-size: 9px; color: #333333; margin-top: 2px;">ЄДРПОУ: 26136748 | вул. Перлинна 23А, м. Кривий Ріг</div>
        </div>
        <div style="text-align: right; font-size: 10px;">
          <div><b>ЗАТВЕРДЖУЮ</b></div>
          <div>Директор КЗДО № 145</div>
          <div style="margin-top: 12px;">________________ / Н. Г. Павлухіна</div>
          <div style="font-size: 9px; margin-top: 2px;">«_____» ____________ 2026 р.</div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0;">${title}</h2>
        <div style="font-size: 10px; color: #333333; margin-top: 4px;">
          <b>Дата формування:</b> ${new Date().toLocaleDateString('uk-UA')}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10px;">
        <thead>
          <tr style="background-color: #e2e8f0; border-bottom: 1px solid #000000; font-weight: bold; text-align: left;">
            <th style="padding: 6px 8px; border: 1px solid #000000; width: 35px; text-align: center; color: #000000;">№</th>
            ${headers.map(h => `<th style="padding: 6px 8px; border: 1px solid #000000; color: #000000;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #000000;">
        <div>Вихователь-методист / Відповідальна особа: ____________________</div>
        <div>Підпис: ____________________</div>
      </div>
    </div>
  `;

  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const safeFilename = title.toLowerCase().replace(/[^\w\u0400-\u04FF]+/g, '_');
    pdf.save(`${safeFilename || 'document'}.pdf`);
  } catch (err) {
    console.error('Error generating PDF via html2canvas:', err);
    // Fallback: open printable window for saving PDF
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${fullHtml}
            <script>window.onload = function() { window.print(); };</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
