/** Predefined crew duties used across crew assignment forms. */
export const CREW_ROLES = [
  "Lead Photographer",
  "Candid Photographer",
  "Traditional Photographer",
  "Lead Videographer",
  "Candid Videographer",
  "Traditional Videographer",
  "Drone Operator",
  "Light Boy / Assistant",
  "Album Designer / Editor",
  "Video Editor",
] as const;

export const crewRoleOptions = CREW_ROLES.map((v) => ({ value: v, label: v }));
