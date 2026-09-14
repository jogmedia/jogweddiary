/** Numbered studio hard disks used for raw data backups, plus an "other" option for free text. */
export const OTHER_DRIVE = "Other / Cloud Backup";

export const DRIVE_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => `Hard Disk ${i + 1}`),
  OTHER_DRIVE,
];

export type CloudBackupDestination = "jog_media" | "client_drive" | "none";

export const CLOUD_BACKUP_OPTIONS: { value: CloudBackupDestination; label: string }[] = [
  { value: "jog_media", label: "Jog Media Drive" },
  { value: "client_drive", label: "Client's Google Drive" },
  { value: "none", label: "None / Not Uploaded" },
];

export const cloudBackupLabel = (value?: string | null) =>
  CLOUD_BACKUP_OPTIONS.find((o) => o.value === value)?.label ?? "None / Not Uploaded";

export type BackupDisks = {
  primary_hard_disk?: string | null;
  secondary_hard_disk?: string | null;
  /** legacy single-disk field, treated as the primary disk */
  backup_drive?: string | null;
  backup_folder?: string | null;
  cloud_backup_destination?: string | null;
};

const clean = (v?: string | null) => (v ?? "").trim();

export const primaryDisk = (p?: BackupDisks | null) =>
  clean(p?.primary_hard_disk) || clean(p?.backup_drive);
export const secondaryDisk = (p?: BackupDisks | null) => clean(p?.secondary_hard_disk);
export const backupFolder = (p?: BackupDisks | null) => clean(p?.backup_folder);
export const cloudBackup = (p?: BackupDisks | null) =>
  (clean(p?.cloud_backup_destination) as CloudBackupDestination) || "none";

export type BackupState = "triple" | "dual" | "partial" | "none";

/** Triple = both disks + cloud drive, dual = both disks only, partial = one disk, none = nothing. */
export const backupState = (
  primary: string,
  secondary: string,
  cloud: CloudBackupDestination = "none",
): BackupState => {
  const hasBothDisks = Boolean(primary) && Boolean(secondary);
  const hasCloud = cloud === "jog_media" || cloud === "client_drive";
  if (hasBothDisks && hasCloud) return "triple";
  if (hasBothDisks) return "dual";
  if (primary || secondary) return "partial";
  return "none";
};

export const BACKUP_BADGE: Record<BackupState, { label: string; className: string }> = {
  triple: {
    label: "🛡️ TRIPLE BACKED UP (2 Disks + Drive)",
    className: "border-success/30 bg-success/10 text-success",
  },
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
