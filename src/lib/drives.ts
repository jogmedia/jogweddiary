/** Numbered studio hard disks used for raw data backups, plus an "other" option for free text. */
export const OTHER_DRIVE = "Other / Cloud Backup";

export const DRIVE_OPTIONS = [
  ...Array.from({ length: 10 }, (_, i) => `Hard Disk ${i + 1}`),
  OTHER_DRIVE,
];
