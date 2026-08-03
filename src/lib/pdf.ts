/** Generates an A4 PDF from a DOM element using html2pdf.js (loaded lazily, browser only). */
export async function downloadElementPdf(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const html2pdf = (await import("html2pdf.js")).default as any;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.style.top = "0";
  holder.style.background = "#ffffff";
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    await html2pdf()
      .set({
        margin: [15, 12, 15, 12],
        filename: `${filename}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 780 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(clone)
      .save();
  } finally {
    holder.remove();
  }
}
