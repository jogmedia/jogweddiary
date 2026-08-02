import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DRIVE_OPTIONS, OTHER_DRIVE } from "@/lib/drives";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
};

/** "Select Hard Disk" dropdown (Hard Disk 1-10) with a free-text field for other/cloud backups. */
export function DrivePicker({ value, onChange, className, label = "Select Hard Disk" }: Props) {
  const isPreset = DRIVE_OPTIONS.includes(value) && value !== OTHER_DRIVE;
  const isOther = value.length > 0 && !isPreset;

  return (
    <div className={className}>
      <p className="text-xs font-medium">{label}</p>
      <Select
        value={isOther ? OTHER_DRIVE : value}
        onValueChange={(v) => onChange(v === OTHER_DRIVE ? OTHER_DRIVE : v)}
      >
        <SelectTrigger className="mt-1 h-9 text-xs">
          <SelectValue placeholder="Select Hard Disk" />
        </SelectTrigger>
        <SelectContent>
          {DRIVE_OPTIONS.map((o) => (
            <SelectItem key={o} value={o} className="text-xs">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          className="mt-2 h-9 text-xs"
          placeholder="Enter storage location (e.g. Google Drive, Studio NAS)"
          value={value === OTHER_DRIVE ? "" : value}
          onChange={(e) => onChange(e.target.value || OTHER_DRIVE)}
        />
      )}
    </div>
  );
}
