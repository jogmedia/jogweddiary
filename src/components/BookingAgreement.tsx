import { fmtDate, inr } from "@/lib/format";
import { eventLabel, fmtTime, type EventLike } from "@/lib/whatsapp";
import { toDeliverables } from "@/lib/packages";
import { docLogoUrl } from "@/components/PdfDoc";

/** Premium cream + royal gold palette for the booking agreement. */
const A = {
  cream: "#FAF6EE",
  paper: "#FFFFFF",
  gold: "#D4AF37",
  goldSoft: "#F3E7C4",
  ink: "#1C1A16",
  gray: "#6B6257",
  line: "#E3D8BE",
};

export const AGREEMENT_TERMS: string[] = [
  "Booking Confirmation: Event dates are officially reserved upon receipt of the advance payment.",
  "Wedding Day Payment Policy: 90% of the total balance amount must be strictly cleared on the Wedding Day upon completion of the shoot.",
  "Travel & Stay Policy: Package price does not include travel and accommodation. Outstation travel expenses and hotel stays for the crew must be arranged or borne by the client.",
  "Raw Photo Delivery: Drive link with raw soft copy photos will be provided within 1 week after the wedding for photo selection (selection to be done by client).",
  "Layout & Color Grading: Once photo selection is received from the client, complete album layout design and color grading will be delivered within 90 days.",
  "Client Review Steps: Layout PDF proof will be shared first for layout changes, followed by color-graded proof for final review.",
  "Final Printing & Delivery: Printing will strictly begin after receiving explicit client approval. Printed album will be dispatched via courier within 10 days of printing approval.",
];

type Ev = EventLike & { id: string };

/** Print/PDF-ready Booking Confirmation & Agreement. Inline styles only (html2canvas safe). */
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
    fontSize: 9,
    color: A.gray,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  };
  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 9px",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: A.ink,
    background: A.goldSoft,
    border: `1px solid ${A.line}`,
  };
  const td: React.CSSProperties = {
    padding: "8px 9px",
    fontSize: 10.5,
    color: A.ink,
    border: `1px solid ${A.line}`,
    verticalAlign: "top",
  };

  const Section = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", color: A.ink }}>
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 5 }}>
        <div style={{ width: 46, height: 2, background: A.gold }} />
        <div style={{ flex: 1, height: 2, background: A.line }} />
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: 720,
        background: A.cream,
        color: A.ink,
        fontFamily: "Inter, Arial, sans-serif",
        padding: 26,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img
          src={docLogoUrl(settings)}
          alt={`${business} logo`}
          style={{
            width: 96,
            height: 96,
            objectFit: "contain",
            background: A.paper,
            borderRadius: 48,
            border: `2px solid ${A.gold}`,
          }}
        />
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            marginTop: 10,
          }}
        >
          JOG MEDIA - WEDDING PHOTOGRAPHY
        </div>
        <div style={{ fontSize: 10, color: A.gray, marginTop: 4 }}>
          {settings?.address ?? "Kozhikode, Kerala, India"}
          {settings?.phone ? ` · ${settings.phone}` : ""}
          {settings?.email ? ` · ${settings.email}` : ""}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <div
            style={{
              background: A.ink,
              color: A.goldSoft,
              padding: "8px 22px",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: 2,
              borderRadius: 3,
              whiteSpace: "nowrap",
            }}
          >
            BOOKING CONFIRMATION &amp; AGREEMENT
          </div>
        </div>
        <div style={{ fontSize: 9.5, color: A.gray, marginTop: 6 }}>
          Dated {fmtDate(new Date().toISOString())}
        </div>
        <div style={{ height: 3, background: A.gold, marginTop: 12, borderRadius: 2 }} />
      </div>

      {/* Client & project */}
      <Section title="Client & Project Details" />
      <div
        style={{
          display: "flex",
          gap: 14,
          background: A.paper,
          border: `1px solid ${A.line}`,
          padding: 14,
          marginBottom: 20,
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
            <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{v as string}</div>
          </div>
        ))}
      </div>

      {/* Events */}
      {sorted.length > 0 && (
        <>
          <Section title="Confirmed Event Schedule" />
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
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
                <tr key={e.id} style={{ background: i % 2 ? A.paper : "transparent" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{eventLabel(e)}</td>
                  <td style={td}>{fmtDate(e.event_date)}</td>
                  <td style={td}>{fmtTime(e.muhurtham_time ?? e.event_time)}</td>
                  <td style={td}>{e.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <>
          <Section title="Package Details & Deliverables" />
          <div style={{ border: `1px solid ${A.line}`, background: A.paper, marginBottom: 20 }}>
            {project?.package_name ? (
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "9px 12px",
                  background: A.goldSoft,
                  borderBottom: `1px solid ${A.line}`,
                }}
              >
                {project.package_name}
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", padding: "10px 12px" }}>
              {deliverables.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: "50%",
                    fontSize: 10.5,
                    padding: "4px 0",
                    paddingRight: 10,
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ color: A.gold, fontWeight: 700 }}>✓</span> {d}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Financials */}
      <Section title="Payment Summary" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={th}>Total Agreed Amount</th>
            <th style={th}>Booking Advance Received</th>
            <th style={th}>Balance Amount Payable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...td, fontSize: 13, fontWeight: 700, background: A.paper }}>{inr(total)}</td>
            <td style={{ ...td, fontSize: 13, fontWeight: 700, background: A.paper }}>{inr(received)}</td>
            <td style={{ ...td, fontSize: 13, fontWeight: 700, background: A.goldSoft }}>{inr(balance)}</td>
          </tr>
        </tbody>
      </table>

      {/* Terms */}
      <Section title="Terms & Conditions, Payment Policy & Album Workflow" />
      <div
        style={{
          border: `2px solid ${A.gold}`,
          background: A.paper,
          padding: 14,
          marginBottom: 22,
        }}
      >
        {AGREEMENT_TERMS.map((t, i) => {
          const [head, ...rest] = t.split(":");
          return (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: i === AGREEMENT_TERMS.length - 1 ? 0 : 8 }}>
              <span style={{ color: A.gold, fontWeight: 700, fontSize: 11 }}>•</span>
              <div style={{ fontSize: 10.5, lineHeight: 1.65, flex: 1 }}>
                <span style={{ fontWeight: 700 }}>{head}:</span>
                {rest.join(":")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Signatures */}
      <div style={{ display: "flex", gap: 30, marginBottom: 18 }}>
        {["Client Signature", `For ${business}`].map((s) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 42 }} />
            <div style={{ height: 1, background: A.ink }} />
            <div style={{ ...label, marginTop: 5 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: A.line, marginBottom: 10 }} />
      <div style={{ fontSize: 9.5, color: A.gray, textAlign: "center", lineHeight: 1.7 }}>
        {business} · {settings?.address ?? "Kozhikode, Kerala, India"}
        {settings?.phone ? ` · ${settings.phone}` : ""}
        <div style={{ color: A.ink, letterSpacing: 1 }}>
          Thank you for trusting us with your celebration.
        </div>
      </div>
    </div>
  );
}
