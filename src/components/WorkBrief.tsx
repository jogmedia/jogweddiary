import { fmtDate, inr } from "@/lib/format";
import { eventLabel, eventMeta, fmtTime, type EventLike } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";

const BRAND = "#A56A2A";
const TEXT = "#2D241D";
const MUTED = "#7A6E63";
const BORDER = "#E7DFD5";
const SOFT = "#F7F3EC";

type Ev = EventLike & { id: string };

/** Print/PDF-ready branded work brief. Inline styles only (html2canvas safe). */
export function WorkBrief({
  settings,
  project,
  events,
  crew,
}: {
  settings: any;
  project: any;
  events: Ev[];
  crew: { name: string; role: string | null; eventId: string | null }[];
}) {
  const business = settings?.business_name ?? "Jog Media";
  const sorted = [...events].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 6px",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#FFFFFF",
    background: BRAND,
  };
  const td: React.CSSProperties = {
    padding: "8px 6px",
    fontSize: 11,
    color: TEXT,
    borderBottom: `1px solid ${BORDER}`,
    verticalAlign: "top",
  };

  return (
    <div
      style={{
        width: 720,
        background: "#FFFFFF",
        color: TEXT,
        fontFamily: "Inter, Arial, sans-serif",
        padding: 28,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          borderBottom: `3px solid ${BRAND}`,
          paddingBottom: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              width: 54,
              height: 54,
              flexShrink: 0,
              borderRadius: 12,
              background: SOFT,
              border: `1px solid ${BORDER}`,
              color: BRAND,
              fontSize: 18,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            JM
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.3 }}>{business}</div>
            <div style={{ fontSize: 11, color: MUTED }}>
              {settings?.address ?? "Kozhikode, Kerala, India"}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>
              {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            flex: "0 0 auto",
            flexShrink: 0,
            whiteSpace: "nowrap",
            minWidth: 200,
            paddingRight: 2,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: BRAND, letterSpacing: 0.6 }}>
            WEDDING EVENT BRIEF
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>Generated {fmtDate(new Date().toISOString())}</div>
        </div>
      </div>


      {/* Client card */}
      <div
        style={{
          display: "flex",
          gap: 16,
          background: SOFT,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: 14,
          marginBottom: 18,
        }}
      >
        {[
          ["Client", project.clients?.name ?? "—"],
          ["Contact", project.clients?.phone ?? "—"],
          ["Project", project.project_name],
          ["Package", project.package_name ?? "—"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{v as string}</div>
          </div>
        ))}
      </div>

      {/* Events */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: BRAND }}>Event Schedule</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={th}>Event</th>
            <th style={th}>Date</th>
            <th style={th}>Team Arrival</th>
            <th style={th}>Event Time</th>
            <th style={th}>Venue &amp; Location</th>
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
          {sorted.map((e) => (
            <tr key={e.id}>
              <td style={{ ...td, fontWeight: 600 }}>{eventLabel(e)}</td>
              <td style={td}>{fmtDate(e.event_date)}</td>
              <td style={td}>{fmtTime(e.arrival_time)}</td>
              <td style={td}>{fmtTime(e.muhurtham_time ?? e.event_time)}</td>
              <td style={td}>
                {e.location ?? "—"}
                {e.google_maps_link ? (
                  <div style={{ fontSize: 10, wordBreak: "break-all" }}>
                    <a
                      href={e.google_maps_link}
                      style={{ color: BRAND, textDecoration: "underline" }}
                    >
                      📍 Open in Google Maps
                    </a>
                    <div style={{ color: MUTED, fontSize: 9 }}>{e.google_maps_link}</div>
                  </div>
                ) : null}
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* Crew */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: BRAND }}>Assigned Crew</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {crew.length === 0 && <div style={{ fontSize: 11, color: MUTED }}>No crew assigned yet.</div>}
        {crew.map((c, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 10px",
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {c.role || "Crew"}
              {c.eventId
                ? ` · ${(() => { const ev = sorted.find((e) => e.id === c.eventId); return ev ? eventLabel(ev) : "Custom event"; })()}`
                : " · All events"}
            </div>
          </div>
        ))}
      </div>

      {/* Package details & deliverables */}
      {toDeliverables(project.deliverables).length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: BRAND }}>
            PACKAGE DETAILS &amp; DELIVERABLES
          </div>
          <div
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              background: SOFT,
            }}
          >
            {project.package_name ? (
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{project.package_name}</div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {toDeliverables(project.deliverables).map((d: string, i: number) => (
                <div key={i} style={{ width: "50%", fontSize: 11, padding: "3px 0", color: TEXT }}>
                  • {d}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Payment summary */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: BRAND }}>Payment Summary</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          ["Total", inr(project.total_amount)],
          ["Advance / Received", inr(Number(project.total_amount ?? 0) - Number(project.balance_due ?? 0))],
          ["Balance", inr(project.balance_due)],
          ["Due date", project.payment_due_date ? fmtDate(project.payment_due_date) : "—"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase" }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{v as string}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: BRAND }}>Notes &amp; Instructions</div>
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: 12,
          fontSize: 11,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          minHeight: 60,
        }}
      >
        {project.notes || "— No special instructions recorded —"}
      </div>

      <div style={{ marginTop: 24, fontSize: 10, color: MUTED, textAlign: "center" }}>
        {business} · {settings?.phone ?? ""} · Thank you for trusting us with your celebration.
      </div>
    </div>
  );
}
