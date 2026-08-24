/** Production checklist + post-production workflow helpers (UI/presentation logic). */

export const STAGE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const WORKFLOW_STEPS = [
  { key: "raw_backup_done", label: "Raw data backed up" },
  { key: "photo_selection_done", label: "Photo selection done" },
  { key: "album_editing_done", label: "Album editing" },
  { key: "video_editing_done", label: "Video editing" },
  { key: "album_printed", label: "Album printed" },
  { key: "final_delivery_done", label: "Final delivery" },
] as const;

export type WorkflowKey = (typeof WORKFLOW_STEPS)[number]["key"];

/** Next status when a card is cycled by tapping. */
export function nextStatus(current?: string | null) {
  const order = ["pending", "in_progress", "completed"];
  const i = order.indexOf((current ?? "pending").toLowerCase());
  return order[(i + 1) % order.length];
}

type Flags = Record<string, any>;

/**
 * Derive stage statuses from the workflow ticks (and shoot dates), so the
 * checklist stays in sync automatically. Only ever advances a stage.
 */
export function derivedStages(p: Flags, allShootDatesPassed: boolean) {
  const rank = (s?: string | null) =>
    ["pending", "in_progress", "completed"].indexOf((s ?? "pending").toLowerCase());
  const bump = (current: string | null | undefined, target: string) =>
    rank(target) > rank(current) ? target : null;

  const out: Record<string, string> = {};
  const shoot = p.raw_backup_done || allShootDatesPassed ? "completed" : null;
  if (shoot) {
    const v = bump(p.shoot_status, shoot);
    if (v) out.shoot_status = v;
  }

  const editing =
    p.album_editing_done && p.video_editing_done
      ? "completed"
      : p.album_editing_done || p.video_editing_done || p.photo_selection_done
        ? "in_progress"
        : null;
  if (editing) {
    const v = bump(p.editing_status, editing);
    if (v) out.editing_status = v;
  }

  const album = p.album_printed ? "completed" : p.album_editing_done ? "in_progress" : null;
  if (album) {
    const v = bump(p.album_status, album);
    if (v) out.album_status = v;
  }

  if (p.final_delivery_done) {
    const v = bump(p.delivery_status, "completed");
    if (v) out.delivery_status = v;
    if ((p.project_status ?? "") !== "completed") out.project_status = "completed";
  }
  return out;
}

/** Overall progress across the 6 workflow steps + a friendly label. */
export function workflowProgress(p: Flags) {
  const done = WORKFLOW_STEPS.filter((s) => Boolean(p[s.key]));
  const count = done.length;
  const pct = Math.round((count / WORKFLOW_STEPS.length) * 100);
  let label = "Not started";
  if (p.final_delivery_done) label = "Delivered";
  else if (p.album_printed) label = "Album printed — dispatch pending";
  else if (p.album_editing_done || p.video_editing_done) label = "In editing";
  else if (p.photo_selection_done) label = "Selection received";
  else if (p.raw_backup_done) label = "Shoot done — awaiting selection";
  return { count, total: WORKFLOW_STEPS.length, pct, label };
}
