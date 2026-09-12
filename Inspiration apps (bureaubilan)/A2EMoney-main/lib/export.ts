// CSV / XLSX export helpers (Google Sheets compatible)

function csvCell(v: any): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportToCSV(name: string, headers: string[], rows: any[][]) {
  const csv = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name.replace(/[^a-z0-9_-]/gi, "_")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * XLSX export via SpreadsheetML XML (no extra dep).
 * Google Sheets / Excel both open .xls XML payloads cleanly.
 */
export function exportToXLSX(name: string, headers: string[], rows: any[][]) {
  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  const headerRow = `<Row>${headers
    .map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join("")}</Row>`
  const dataRows = rows
    .map(
      (r) =>
        `<Row>${r
          .map((c) => {
            const isNum = typeof c === "number" && !isNaN(c)
            return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${esc(c)}</Data></Cell>`
          })
          .join("")}</Row>`,
    )
    .join("")
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${esc(name).slice(0, 30)}">
    <Table>${headerRow}${dataRows}</Table>
  </Worksheet>
</Workbook>`
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name.replace(/[^a-z0-9_-]/gi, "_")}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

/** Export any rows as JSON download. */
export function exportToJSON(name: string, payload: any) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${name.replace(/[^a-z0-9_-]/gi, "_")}.json`
  a.click()
  URL.revokeObjectURL(url)
}
