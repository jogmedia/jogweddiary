/** Simple client-side exporters: CSV, Excel (SpreadsheetML/HTML table) and PDF (print dialog). */

export type ExportRow = Record<string, string | number | null | undefined>;

const escapeCsv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export function exportCsv(rows: ExportRow[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
  ].join("\n");
  download(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportExcel(rows: ExportRow[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body>
<table border="1"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  download(new Blob([html], { type: "application/vnd.ms-excel" }), `${filename}.xls`);
}

/** Opens the browser print dialog for the given element — user chooses "Save as PDF". */
export function exportPdf(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("");
  win.document.write(
    `<html><head><title>${title}</title>${styles}</head><body style="padding:24px;background:#fff">${el.innerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}
