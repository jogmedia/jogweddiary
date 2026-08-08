import { elementPdfFile } from "@/lib/pdf";

/**
 * Shares a generated PDF via the native Web Share API (WhatsApp appears in the sheet).
 * Falls back to a same-tab wa.me redirect — never a window.open() pop-up, so browsers
 * never show a "Pop-ups blocked" notification when the PDF generation is async.
 */
export async function sharePdfViaWhatsApp(opts: {
  elementId: string;
  filename: string;
  text: string;
  waLink: string;
}) {
  const nav = navigator as any;
  const canShareFiles = typeof nav?.canShare === "function" && typeof nav?.share === "function";
  if (canShareFiles) {
    try {
      const file = await elementPdfFile(opts.elementId, opts.filename);
      if (file && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: opts.filename, text: opts.text });
        return "shared" as const;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelled" as const;
    }
  }
  // Direct navigation (not window.open) => no pop-up blocker.
  window.location.href = opts.waLink;
  return "fallback" as const;
}
