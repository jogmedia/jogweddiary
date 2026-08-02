import { useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const TICKET_BUCKET = "travel-tickets";

/** Opens a short-lived signed URL for a stored ticket file. */
export async function openTicket(path: string) {
  const { data, error } = await supabase.storage.from(TICKET_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? "Could not open the ticket file");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

type Props = {
  path: string | null;
  name: string | null;
  projectId?: string;
  onChange: (v: { path: string | null; name: string | null }) => void;
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/jpg,image/webp";
const MAX_MB = 15;

/** "Upload Ticket Attachment (PDF / Image)" field with preview, view/download and delete. */
export function TicketUpload({ path, name, projectId, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is larger than ${MAX_MB} MB`);
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${projectId ?? "unsaved"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(TICKET_BUCKET).upload(key, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (path) await supabase.storage.from(TICKET_BUCKET).remove([path]);
    onChange({ path: key, name: file.name });
    toast.success("Ticket attachment uploaded");
  };

  const remove = async () => {
    if (!path) return;
    setBusy(true);
    const { error } = await supabase.storage.from(TICKET_BUCKET).remove([path]);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange({ path: null, name: null });
    toast.success("Ticket attachment removed");
  };

  const isPdf = (name ?? path ?? "").toLowerCase().endsWith(".pdf");

  return (
    <div className="sm:col-span-2">
      <Label className="mb-1.5 block text-xs font-medium">Upload Ticket Attachment (PDF / Image)</Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />

      {path ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {isPdf ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            <span className="truncate">{name ?? "Ticket attachment"}</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => void openTicket(path)}>
              <Download className="mr-1 h-3.5 w-3.5" /> View / Download
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full text-xs" disabled={busy} onClick={pick}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          {busy ? "Uploading…" : "Choose PDF / image (max 15 MB)"}
        </Button>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        PDF, JPG, PNG or screenshots. Stored securely and linked to this project's travel record.
      </p>
    </div>
  );
}
