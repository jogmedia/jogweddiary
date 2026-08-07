import { fmtDate, inr } from "@/lib/format";
import { eventLabel, fmtTime, type EventLike } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";
import { DOC, PdfFooter, PdfHeader, PdfPage, PdfSection } from "@/components/PdfDoc";
import { AGREEMENT_TERMS } from "@/components/BookingAgreement";

type Ev = EventLike & { id: string };

/** Print/PDF-ready premium cream & royal-gold branded document. Inline styles only (html2canvas safe). */
export function WorkBrief({
  settings,
  project,
  events,
  crew,
  docTitle = "Booking Confirmation & Agreement",
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
    padding: "8px 9px",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: DOC.ink,
    background: DOC.goldSoft,
    border: `1px solid ${DOC.line}`,
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
    <PdfPage>
      <PdfHeader settings={settings} docTitle={docTitle} />

      {/* Client details */}
      <PdfSection title="Client Details" />
      <div
        style={{
          display: "flex",
          gap: 14,
          background: DOC.paper,
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
      <PdfSection title="Project & Event Schedule" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 22 }}>
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
          {sorted.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 ? DOC.paper : "transparent" }}>
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
          <PdfSection title="Package Details & Deliverables" />
          <div style={{ border: `1px solid ${DOC.line}`, background: DOC.paper, marginBottom: 22 }}>
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
            <th style={th}>Total Agreed Amount</th>
            <th style={th}>Received</th>
            <th style={th}>Balance Amount Payable</th>
            <th style={th}>Due Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, fontSize: 12, fontWeight: 700, background: DOC.paper }}>{inr(project.total_amount)}</td>
            <td style={{ ...td, fontSize: 12, fontWeight: 700, background: DOC.paper }}>{inr(received)}</td>
            <td style={{ ...td, fontSize: 12, fontWeight: 700, background: DOC.goldSoft }}>
              {inr(project.balance_due)}
            </td>
            <td style={{ ...td, fontSize: 11, background: DOC.paper }}>
              {project.payment_due_date ? fmtDate(project.payment_due_date) : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms */}
      <PdfSection title="Terms & Conditions, Payment Policy & Album Workflow" />
      <div style={{ border: `2px solid ${DOC.gold}`, background: DOC.paper, padding: 14, marginBottom: 22 }}>
        {AGREEMENT_TERMS.map((t, i) => {
          const [head, ...rest] = t.split(":");
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i === AGREEMENT_TERMS.length - 1 ? 0 : 8 }}>
              <span style={{ color: DOC.gold, fontWeight: 700, fontSize: 11 }}>•</span>
              <div style={{ fontSize: 10.5, lineHeight: 1.65, flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{head}:</span>
                {rest.join(":")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <PdfSection title="Notes & Instructions" />
      <div
        style={{
          border: `1px solid ${DOC.line}`,
          background: DOC.paper,
          padding: 12,
          fontSize: 10.5,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          minHeight: 56,
        }}
      >
        {project.notes || "— No special instructions recorded —"}
      </div>

      {/* Signatures */}
      <div style={{ display: "flex", gap: 30, marginTop: 22 }}>
        {["Client Signature", `For ${settings?.business_name ?? "JOG MEDIA"}`].map((s) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 42 }} />
            <div style={{ height: 1, background: DOC.ink }} />
            <div style={{ ...label, marginTop: 5 }}>{s}</div>
          </div>
        ))}
      </div>

      <PdfFooter settings={settings} />
    </PdfPage>
  );
}
