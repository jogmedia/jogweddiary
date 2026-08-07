import logoAsset from "@/assets/jog-media-logo.png.asset.json";
import { fmtDate } from "@/lib/format";

/** Premium cream + royal gold document palette (shared by every PDF export). */
export const DOC = {
  ink: "#1C1A16",
  charcoal: "#3A342B",
  gray: "#6B6257",
  gold: "#D4AF37",
  goldSoft: "#F3E7C4",
  line: "#E3D8BE",
  paper: "#FFFFFF",
  cream: "#FAF6EE",
  soft: "#FFFFFF",
};

export function docLogoUrl(settings: any): string {
  return settings?.logo_url || logoAsset.url;
}

/** Shared cream page shell with a royal-gold border frame. */
export function PdfPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 720,
        background: DOC.cream,
        color: DOC.ink,
        fontFamily: "Inter, Arial, sans-serif",
        padding: 8,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          border: `3px solid ${DOC.gold}`,
          background: DOC.cream,
          padding: 22,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Centered branded header: high-res logo, business line, document title badge. */
export function PdfHeader({
  settings,
  docTitle,
  docMeta,
}: {
  settings: any;
  docTitle: string;
  docMeta?: string;
}) {
  const business = settings?.business_name ?? "JOG MEDIA";
  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <img
        src={docLogoUrl(settings)}
        alt={`${business} logo`}
        style={{
          width: 96,
          height: 96,
          objectFit: "contain",
          background: DOC.paper,
          borderRadius: 48,
          border: `2px solid ${DOC.gold}`,
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
      <div style={{ fontSize: 10, color: DOC.gray, marginTop: 4 }}>
        {settings?.address ?? "Kozhikode, Kerala, India"}
        {settings?.phone ? ` · ${settings.phone}` : ""}
        {settings?.email ? ` · ${settings.email}` : ""}
        {settings?.gstin ? ` · GSTIN ${settings.gstin}` : ""}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <div
          style={{
            background: DOC.ink,
            color: DOC.goldSoft,
            padding: "8px 22px",
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: 2,
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >
          {docTitle.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: 9.5, color: DOC.gray, marginTop: 6 }}>
        {docMeta ?? `Dated ${fmtDate(new Date().toISOString())}`}
      </div>
      <div style={{ height: 3, background: DOC.gold, marginTop: 12, borderRadius: 2 }} />
    </div>
  );
}

/** Section heading with a clean gold-tipped dividing line. */
export function PdfSection({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: DOC.ink,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 5 }}>
        <div style={{ width: 46, height: 2, background: DOC.gold }} />
        <div style={{ flex: 1, height: 2, background: DOC.line }} />
      </div>
    </div>
  );
}

export function PdfFooter({ settings }: { settings: any }) {
  const business = settings?.business_name ?? "JOG MEDIA";
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ height: 1, background: DOC.line, marginBottom: 10 }} />
      <div style={{ fontSize: 9.5, color: DOC.gray, textAlign: "center", lineHeight: 1.7 }}>
        {business} · {settings?.address ?? "Kozhikode, Kerala, India"}
        {settings?.phone ? ` · ${settings.phone}` : ""}
        <div style={{ color: DOC.ink, letterSpacing: 1 }}>
          Thank you for trusting us with your celebration.
        </div>
      </div>
    </div>
  );
}
