import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportToExcel(filename: string, sheetName: string, headers: string[], dataRows: any[][]) {
  const wsData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export interface DocumentExportMetadata {
  documentNumber?: string;
  institution?: string;
  director?: string;
  nurse?: string;
  cook?: string;
  period?: string;
}

export function exportToWord(
  filename: string,
  title: string,
  headers: string[],
  dataRows: any[][],
  metadata?: DocumentExportMetadata
) {
  const rows = dataRows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
    </tr>
  `).join('');
  const html = `<!DOCTYPE html>
  <html lang="uk">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
        h1 { text-align: center; font-size: 15pt; margin: 12pt 0 4pt; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 10pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4pt; vertical-align: middle; }
        th { background: #e2e8f0; text-align: center; font-weight: 700; }
        .signatures { margin-top: 24pt; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="meta">
        <div><strong>${escapeHtml(metadata?.institution || 'Заклад дошкільної освіти')}</strong></div>
        <div>№ ${escapeHtml(metadata?.documentNumber || 'без номера')}</div>
      </div>
      <h1>${escapeHtml(title)}</h1>
      ${metadata?.period ? `<p style="text-align:center">${escapeHtml(metadata.period)}</p>` : ''}
      <table>
        <thead>
          <tr><th>№</th>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="signatures">
        <span>Директор: ____________ ${escapeHtml(metadata?.director || '')}</span>
        <span>Медична сестра: ____________ ${escapeHtml(metadata?.nurse || '')}</span>
        <span>Кухар: ____________ ${escapeHtml(metadata?.cook || '')}</span>
      </div>
    </body>
  </html>`;
  downloadBlob(
    `${filename}.doc`,
    new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  );
}

export async function exportToPDF(
  title: string,
  headers: string[],
  dataRows: any[][],
  metadata?: DocumentExportMetadata
) {
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
      ${row.map(cell => `<td style="padding: 6px 8px; border: 1px solid #000000; font-size: 10px; color: #000000;">${escapeHtml(cell)}</td>`).join('')}
    </tr>
  `).join('');

  const fullHtml = `
    <div style="font-family: Arial, sans-serif; color: #000000; background: #ffffff; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px;">
        <div>
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">УКРАЇНА</div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${escapeHtml(metadata?.institution || 'Заклад дошкільної освіти')}</div>
          <div style="font-size: 9px; color: #333333; margin-top: 2px;">Документ № ${escapeHtml(metadata?.documentNumber || 'без номера')}</div>
        </div>
        <div style="text-align: right; font-size: 10px;">
          <div><b>ЗАТВЕРДЖУЮ</b></div>
          <div>Директор</div>
          <div style="margin-top: 12px;">________________ / ${escapeHtml(metadata?.director || '')}</div>
          <div style="font-size: 9px; margin-top: 2px;">«_____» ____________ 2026 р.</div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0;">${escapeHtml(title)}</h2>
        ${metadata?.period ? `<div style="font-size: 10px; margin-top: 4px;">${escapeHtml(metadata.period)}</div>` : ''}
        <div style="font-size: 10px; color: #333333; margin-top: 4px;">
          <b>Дата формування:</b> ${new Date().toLocaleDateString('uk-UA')}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10px;">
        <thead>
          <tr style="background-color: #e2e8f0; border-bottom: 1px solid #000000; font-weight: bold; text-align: left;">
            <th style="padding: 6px 8px; border: 1px solid #000000; width: 35px; text-align: center; color: #000000;">№</th>
            ${headers.map(h => `<th style="padding: 6px 8px; border: 1px solid #000000; color: #000000;">${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #000000;">
        <div>Медична сестра: ____________________ ${escapeHtml(metadata?.nurse || '')}</div>
        <div>Кухар: ____________________ ${escapeHtml(metadata?.cook || '')}</div>
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
            <title>${escapeHtml(title)}</title>
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
