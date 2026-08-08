import { fmtDate, inr, waNumber } from "@/lib/format";
import { eventLabel, fmtTime, type EventLike } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";
import { DOC, PdfFooter, PdfHeader, PdfPage, PdfSection } from "@/components/PdfDoc";

export const AGREEMENT_TERMS: string[] = [
  "Booking Confirmation: Event dates are officially reserved upon receipt of the advance payment.",
  "Wedding Day Payment Policy: 90% of the total balance amount must be strictly cleared on the Wedding Day upon completion of the shoot.",
  "Travel & Stay Policy: Package price does not include travel and accommodation. Outstation travel expenses and hotel stays for the crew must be arranged or borne by the client.",
  "Raw Photo Delivery: Drive link with raw soft copy photos will be provided within 1 week after the wedding for photo selection (selection to be done by client).",
  "Layout & Color Grading (90 Days): Once photo selection is received from the client, complete album layout design and color grading will be delivered within 90 days.",
  "Client Review Steps: Layout PDF proof will be shared first for layout changes, followed by color-graded proof for final review.",
  "Final Printing & Delivery (10 Days): Printing will strictly begin after receiving explicit client approval. Printed album will be dispatched via courier within 10 days of printing approval.",
];

type Ev = EventLike & { id: string };

/** WhatsApp message used when sharing the agreement PDF. */
export function agreementShareText(clientName?: string | null, business = "JOG MEDIA") {
  return `Hi ${clientName?.trim() || "there"}, Here is your Booking Confirmation & Agreement from ${business}.`;
}

export function agreementWaLink(phone?: string | null, clientName?: string | null, business = "JOG MEDIA") {
  const num = waNumber(phone);
  const text = encodeURIComponent(agreementShareText(clientName, business));
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Print/PDF-ready luxury Booking Confirmation & Agreement (single A4 page, auto multi-page fallback). */
export function BookingAgreement({
  settings,
  project,
  events = [],
  advance,
}: {
  settings: any;
  project: any;
  events?: Ev[];
  advance: number;
}) {
  const business = settings?.business_name ?? "JOG MEDIA";
  const total = Number(project?.total_amount ?? 0);
  const received = Number(advance ?? 0);
  const balance = Math.max(0, total - received);
  const deliverables = toDeliverables(project?.deliverables);
  const sorted = [...events].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));

  const label: React.CSSProperties = {
    fontSize: 8,
    color: DOC.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };
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

  return (
    <PdfPage>
      <PdfHeader settings={settings} docTitle="Booking Confirmation & Agreement" />

      {/* Client & project */}
      <div className="pdf-avoid-break">
        <PdfSection title="Client & Project Details" />
        <div
          style={{
            display: "flex",
            gap: 12,
            background: DOC.paper,
            border: `1px solid ${DOC.line}`,
            padding: "8px 10px",
            marginBottom: 12,
          }}
        >
          {[
            ["Client", project?.clients?.name ?? "—"],
            ["Contact", project?.clients?.phone ?? "—"],
            ["Project", project?.project_name ?? "—"],
            ["Package", project?.package_name ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string} style={{ flex: 1, minWidth: 0 }}>
              <div style={label}>{k}</div>
              <div style={{ fontSize: 9.6, fontWeight: 600, marginTop: 2 }}>{v as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      {sorted.length > 0 && (
        <div className="pdf-avoid-break">
          <PdfSection title="Project & Event Schedule" />
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={th}>Event</th>
                <th style={th}>Date</th>
                <th style={th}>Time</th>
                <th style={th}>Venue</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 ? DOC.paper : "transparent" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{eventLabel(e)}</td>
                  <td style={td}>{fmtDate(e.event_date)}</td>
                  <td style={td}>{fmtTime(e.muhurtham_time ?? e.event_time)}</td>
                  <td style={td}>{e.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div className="pdf-avoid-break">
          <PdfSection title="Package Details & Deliverables" />
          <div style={{ border: `1px solid ${DOC.line}`, background: DOC.paper, marginBottom: 12 }}>
            {project?.package_name ? (
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
                {project.package_name}
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", padding: "7px 10px" }}>
              {deliverables.map((d, i) => (
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

      {/* Financials */}
      <div className="pdf-avoid-break">
        <PdfSection title="Payment Breakdown" />
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={th}>Total Agreed Amount</th>
              <th style={th}>Booking Advance Received</th>
              <th style={th}>Balance Amount Payable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...td, fontSize: 11.5, fontWeight: 700, background: DOC.paper }}>{inr(total)}</td>
              <td
                style={{
                  ...td,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: DOC.green,
                  background: "#F1F8F3",
                }}
              >
                {inr(received)}
              </td>
              <td
                style={{
                  ...td,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: balance > 0 ? DOC.red : DOC.green,
                  background: balance > 0 ? "#FBF1EE" : "#F1F8F3",
                }}
              >
                {inr(balance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Terms */}
      <div className="pdf-avoid-break">
        <PdfSection title="Terms & Conditions, Payment Policy & Album Workflow" />
        <div
          style={{
            border: `1.5px solid ${DOC.gold}`,
            background: DOC.tint,
            padding: "10px 12px",
          }}
        >
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
