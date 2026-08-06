import logoAsset from "@/assets/jog-media-logo.png.asset.json";
import { fmtDate } from "@/lib/format";

/** Premium document palette — black, charcoal, gold accents, crisp white. */
export const DOC = {
  ink: "#111111",
  charcoal: "#3A3A3A",
  gray: "#6B6B6B",
  gold: "#C9A227",
  goldSoft: "#F4EBD0",
  line: "#DFDAD0",
  paper: "#FFFFFF",
  soft: "#FAF8F4",
};

export function docLogoUrl(settings: any): string {
  return settings?.logo_url || logoAsset.url;
}

/** Branded top header: logo + business contact block on the left, document title on the right. */
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
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          background: DOC.ink,
          padding: "16px 20px",
          borderRadius: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <img
            src={docLogoUrl(settings)}
            alt={`${business} logo`}
            style={{
              width: 62,
              height: 62,
              objectFit: "contain",
              background: DOC.paper,
              borderRadius: 31,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: 2,
                color: DOC.paper,
                textTransform: "uppercase",
              }}
            >
              {business}
            </div>
            <div style={{ fontSize: 10, color: DOC.gold, letterSpacing: 1.4, textTransform: "uppercase" }}>
              Wedding Photography &amp; Cinematography
            </div>
            <div style={{ fontSize: 10, color: "#CFCAC2", marginTop: 3 }}>
              {settings?.address ?? "Kozhikode, Kerala, India"}
            </div>
            <div style={{ fontSize: 10, color: "#CFCAC2" }}>
              {[settings?.phone, settings?.email].filter(Boolean).join("  ·  ")}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: DOC.gold }}>
            {docTitle.toUpperCase()}
          </div>
          <div style={{ fontSize: 9.5, color: "#CFCAC2", marginTop: 3 }}>
            {docMeta ?? `Generated ${fmtDate(new Date().toISOString())}`}
          </div>
          {settings?.gstin ? (
            <div style={{ fontSize: 9.5, color: "#CFCAC2" }}>GSTIN {settings.gstin}</div>
          ) : null}
        </div>
      </div>
      <div style={{ height: 3, background: DOC.gold, marginTop: 3, borderRadius: 2 }} />
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
        <div style={{ color: DOC.charcoal, letterSpacing: 1 }}>
          Thank you for trusting us with your celebration.
        </div>
      </div>
    </div>
  );
}
