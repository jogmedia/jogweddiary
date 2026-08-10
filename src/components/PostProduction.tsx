import { useEffect, useState } from "react";
import { Copy, ExternalLink, Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui-kit";
import {
  DISPATCH_DAYS,
  LAYOUT_DAYS,
  countdownLabel,
  daysLeft,
  portalUrl,
  portalWaLink,
} from "@/lib/portal";
import type { Project } from "@/lib/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  project: Project;
  onSave: (values: Record<string, unknown>) => Promise<unknown> | void;
};

const LAYOUT_OPTIONS = [
  { value: "pending", label: "Not started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const APPROVAL_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "revision", label: "Revision requested" },
];

function Row({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {step}
        </span>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function PostProduction({ project, onSave }: Props) {
  const p = project as any;
  const [draft, setDraft] = useState<Record<string, any>>({});
  useEffect(() => setDraft({}), [project.id]);

  const val = (k: string) => (k in draft ? draft[k] : (p[k] ?? "")) ?? "";
  const set = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    const payload: Record<string, unknown> = { id: project.id };
    for (const [k, v] of Object.entries(draft)) payload[k] = v === "" ? null : v;
    await onSave(payload);
    setDraft({});
  };

  const layoutLeft = daysLeft(val("selection_received_date") || null, LAYOUT_DAYS);
  const dispatchLeft = daysLeft(val("sent_to_printing_date") || null, DISPATCH_DAYS);
  const url = portalUrl(project.id);

  return (
    <div className="surface mb-6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Workflow className="h-4 w-4" /> Post-Production Workflow
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {layoutLeft !== null && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                layoutLeft < 0
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-warning/35 bg-warning/15 text-warning-foreground"
              }`}
            >
              {countdownLabel(layoutLeft, "Album design")}
            </span>
          )}
          {dispatchLeft !== null && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                dispatchLeft < 0
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-info/25 bg-info/12 text-info"
              }`}
            >
              {countdownLabel(dispatchLeft, "Dispatch")}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <Row step={1} title="Raw copy sent to client">
          <div>
            <Label className="text-xs text-muted-foreground">Raw copy sent date</Label>
            <Input type="date" value={val("raw_sent_date")} onChange={(e) => set("raw_sent_date", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Google Drive link (raw photos)</Label>
            <Input
              placeholder="https://drive.google.com/…"
              value={val("raw_drive_link")}
              onChange={(e) => set("raw_drive_link", e.target.value)}
            />
          </div>
        </Row>

        <Row step={2} title="Photo selection received (starts 90-day album countdown)">
          <div>
            <Label className="text-xs text-muted-foreground">Selection received date</Label>
            <Input
              type="date"
              value={val("selection_received_date")}
              onChange={(e) => set("selection_received_date", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Selected photo numbers (from client)</Label>
            <Input
              placeholder="e.g. 12, 45, 78…"
              value={val("client_selection_note")}
              onChange={(e) => set("client_selection_note", e.target.value)}
            />
          </div>
        </Row>

        <Row step={3} title="Layout design & colour grading">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={String(val("layout_status") || "pending")} onValueChange={(v) => set("layout_status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <StatusBadge value={String(val("layout_status") || "pending")} />
          </div>
        </Row>

        <Row step={4} title="Album proof PDF for client review">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Album proof PDF link</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://…"
                value={val("album_proof_link")}
                onChange={(e) => set("album_proof_link", e.target.value)}
              />
              {p.album_proof_link && (
                <Button variant="outline" size="icon" asChild>
                  <a href={p.album_proof_link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </Row>

        <Row step={5} title="Client approval">
          <div>
            <Label className="text-xs text-muted-foreground">Approval status</Label>
            <Select
              value={String(val("client_approval_status") || "pending")}
              onValueChange={(v) => set("client_approval_status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Client revision note</Label>
            <Input
              value={val("client_revision_note")}
              onChange={(e) => set("client_revision_note", e.target.value)}
              placeholder="Revision requested by client"
            />
          </div>
        </Row>

        <Row step={6} title="Printing & courier (starts 10-day dispatch countdown)">
          <div>
            <Label className="text-xs text-muted-foreground">Sent to printing date</Label>
            <Input
              type="date"
              value={val("sent_to_printing_date")}
              onChange={(e) => set("sent_to_printing_date", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Courier dispatched date</Label>
            <Input
              type="date"
              value={val("courier_dispatched_date")}
              onChange={(e) => set("courier_dispatched_date", e.target.value)}
            />
          </div>
        </Row>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={!dirty}>
          Save workflow
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Portal link copied");
            } catch {
              toast.error(url);
            }
          }}
        >
          <Copy className="mr-1.5 h-4 w-4" /> Copy Portal Link for Client
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" /> Open portal
          </a>
        </Button>
        <Button
          size="sm"
          className="bg-[#25D366] text-white hover:bg-[#1EB855]"
          onClick={() => {
            window.location.href = portalWaLink(
              project.clients?.whatsapp ?? project.clients?.phone,
              project.clients?.name,
              url,
            );
          }}
        >
          <Send className="mr-1.5 h-4 w-4" /> Share Portal Link to Client
        </Button>
      </div>
    </div>
  );
}
