const PDF_OPTS = (filename: string) => ({
  margin: [6, 6, 6, 6],
  filename: `${filename}.pdf`,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, backgroundColor: "#FAF6EE", windowWidth: 760 },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".pdf-avoid-break"] },
});

async function withClone<T>(elementId: string, run: (clone: HTMLElement) => Promise<T>) {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.style.top = "0";
  holder.style.background = "#FAF6EE";
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    return await run(clone);
  } finally {
    holder.remove();
  }
}

/** Generates an A4 PDF from a DOM element and triggers a download. */
export async function downloadElementPdf(elementId: string, filename: string) {
  const html2pdf = (await import("html2pdf.js")).default as any;
  await withClone(elementId, async (clone) => {
    await html2pdf().set(PDF_OPTS(filename)).from(clone).save();
  });
}

/** Generates an A4 PDF from a DOM element and returns it as a File (for Web Share). */
export async function elementPdfFile(elementId: string, filename: string): Promise<File | null> {
  const html2pdf = (await import("html2pdf.js")).default as any;
  const blob = await withClone(elementId, async (clone) => {
    return (await html2pdf().set(PDF_OPTS(filename)).from(clone).outputPdf("blob")) as Blob;
  });
  if (!blob) return null;
  return new File([blob], `${filename}.pdf`, { type: "application/pdf" });
}
