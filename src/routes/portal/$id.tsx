import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, ExternalLink, Images, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/jog-media-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import {
  DISPATCH_DAYS,
  LAYOUT_DAYS,
  countdownLabel,
  daysLeft,
  portalProgress,
  type PortalProject,
} from "@/lib/portal";

export const Route = createFileRoute("/portal/$id")({
  head: () => ({
    meta: [
      { title: "Album Status — JOG MEDIA Client Portal" },
      {
        name: "description",
        content:
          "Track your wedding album design status, submit photo selections and review layout proofs with JOG MEDIA.",
      },
      { property: "og:title", content: "Album Status — JOG MEDIA Client Portal" },
      {
        property: "og:description",
        content: "Track your album design status and review layout proofs.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

function usePortal(id: string) {
  return useQuery({
    queryKey: ["portal", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal" as any, { _project_id: id } as any);
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row ?? null) as PortalProject | null;
    },
  });
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </p>
      {children}
    </section>
  );
}

function PortalPage() {
  const { id } = useParams({ from: "/portal/$id" });
  const { data, isLoading, error } = usePortal(id);
  const qc = useQueryClient();
  const [selection, setSelection] = useState("");
  const [revision, setRevision] = useState("");

  const submitSelection = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await supabase.rpc("portal_submit_selection" as any, {
        _project_id: id,
        _note: note,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your selection has been sent to JOG MEDIA");
      setSelection("");
      qc.invalidateQueries({ queryKey: ["portal", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send selection"),
  });

  const setApproval = useMutation({
    mutationFn: async (v: { status: "approved" | "revision"; note?: string }) => {
      const { error } = await supabase.rpc("portal_set_approval" as any, {
        _project_id: id,
        _status: v.status,
        _note: v.note ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "Layout approved. Thank you!" : "Revision request sent");
      setRevision("");
      qc.invalidateQueries({ queryKey: ["portal", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save your response"),
  });

  if (isLoading)
    return <Shell><p className="p-6 text-center text-sm text-muted-foreground">Loading your album status…</p></Shell>;
  if (error || !data)
    return (
      <Shell>
        <p className="p-6 text-center text-sm text-muted-foreground">
          This portal link is not valid. Please contact JOG MEDIA.
        </p>
      </Shell>
    );

  const { stages, pct } = portalProgress(data);
  const layoutLeft = daysLeft(data.selection_received_date, LAYOUT_DAYS);
  const dispatchLeft = daysLeft(data.sent_to_printing_date, DISPATCH_DAYS);

  return (
    <Shell clientName={data.client_name}>
      <div className="grid gap-4">
        <Card title="Album progress">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-3 grid gap-2">
            {stages.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {data.project_name} · Event {fmtDate(data.event_date ?? "")}
            {data.package_name ? ` · ${data.package_name}` : ""}
          </p>
        </Card>

        {(layoutLeft !== null || dispatchLeft !== null) && (
          <Card title="Timelines">
            <div className="grid gap-2 text-sm">
              {layoutLeft !== null && (
                <p className={layoutLeft < 0 ? "text-destructive" : ""}>
                  🎨 {countdownLabel(layoutLeft, `Album design (${LAYOUT_DAYS} days)`)}
                </p>
              )}
              {dispatchLeft !== null && (
                <p className={dispatchLeft < 0 ? "text-destructive" : ""}>
                  📦 {countdownLabel(dispatchLeft, `Dispatch (${DISPATCH_DAYS} days)`)}
                </p>
              )}
            </div>
          </Card>
        )}

        <Card title="Your raw photos" icon={<Images className="h-4 w-4" />}>
          {data.raw_drive_link ? (
            <Button className="h-11 w-full" asChild>
              <a href={data.raw_drive_link} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Open raw photos folder
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Your raw photos will appear here once shared.</p>
          )}
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted-foreground">
              Submit your selected photo numbers (e.g. 12, 45, 78)
            </p>
            <Textarea
              rows={4}
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              placeholder="Type your selected photo numbers here…"
            />
            <Button
              className="mt-2 h-11 w-full"
              disabled={!selection.trim() || submitSelection.isPending}
              onClick={() => submitSelection.mutate(selection.trim())}
            >
              Send my selection
            </Button>
            {data.client_selection_note && (
              <p className="mt-2 text-xs text-muted-foreground">
                Last received: {data.client_selection_note}
              </p>
            )}
          </div>
        </Card>

        <Card title="Album layout review" icon={<MessageSquare className="h-4 w-4" />}>
          {data.album_proof_link ? (
            <>
              <Button variant="outline" className="h-11 w-full" asChild>
                <a href={data.album_proof_link} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> View album layout proof
                </a>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Current status: {(data.client_approval_status ?? "pending").replace(/_/g, " ")}
              </p>
              <div className="mt-3 grid gap-2">
                <Button
                  className="h-11 bg-success text-white hover:bg-success/90"
                  disabled={setApproval.isPending}
                  onClick={() => setApproval.mutate({ status: "approved" })}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve Layout
                </Button>
                <Textarea
                  rows={3}
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="What would you like changed?"
                />
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={setApproval.isPending}
                  onClick={() => setApproval.mutate({ status: "revision", note: revision.trim() })}
                >
                  Request Revision
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your album layout proof will be shared here once the design is ready.
            </p>
          )}
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children, clientName }: { children: React.ReactNode; clientName?: string | null }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 text-center">
        <img
          src={logoAsset.url}
          alt="JOG MEDIA logo"
          className="mx-auto h-16 w-16 rounded-full object-contain"
        />
        <h1 className="mt-2 font-display text-xl font-semibold">JOG MEDIA</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Wedding Photography</p>
        {clientName && <p className="mt-2 text-sm font-medium">{clientName}</p>}
      </header>
      <main className="mx-auto w-full max-w-md px-4 py-4 pb-10">{children}</main>
    </div>
  );
}
