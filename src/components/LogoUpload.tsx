import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { docLogoUrl } from "@/components/PdfDoc";
import { useUpsert } from "@/lib/db";
import { toast } from "sonner";

/** Resizes an image file to a square-ish PNG data URL so it embeds cleanly in PDFs. */
async function toDataUrl(file: File, max = 420): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

export function LogoUpload({ settings, canEdit }: { settings: any; canEdit: boolean }) {
  const save = useUpsert("app_settings", "Business logo");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File | null) {
    if (!file || !settings?.id) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo must be under 5 MB.");
    setBusy(true);
    try {
      const logo_url = await toDataUrl(file);
      await save.mutateAsync({ id: settings.id, logo_url });
      toast.success("Logo updated — it will appear on all PDF exports.");
    } catch {
      toast.error("Could not process that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="surface mb-5 p-5">
      <p className="mb-3 text-sm font-semibold">Business logo</p>
      <div className="flex items-center gap-4">
        <img
          src={docLogoUrl(settings)}
          alt="Business logo"
          className="h-20 w-20 rounded-full border border-border bg-white object-contain p-1"
        />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Shown on the header of every PDF (quotations, invoices, agreements, receipts and briefs).
            Square PNG or JPG works best.
          </p>
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? "Uploading…" : settings?.logo_url ? "Replace logo" : "Upload logo"}
              </Button>
              {settings?.logo_url && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    await save.mutateAsync({ id: settings.id, logo_url: null });
                    toast.success("Reverted to the default JOG MEDIA logo.");
                  }}
                >
                  Use default
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
