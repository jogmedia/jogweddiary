import { elementPdfFile } from "@/lib/pdf";

/**
 * Shares a generated PDF via the native Web Share API (WhatsApp appears in the sheet).
 * Falls back to a pre-filled wa.me link when file sharing is unsupported.
 */
export async function sharePdfViaWhatsApp(opts: {
  elementId: string;
  filename: string;
  text: string;
  waLink: string;
}) {
  try {
    const file = await elementPdfFile(opts.elementId, opts.filename);
    const nav = navigator as any;
    if (file && nav?.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: opts.filename, text: opts.text });
      return "shared" as const;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "cancelled" as const;
  }
  window.open(opts.waLink, "_blank", "noopener");
  return "fallback" as const;
}
