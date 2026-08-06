import { fmtDate, inr } from "@/lib/format";
import { eventLabel, fmtTime, type EventLike } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";
import { DOC, PdfFooter, PdfHeader, PdfSection } from "@/components/PdfDoc";

type Ev = EventLike & { id: string };

/** Print/PDF-ready premium branded document. Inline styles only (html2canvas safe). */
export function WorkBrief({
  settings,
  project,
  events,
  crew,
  docTitle = "Wedding Event Brief",
}: {
  settings: any;
  project: any;
  events: Ev[];
  crew: { name: string; role: string | null; eventId: string | null }[];
  docTitle?: string;
}) {
  const sorted = [...events].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
  const deliverables = toDeliverables(project.deliverables);
  const received = Number(project.total_amount ?? 0) - Number(project.balance_due ?? 0);

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "9px 8px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: DOC.paper,
    background: DOC.charcoal,
    borderRight: "1px solid #4F4F4F",
  };
  const td: React.CSSProperties = {
    padding: "9px 8px",
    fontSize: 10.5,
    color: DOC.ink,
    border: `1px solid ${DOC.line}`,
    verticalAlign: "top",
  };
  const label: React.CSSProperties = {
    fontSize: 9,
    color: DOC.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };

  return (
    <div
      style={{
        width: 720,
        background: DOC.paper,
        color: DOC.ink,
        fontFamily: "Inter, Arial, sans-serif",
        padding: 26,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <PdfHeader settings={settings} docTitle={docTitle} />

      {/* Client details */}
      <PdfSection title="Client Details" />
      <div
        style={{
          display: "flex",
          gap: 14,
          background: DOC.soft,
          border: `1px solid ${DOC.line}`,
          padding: 14,
          marginBottom: 22,
        }}
      >
        {[
          ["Client", project.clients?.name ?? "—"],
          ["Contact", project.clients?.phone ?? "—"],
          ["Project", project.project_name],
          ["Package", project.package_name ?? "—"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ flex: 1, minWidth: 0 }}>
            <div style={label}>{k}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{v as string}</div>
          </div>
        ))}
      </div>

      {/* Event schedule */}
      <PdfSection title="Project &amp; Event Schedule" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 22 }}>
        <thead>
          <tr>
            <th style={th}>Event</th>
            <th style={th}>Date</th>
            <th style={th}>Team Arrival</th>
            <th style={th}>Event Time</th>
            <th style={{ ...th, borderRight: "none" }}>Venue &amp; Location</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>
                No events scheduled yet.
              </td>
            </tr>
          )}
          {sorted.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 ? DOC.soft : DOC.paper }}>
              <td style={{ ...td, fontWeight: 600 }}>{eventLabel(e)}</td>
              <td style={td}>{fmtDate(e.event_date)}</td>
              <td style={td}>{fmtTime(e.arrival_time)}</td>
              <td style={td}>{fmtTime(e.muhurtham_time ?? e.event_time)}</td>
              <td style={td}>
                {e.location ?? "—"}
                {e.google_maps_link ? (
                  <div style={{ fontSize: 9.5, wordBreak: "break-all", marginTop: 2 }}>
                    <a href={e.google_maps_link} style={{ color: DOC.gold, textDecoration: "none" }}>
                      📍 Open in Google Maps
                    </a>
                    <div style={{ color: DOC.gray, fontSize: 8.5 }}>{e.google_maps_link}</div>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Crew */}
      <PdfSection title="Assigned Crew" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {crew.length === 0 && <div style={{ fontSize: 10.5, color: DOC.gray }}>No crew assigned yet.</div>}
        {crew.map((c, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${DOC.line}`,
              borderLeft: `3px solid ${DOC.gold}`,
              padding: "8px 12px",
              minWidth: 165,
              background: DOC.paper,
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 9.5, color: DOC.gray, marginTop: 1 }}>
              {c.role || "Crew"}
              {c.eventId
                ? ` · ${(() => {
                    const ev = sorted.find((e) => e.id === c.eventId);
                    return ev ? eventLabel(ev) : "Custom event";
                  })()}`
                : " · All events"}
            </div>
          </div>
        ))}
      </div>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <>
          <PdfSection title="Package Details &amp; Deliverables" />
          <div style={{ border: `1px solid ${DOC.line}`, marginBottom: 22 }}>
            {project.package_name ? (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "9px 12px",
                  background: DOC.goldSoft,
                  borderBottom: `1px solid ${DOC.line}`,
                  letterSpacing: 0.4,
                }}
              >
                {project.package_name}
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", padding: "10px 12px" }}>
              {deliverables.map((d: string, i: number) => (
                <div
                  key={i}
                  style={{ width: "50%", fontSize: 10.5, padding: "4px 0", color: DOC.ink, boxSizing: "border-box", paddingRight: 10 }}
                >
                  <span style={{ color: DOC.gold, fontWeight: 700 }}>✓</span> {d}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Payment summary */}
      <PdfSection title="Payment Summary" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 22 }}>
        <thead>
          <tr>
            <th style={th}>Total Package Value</th>
            <th style={th}>Received</th>
            <th style={th}>Balance Due</th>
            <th style={{ ...th, borderRight: "none" }}>Due Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, fontSize: 12, fontWeight: 700 }}>{inr(project.total_amount)}</td>
            <td style={{ ...td, fontSize: 12, fontWeight: 700 }}>{inr(received)}</td>
            <td style={{ ...td, fontSize: 12, fontWeight: 700, background: DOC.goldSoft }}>
              {inr(project.balance_due)}
            </td>
            <td style={{ ...td, fontSize: 11 }}>
              {project.payment_due_date ? fmtDate(project.payment_due_date) : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      <PdfSection title="Notes &amp; Instructions" />
      <div
        style={{
          border: `1px solid ${DOC.line}`,
          background: DOC.soft,
          padding: 12,
          fontSize: 10.5,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          minHeight: 56,
        }}
      >
        {project.notes || "— No special instructions recorded —"}
      </div>

      <PdfFooter settings={settings} />
    </div>
  );
}
