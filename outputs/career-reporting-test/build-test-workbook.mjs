import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(outputDir, 'career-reporting-hub-test.xlsx');

const workbook = Workbook.create();
const sheet = workbook.worksheets.add('Reported Hires');
sheet.showGridLines = false;

const headers = [
  'Student Name',
  'Employer Name',
  'Program',
  'Program Length (Months)',
  'Program Start Date',
  'Graduation Date',
  'Employment Status',
  'Hire Date',
  'Descriptive Job',
  'Duties',
  'Contact Name',
  'Phone',
  'Email',
  'Address',
  'Verification',
  'Notes',
];

const rows = [
  [
    'Jordan Miller', 'Keystone Electrical Services', 'Electrical Technology', 12,
    new Date('2024-01-08T00:00:00Z'), new Date('2025-01-10T00:00:00Z'), 'Employed in Field',
    new Date('2025-01-20T00:00:00Z'), 'Electrical Technician',
    'Installs, tests, and troubleshoots commercial electrical systems.', 'Dana Brooks',
    '(724) 555-0142', 'dana.brooks@example.com', '1200 Commerce Drive, New Castle, PA 16101',
    'Written employer verification dated 01/22/2025', 'Complete example record.',
  ],
  [
    'Taylor Reed', 'Tri-State HVAC Solutions', 'Refrigeration & AC Technology', 15,
    new Date('2023-09-05T00:00:00Z'), new Date('2024-12-13T00:00:00Z'), 'Employed in Field',
    new Date('2025-01-06T00:00:00Z'), 'HVAC Service Technician',
    'Performs preventive maintenance and repairs on residential HVAC equipment.', 'Morgan Lee',
    '', 'morgan.lee@example.com', '88 Industrial Park Road, Butler, PA 16001',
    'Written employer verification dated 01/08/2025', 'INTENTIONAL TEST ISSUE: employer phone is missing.',
  ],
  [
    'Casey Nguyen', 'Steel City Fabrication', 'Combination Welding', 12,
    new Date('2024-02-12T00:00:00Z'), new Date('2025-02-14T00:00:00Z'), 'Employed in Field',
    new Date('2025-02-24T00:00:00Z'), 'Production Welder',
    'Reads fabrication drawings and performs MIG and TIG welding.', 'Alex Romero',
    '(412) 555-0177', 'alex.romero@example.com', '', '',
    'INTENTIONAL TEST ISSUES: employer address and verification source are missing.',
  ],
  [
    'Avery Johnson', 'Lawrence County Diesel', 'Diesel & Heavy Equipment Repair', 18,
    new Date('2023-08-21T00:00:00Z'), new Date('2025-02-21T00:00:00Z'), 'Employed in Field',
    new Date('2025-01-15T00:00:00Z'), 'Diesel Mechanic',
    'Diagnoses and repairs diesel engines, brakes, and hydraulic systems.', 'Sam Patel',
    '(724) 555-0119', 'sam.patel@example.com', '455 Route 422, New Castle, PA 16101',
    'Graduate-signed verification dated 02/25/2025',
    'INTENTIONAL TEST WARNING: employment began before graduation; Career Advancement review is needed.',
  ],
  [
    'Riley Thompson', 'Penn Mechanical Contractors', 'Electrical Technology', 12,
    new Date('2024-03-04T00:00:00Z'), new Date('2025-03-07T00:00:00Z'), 'Employed in Field',
    new Date('2025-03-17T00:00:00Z'), 'Maintenance Electrician', '', 'Chris Young',
    '(724) 555-0163', 'chris.young@example.com', '910 Mill Street, Ellwood City, PA 16117',
    'Written employer verification dated 03/19/2025',
    'INTENTIONAL TEST WARNING: job duties are missing.',
  ],
  [
    'Morgan Davis', 'Northwest Construction Group', 'Building Technology', 12,
    new Date('2024-04-01T00:00:00Z'), new Date('2025-04-04T00:00:00Z'), 'Employed in Field',
    null, 'Carpentry Technician', 'Performs framing, finish carpentry, and job-site layout.', 'Jamie Clark',
    '(814) 555-0128', 'jamie.clark@example.com', '32 Market Avenue, Meadville, PA 16335',
    'Written employer verification dated 04/15/2025',
    'INTENTIONAL TEST ISSUE: employment start date is missing.',
  ],
];

sheet.getRange('A1:P7').values = [headers, ...rows];
sheet.freezePanes.freezeRows(1);

const table = sheet.tables.add('A1:P7', true, 'ReportedHiresTestTable');
table.style = 'TableStyleMedium2';
table.showBandedRows = true;
table.showFilterButton = true;

const header = sheet.getRange('A1:P1');
header.format = {
  fill: '#26315F',
  font: { bold: true, color: '#FFFFFF', size: 10 },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  wrapText: true,
  rowHeight: 34,
};

sheet.getRange('A2:P7').format = {
  font: { color: '#303740', size: 10 },
  verticalAlignment: 'top',
};
sheet.getRange('E2:F7').format.numberFormat = 'mm/dd/yyyy';
sheet.getRange('H2:H7').format.numberFormat = 'mm/dd/yyyy';
sheet.getRange('D2:D7').format.numberFormat = '0';
sheet.getRange('J2:J7').format.wrapText = true;
sheet.getRange('P2:P7').format.wrapText = true;
sheet.getRange('A2:P7').format.rowHeight = 42;

const widths = {
  A: 18, B: 25, C: 23, D: 13, E: 15, F: 14, G: 18, H: 13,
  I: 22, J: 36, K: 18, L: 16, M: 25, N: 31, O: 30, P: 39,
};
for (const [column, width] of Object.entries(widths)) {
  sheet.getRange(`${column}1:${column}7`).format.columnWidth = width;
}

for (const cell of ['L3', 'N4', 'O4', 'H7']) {
  sheet.getRange(cell).format = { fill: '#FDE8E7', font: { color: '#9B1C1C', bold: true } };
}
for (const cell of ['H5', 'J6']) {
  sheet.getRange(cell).format = { fill: '#FFF3D6', font: { color: '#8A5A00', bold: true } };
}

await fs.mkdir(outputDir, { recursive: true });

const inspection = await workbook.inspect({
  kind: 'table',
  range: 'Reported Hires!A1:P7',
  include: 'values,formulas',
  tableMaxRows: 8,
  tableMaxCols: 16,
});
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 50 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: 'Reported Hires',
  range: 'A1:P7',
  scale: 1,
  format: 'png',
});
await fs.writeFile(path.join(outputDir, 'preview.png'), new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
