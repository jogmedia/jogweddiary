import { useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "@/lib/db";
import { useUpsert } from "@/lib/db";
import { useCrewBookings } from "@/lib/crew";
import { isValidPhone, waNumber } from "@/lib/format";
import { CREW_ROLES, prettyRole } from "@/lib/roles";

const QUICK_ROLES = [
  "Lead Photographer",
  "Candid Photographer",
  "Videographer",
  "Drone Pilot",
  "Assistant",
] as const;

/** One crew member assigned to a sub-event, with the role for that event. */
export type CrewMember = { staffId: string; role: string | null };

/** One-tap crew chips with per-event roles, conflict warnings, and inline crew creation. */
export function CrewPicker({
  staff,
  value,
  onChange,
  label = "Crew",
  date,
  projectId: _projectId,
  eventId,
  time,
}: {
  staff: Staff[];
  value: CrewMember[];
  onChange: (crew: CrewMember[]) => void;
  label?: string;
  date?: string;
  projectId?: string;
  eventId?: string | null;
  time?: string | null;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(QUICK_ROLES[0]);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [createdCrew, setCreatedCrew] = useState<Staff[]>([]);
  const saveStaff = useUpsert("staff", "Crew member");
  const { conflictsFor } = useCrewBookings();

  const allCrew = useMemo(() => {
    const byId = new Map<string, Staff>();
    [...staff, ...createdCrew].forEach((member) => byId.set(member.id, member));
    return [...byId.values()]
      .filter((member) => member.active_status !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, createdCrew]);

  const ids = value.map((member) => member.staffId);
  const selected = allCrew.filter((member) => ids.includes(member.id));
  const clashes = (id: string) => conflictsFor(id, date, { excludeEventId: eventId, time });
  const selectedWithClashes = selected.filter((member) => clashes(member.id).length > 0);
  const roleOf = (id: string) => value.find((member) => member.staffId === id)?.role ?? null;

  const toggle = (member: Staff) => {
    const active = ids.includes(member.id);
    if (!active && clashes(member.id).length > 0) return;
    onChange(
      active
        ? value.filter((item) => item.staffId !== member.id)
        : [...value, { staffId: member.id, role: member.role ?? null }],
    );
  };

  const setEventRole = (id: string, nextRole: string) =>
    onChange(value.map((member) => (member.staffId === id ? { ...member, role: nextRole } : member)));

  const resetAddForm = () => {
    setName("");
    setRole(QUICK_ROLES[0]);
    setPhone("");
    setPhoneError("");
  };

  const addCrew = async () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError("Enter a valid phone or WhatsApp number");
      return;
    }
    const normalizedPhone = phone.trim() ? `+${waNumber(phone)}` : null;
    const id = (await saveStaff.mutateAsync({
      name: cleanName,
      role,
      phone: normalizedPhone,
      active_status: true,
    })) as string | undefined;
    if (!id) return;
    const member: Staff = {
      id,
      user_id: null,
      name: cleanName,
      phone: normalizedPhone,
      role,
      active_status: true,
    };
    setCreatedCrew((current) => [...current.filter((item) => item.id !== id), member]);
    onChange([...value.filter((item) => item.staffId !== id), { staffId: id, role }]);
    setAddOpen(false);
    resetAddForm();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {allCrew.map((member) => {
          const active = ids.includes(member.id);
          const conflict = !active && clashes(member.id).length > 0;
          return (
            <Button
              key={member.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              disabled={conflict}
              onClick={() => toggle(member)}
              title={
                conflict
                  ? `Already booked for ${clashes(member.id)[0]?.projectName ?? "another event"}`
                  : `${active ? "Remove" : "Assign"} ${member.name}`
              }
              className={`min-h-9 max-w-full rounded-full px-3 text-xs ${
                active
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {active && <Check className="mr-1 h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{member.name}</span>
              {conflict && <AlertTriangle className="ml-1 h-3.5 w-3.5 shrink-0" />}
            </Button>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAddOpen(true)}
          className="min-h-9 rounded-full border-dashed border-primary/50 px-3 text-xs text-primary hover:bg-primary/10"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Crew
        </Button>
      </div>

      {allCrew.length === 0 && (
        <p className="text-xs text-muted-foreground">No crew registered yet. Add the first member above.</p>
      )}

      {selected.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {selected.map((member) => (
            <div key={member.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{member.name}</span>
              <Select
                value={roleOf(member.id) ?? member.role ?? undefined}
                onValueChange={(nextRole) => setEventRole(member.id, nextRole)}
              >
                <SelectTrigger className="h-8 w-36 shrink-0 text-xs sm:w-44" aria-label={`${member.name} role`}>
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  {CREW_ROLES.map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {item}
                    </SelectItem>
                  ))}
                  {roleOf(member.id) && !CREW_ROLES.includes(roleOf(member.id) as (typeof CREW_ROLES)[number]) && (
                    <SelectItem value={roleOf(member.id) as string} className="text-xs">
                      {prettyRole(roleOf(member.id))}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {selectedWithClashes.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Already booked for this date and time: {selectedWithClashes.map((member) => member.name).join(", ")}.
          </p>
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-w-[min(26rem,94vw)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Add new crew member
            </DialogTitle>
            <DialogDescription>The new member will be selected for this event automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-crew-name">Crew member name *</Label>
              <Input
                id="new-crew-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Rahul Freelance"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Primary role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUICK_ROLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-crew-phone">Phone / WhatsApp</Label>
              <Input
                id="new-crew-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneError("");
                }}
                placeholder="98765 43210"
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="button" onClick={addCrew} disabled={!name.trim() || saveStaff.isPending}>
              {saveStaff.isPending ? "Saving…" : "Save Crew"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}