const norm = (v: unknown) => String(v ?? "").toLowerCase();
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Match projects by client name, project title, venue/place, or mobile (2+ chars). */
export function searchProjects<P extends Record<string, any>>(
  projects: P[],
  events: { project_id: string; location?: string | null }[],
  query: string,
  limit = 8,
): P[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const qDigits = digits(q);
  const places = new Map<string, string>();
  events.forEach((e) => places.set(e.project_id, `${places.get(e.project_id) ?? ""} ${norm(e.location)}`));
  return projects
    .filter((p) => {
      const c = p.clients ?? {};
      const text = [c.name, p.project_name, p.venue, p.place_district, places.get(p.id)].map(norm).join(" ");
      if (text.includes(q)) return true;
      if (qDigits.length >= 2) {
        return [c.phone, c.whatsapp, p.venue_contact_phone].some((ph) => digits(ph).includes(qDigits));
      }
      return false;
    })
    .slice(0, limit);
}
