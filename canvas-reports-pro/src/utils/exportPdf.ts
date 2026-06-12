import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });
  const pdf = new jsPDF('p', 'pt', 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  let position = 0;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imageWidth, imageHeight);
  let remaining = imageHeight - pageHeight;

  while (remaining > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imageWidth, imageHeight);
    remaining -= pageHeight;
  }

  pdf.save(filename);
}
