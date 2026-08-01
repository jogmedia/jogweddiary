import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "email" | "tel" | "time" | "url";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  hint?: string;
  /** Return an error message string when invalid, otherwise null/undefined. */
  validate?: (value: any, values: Record<string, any>) => string | null | undefined;
  /** Transform the value right before submit (e.g. phone normalisation). */
  transform?: (value: any) => any;
};


export function RecordDialog({
  title,
  fields,
  initial,
  trigger,
  submitLabel = "Save",
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, any>;
  trigger?: ReactNode;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<unknown> | unknown;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  const [values, setValues] = useState<Record<string, any>>(initial ?? {});
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(initial ?? {});
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (name: string, v: any) => {
    setValues((p) => ({ ...p, [name]: v }));
    setErrors((p) => (p[name] ? { ...p, [name]: "" } : p));
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.required && (v === undefined || v === "" || v === null)) {
        next[f.name] = `${f.label} is required`;
        continue;
      }
      const msg = f.validate?.(v, values);
      if (msg) next[f.name] = msg;
    }
    setErrors(next);
    if (Object.keys(next).some((k) => next[k])) return;

    setBusy(true);
    try {
      const cleaned: Record<string, any> = { ...values };
      fields.forEach((f) => {
        if (f.transform) cleaned[f.name] = f.transform(cleaned[f.name]);
        if (f.type === "number") cleaned[f.name] = Number(cleaned[f.name] ?? 0);
        if (typeof cleaned[f.name] === "string") cleaned[f.name] = cleaned[f.name].trim();
        if (cleaned[f.name] === "") cleaned[f.name] = null;
      });
      await onSubmit(cleaned);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.name} className="mb-1.5 block text-xs font-medium">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={values[f.name] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : f.type === "select" ? (
                <Select value={values[f.name] ?? ""} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder={f.placeholder ?? "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type === "url" ? "url" : (f.type ?? "text")}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={values[f.name] ?? ""}
                  placeholder={f.placeholder}
                  aria-invalid={!!errors[f.name]}
                  className={errors[f.name] ? "border-destructive" : undefined}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
              {errors[f.name] ? (
                <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>
              ) : f.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
              ) : null}
            </div>

          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
