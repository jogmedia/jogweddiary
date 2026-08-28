/** Numbered studio hard disks used for raw data backups, plus an "other" option for free text. */
export const OTHER_DRIVE = "Other / Cloud Backup";

export const DRIVE_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => `Hard Disk ${i + 1}`),
  OTHER_DRIVE,
];

export type BackupDisks = {
  primary_hard_disk?: string | null;
  secondary_hard_disk?: string | null;
  /** legacy single-disk field, treated as the primary disk */
  backup_drive?: string | null;
  backup_folder?: string | null;
};

const clean = (v?: string | null) => (v ?? "").trim();

export const primaryDisk = (p?: BackupDisks | null) =>
  clean(p?.primary_hard_disk) || clean(p?.backup_drive);
export const secondaryDisk = (p?: BackupDisks | null) => clean(p?.secondary_hard_disk);
export const backupFolder = (p?: BackupDisks | null) => clean(p?.backup_folder);

export type BackupState = "dual" | "partial" | "none";

/** Dual = both disks assigned, partial = only one, none = nothing assigned. */
export const backupState = (primary: string, secondary: string): BackupState =>
  primary && secondary ? "dual" : primary || secondary ? "partial" : "none";

export const BACKUP_BADGE: Record<BackupState, { label: string; className: string }> = {
  dual: {
    label: "Dual backed up",
    className: "border-success/30 bg-success/10 text-success",
  },
  partial: {
    label: "Partially backed up",
    className: "border-warning/40 bg-warning/10 text-warning-foreground",
  },
  none: {
    label: "Not backed up",
    className: "border-border bg-muted text-muted-foreground",
  },
};

/** WhatsApp backup record template shared by all backup screens. */
export const buildBackupRecordMessage = (o: {
  projectName: string;
  primary: string;
  secondary: string;
  folder: string;
  date: string;
  businessName?: string;
}) =>
  [
    `📸 *BACKUP RECORD - ${(o.businessName ?? "JOG MEDIA").toUpperCase()}*`,
    "",
    `*Project:* ${o.projectName}`,
    `*Primary Disk:* ${o.primary || "Not assigned"}`,
    `*Secondary Backup Disk:* ${o.secondary || "Not assigned"}`,
    `*Folder Name:* ${o.folder || "Not assigned"}`,
    `*Date Backed Up:* ${o.date}`,
  ].join("\n");
