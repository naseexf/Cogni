export type StyledColumn = { header: string; key: string; width?: number };

export async function exportStyledSheet(
  columns: StyledColumn[],
  rows: Record<string, any>[],
  filename: string,
  sheetName = "Sheet1",
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));

  const header = ws.getRow(1);
  header.font = { bold: true, name: "Arial", size: 11 };
  header.alignment = { vertical: "middle", horizontal: "left" };
  header.height = 20;

  rows.forEach((r) => {
    const row = ws.addRow(r);
    row.font = { name: "Arial", size: 11 };
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
