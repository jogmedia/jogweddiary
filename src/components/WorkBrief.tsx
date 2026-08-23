import { fmtDate, inr } from "@/lib/format";
import { eventLabel, fmtTime, type EventLike } from "@/lib/whatsapp";
import { DEFAULT_DELIVERABLES, toDeliverables } from "@/lib/packages";
import { DOC, PdfFooter, PdfHeader, PdfPage, PdfSection } from "@/components/PdfDoc";
import { AGREEMENT_TERMS } from "@/components/BookingAgreement";

type Ev = EventLike & { id: string };

/**
 * Print/PDF-ready premium cream & royal-gold branded document, locked to ONE A4 page.
 * Inline styles only (html2canvas safe).
 */
export function WorkBrief({
  settings,
  project,
  events,
  docTitle = "Booking Confirmation & Agreement",
}: {
  settings: any;
  project: any;
  events: Ev[];
  crew?: { name: string; role: string | null; eventId: string | null }[];
  docTitle?: string;
}) {
  const sorted = [...events].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
  const stored = toDeliverables(project.deliverables);
  const deliverables = stored.length ? stored : DEFAULT_DELIVERABLES;
  const received = Number(project.total_amount ?? 0) - Number(project.balance_due ?? 0);

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "6px 8px",
    fontSize: 8.6,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: DOC.darkGold,
    background: DOC.tint,
    border: `1px solid ${DOC.line}`,
  };
  const td: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 8.8,
    color: DOC.ink,
    border: `1px solid ${DOC.line}`,
    verticalAlign: "top",
  };
  const label: React.CSSProperties = {
    fontSize: 8,
    color: DOC.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };

  return (
    <PdfPage>
      <PdfHeader settings={settings} docTitle={docTitle} />

      {/* 1. Client details */}
      <div className="pdf-avoid-break">
        <PdfSection title="Client Details" />
        <div
          style={{
            display: "flex",
            gap: 12,
            background: DOC.paper,
            border: `1px solid ${DOC.line}`,
            padding: "8px 10px",
            marginBottom: 14,
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
              <div style={{ fontSize: 9.6, fontWeight: 600, marginTop: 2 }}>{v as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Event schedule */}
      <div className="pdf-avoid-break">
        <PdfSection title="Project & Event Schedule" />
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
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
                <td style={td}>{e.location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2b. Venue & travel navigation */}
      <div className="pdf-avoid-break">
        <PdfSection title="Venue & Travel Details" />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            background: DOC.paper,
            border: `1px solid ${DOC.line}`,
            padding: "8px 10px",
            marginBottom: 14,
          }}
        >
          {[
            ["Main Venue", project.venue ?? "—"],
            ["Place / District", project.place_district ?? "—"],
            ["Nearest Railway Station", project.nearest_railway_station ?? "—"],
            [
              "Venue Contact",
              [project.venue_contact_name, project.venue_contact_phone].filter(Boolean).join(" - ") ||
                "—",
            ],
          ].map(([k, v]) => (
            <div key={k as string} style={{ flex: 1, minWidth: 120 }}>
              <div style={label}>{k}</div>
              <div style={{ fontSize: 9.2, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>
                {v as string}
              </div>
            </div>
          ))}
          {project.google_maps_link ? (
            <div style={{ width: "100%" }}>
              <div style={label}>Google Maps</div>
              <div style={{ fontSize: 8.4, marginTop: 2, wordBreak: "break-all", color: DOC.darkGold }}>
                {project.google_maps_link}
              </div>
            </div>
          ) : null}
        </div>
      </div>



      {/* 3. Deliverables */}
      {true && (
        <div className="pdf-avoid-break">
          <PdfSection title="Package Details & Deliverables" />
          <div style={{ border: `1px solid ${DOC.line}`, background: DOC.paper, marginBottom: 14 }}>
            {project.package_name ? (
              <div
                style={{
                  fontSize: 9.6,
                  fontWeight: 700,
                  color: DOC.darkGold,
                  padding: "6px 10px",
                  background: DOC.tint,
                  borderBottom: `1px solid ${DOC.line}`,
                }}
              >
                Selected Package: {project.package_name} ({inr(project.total_amount)})
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", padding: "7px 10px" }}>
              {deliverables.map((d: string, i: number) => (
                <div
                  key={i}
                  style={{
                    width: "50%",
                    fontSize: 8.8,
                    lineHeight: 1.45,
                    padding: "2px 10px 2px 0",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ color: DOC.gold, fontWeight: 700 }}>✓</span> {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Payment breakdown */}
      <div className="pdf-avoid-break">
        <PdfSection title="Payment Breakdown" />
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <thead>
            <tr>
              <th style={th}>Total Agreed Amount</th>
              <th style={th}>Booking Advance Received</th>
              <th style={th}>Balance Amount Payable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...td, fontSize: 11.5, fontWeight: 700, background: DOC.paper }}>
                {inr(project.total_amount)}
              </td>
              <td style={{ ...td, fontSize: 11.5, fontWeight: 700, color: DOC.green, background: "#F1F8F3" }}>
                {inr(received)}
              </td>
              <td
                style={{
                  ...td,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: Number(project.balance_due) > 0 ? DOC.red : DOC.green,
                  background: Number(project.balance_due) > 0 ? "#FBF1EE" : "#F1F8F3",
                }}
              >
                {inr(project.balance_due)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Terms */}
      <div className="pdf-avoid-break">
        <PdfSection title="Terms & Conditions, Payment Policy & Album Workflow" />
        <div style={{ border: `1.5px solid ${DOC.gold}`, background: DOC.tint, padding: "10px 12px" }}>
          {AGREEMENT_TERMS.map((t, i) => {
            const [head, ...rest] = t.split(":");
            return (
              <div
                key={i}
                style={{ display: "flex", gap: 7, marginBottom: i === AGREEMENT_TERMS.length - 1 ? 0 : 5 }}
              >
                <span style={{ color: DOC.gold, fontWeight: 700, fontSize: 9 }}>•</span>
                <div style={{ fontSize: 8.2, lineHeight: 1.45, flex: 1 }}>
                  <span style={{ fontWeight: 700, color: DOC.darkGold }}>{head}:</span>
                  {rest.join(":")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PdfFooter settings={settings} />
    </PdfPage>
  );
}
