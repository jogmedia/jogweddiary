import { useState } from "react";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OTHER_DRIVE } from "@/lib/drives";
import {
  useHardDisks,
  useRemove,
  useRenameHardDisk,
  useUpsert,
  type HardDisk,
} from "@/lib/db";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
};

/** Hard disk selector backed by the shared, editable `hard_disks` list. */
export function DrivePicker({ value, onChange, className, label = "Select Hard Disk" }: Props) {
  const { data: disks = [] } = useHardDisks();
  const saveDisk = useUpsert("hard_disks", "Hard disk");
  const renameDisk = useRenameHardDisk();
  const removeDisk = useRemove("hard_disks", "Hard disk");

  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "" });
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<HardDisk | null>(null);
  const [editForm, setEditForm] = useState({ name: "", capacity: "" });
  const [confirmDelete, setConfirmDelete] = useState<HardDisk | null>(null);

  const active = disks.filter((d) => d.is_active);
  const names = active.map((d) => d.name);
  const isPreset = names.includes(value);
  const isOther = value.length > 0 && !isPreset;

  const diskLabel = (d: HardDisk) => (d.capacity ? `${d.name} · ${d.capacity}` : d.name);

  const create = async () => {
    const name = form.name.trim();
    if (!name) {
      setErr("Disk name is required");
      return;
    }
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setErr("A disk with this name already exists");
      return;
    }
    await saveDisk.mutateAsync({
      name,
      capacity: form.capacity.trim() || null,
      sort_order: (disks.at(-1)?.sort_order ?? 0) + 1,
    });
    onChange(name);
    setForm({ name: "", capacity: "" });
    setErr("");
    setAddOpen(false);
  };

  const startEdit = (d: HardDisk) => {
    setEditing(d);
    setEditForm({ name: d.name, capacity: d.capacity ?? "" });
  };

  const commitEdit = async () => {
    if (!editing) return;
    const name = editForm.name.trim();
    if (!name) return;
    await renameDisk.mutateAsync({
      id: editing.id,
      oldName: editing.name,
      name,
      capacity: editForm.capacity.trim() || null,
    });
    if (value === editing.name) onChange(name);
    setEditing(null);
  };

  const commitDelete = async () => {
    if (!confirmDelete) return;
    await removeDisk.mutateAsync(confirmDelete.id);
    if (value === confirmDelete.name) onChange("");
    setConfirmDelete(null);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary"
        >
          <Settings2 className="h-3.5 w-3.5" /> Manage disks
        </button>
      </div>

      <Select
        value={isOther ? OTHER_DRIVE : value}
        onValueChange={(v) => {
          if (v === "__add__") {
            setAddOpen(true);
            return;
          }
          onChange(v === OTHER_DRIVE ? OTHER_DRIVE : v);
        }}
      >
        <SelectTrigger className="mt-1 h-9 text-xs">
          <SelectValue placeholder="Select Hard Disk" />
        </SelectTrigger>
        <SelectContent>
          {active.map((d) => (
            <SelectItem key={d.id} value={d.name} className="text-xs">
              {diskLabel(d)}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_DRIVE} className="text-xs">
            {OTHER_DRIVE}
          </SelectItem>
          <SelectItem value="__add__" className="text-xs font-semibold text-primary">
            + Add New Hard Disk
          </SelectItem>
        </SelectContent>
      </Select>

      {isOther && value !== OTHER_DRIVE ? null : null}
      {isOther && (
        <Input
          className="mt-2 h-9 text-xs"
          placeholder="Enter storage location (e.g. Google Drive, Studio NAS)"
          value={value === OTHER_DRIVE ? "" : value}
          onChange={(e) => onChange(e.target.value || OTHER_DRIVE)}
        />
      )}

      {/* Add new disk */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Add New Hard Disk</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                Disk Name / Label<span className="text-destructive"> *</span>
              </Label>
              <Input
                autoFocus
                placeholder='e.g. "SSD 01 - 2TB SanDisk"'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Storage Capacity (optional)</Label>
              <Input
                placeholder="e.g. 2TB"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saveDisk.isPending}>
              {saveDisk.isPending ? "Saving…" : "Save Disk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage disks */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Manage Hard Disks</DialogTitle>
            <DialogDescription className="text-xs">
              Renaming a disk updates it everywhere, including projects already linked to it.
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
            {active.length === 0 && (
              <li className="text-xs text-muted-foreground">No hard disks yet.</li>
            )}
            {active.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-card p-2.5">
                {editing?.id === d.id ? (
                  <div className="grid gap-2">
                    <Input
                      autoFocus
                      className="h-9 text-xs"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="Capacity (optional)"
                      value={editForm.capacity}
                      onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-9 flex-1 text-xs"
                        disabled={renameDisk.isPending}
                        onClick={commitEdit}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 flex-1 text-xs"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-medium">{diskLabel(d)}</span>
                    <span className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Rename ${d.name}`}
                        className="h-9 w-9"
                        onClick={() => startEdit(d)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Delete ${d.name}`}
                        className="h-9 w-9 text-destructive"
                        onClick={() => setConfirmDelete(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setManageOpen(false);
                setAddOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add New Hard Disk
            </Button>
            <Button onClick={() => setManageOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Delete hard disk?</DialogTitle>
            <DialogDescription className="text-xs">
              “{confirmDelete?.name}” will be removed from the disk list. Projects already recorded
              against it keep their saved label.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeDisk.isPending}
              onClick={commitDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
