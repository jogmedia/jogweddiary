import logoAsset from "@/assets/jog-media-logo.png.asset.json";
import { fmtDate } from "@/lib/format";

/** Luxury cream + royal gold document palette (shared by every PDF export). */
export const DOC = {
  ink: "#1F1A12",
  charcoal: "#3A342B",
  gray: "#6B6257",
  gold: "#D4AF37",
  darkGold: "#8B6B23",
  headGold: "#B8860B",
  goldSoft: "#F8F1E3",
  tint: "#F8F1E3",
  line: "#E2D2B4",
  paper: "#FFFFFF",
  cream: "#FAF6EE",
  soft: "#FFFFFF",
  green: "#1B7F4B",
  red: "#B4442C",
};

/** Page geometry: 720px maps to A4 width minus 6mm margins. */
export const PDF_WIDTH = 720;
export const PDF_MIN_HEIGHT = 1036;

export function docLogoUrl(settings: any): string {
  return settings?.logo_url || logoAsset.url;
}

/** Shared cream page shell with a royal-gold double border frame, locked to one A4 page. */
export function PdfPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: PDF_WIDTH,
        background: DOC.cream,
        color: DOC.ink,
        fontFamily: "Inter, Arial, sans-serif",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          border: `3px solid ${DOC.gold}`,
          outline: `1px solid ${DOC.gold}`,
          outlineOffset: 3,
          background: DOC.cream,
          padding: "20px 24px",
          minHeight: PDF_MIN_HEIGHT,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Centered branded header: logo, brand subtitle, gold-tinted document title box. */
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
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img
          src={docLogoUrl(settings)}
          alt={`${business} logo`}
          style={{
            width: 85,
            height: 85,
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            background: DOC.paper,
            borderRadius: 43,
            border: `2px solid ${DOC.gold}`,
          }}
        />

      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: DOC.darkGold,
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginTop: 10,
          lineHeight: 1.1,
        }}
      >
        {business}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          color: DOC.gold,
          marginTop: 4,
        }}
      >
        WEDDING PHOTOGRAPHY
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <div
          style={{
            background: DOC.tint,
            border: `1px solid ${DOC.gold}`,
            color: DOC.darkGold,
            padding: "7px 22px",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 1.8,
            borderRadius: 2,
            whiteSpace: "nowrap",
          }}
        >
          {docTitle.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: 8.6, color: DOC.gray, marginTop: 5 }}>
        {docMeta ?? `Dated ${fmtDate(new Date().toISOString())}`}
      </div>
      <div style={{ height: 2, background: DOC.gold, marginTop: 9 }} />
    </div>
  );
}

/** Section heading with a clean gold-tipped dividing line. */
export function PdfSection({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 8, marginTop: 14 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 1.3,
          textTransform: "uppercase",
          color: DOC.headGold,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", marginTop: 4 }}>
        <div style={{ width: 44, height: 2, background: DOC.gold }} />
        <div style={{ flex: 1, height: 2, background: DOC.line }} />
      </div>
    </div>
  );
}

export function PdfFooter({ settings }: { settings: any }) {
  const phone = settings?.phone ?? "94469 98877";
  const instagram = settings?.instagram ?? "@jog_media";
  const website = settings?.website ?? "www.jogmedia.in";
  return (
    <div style={{ marginTop: "auto", paddingTop: 16 }}>
      <div style={{ height: 1, background: DOC.line, marginBottom: 9 }} />
      <div
        style={{
          fontSize: 8.8,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: DOC.darkGold,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        CALL / WHATSAPP / GPAY: {phone} | INSTAGRAM: {instagram} | WEBSITE: {website}
      </div>
      <div
        style={{
          fontSize: 8.6,
          fontStyle: "italic",
          color: DOC.gray,
          textAlign: "center",
          marginTop: 4,
          letterSpacing: 0.6,
        }}
      >
        — WE DON'T JUST TAKE PHOTOS, WE TELL YOUR STORY —
      </div>
    </div>
  );
}

