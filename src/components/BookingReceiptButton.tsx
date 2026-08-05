import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildBookingReceiptMessage, openWhatsApp } from "@/lib/whatsapp";
import { useSettings } from "@/lib/db";

export type BookingReceiptData = {
  clientName?: string | null;
  clientPhone?: string | null;
  projectName?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  total?: number | string | null;
  advance?: number | string | null;
  balance?: number | string | null;
  packageName?: string | null;
  services?: string[];
};

export function BookingReceiptButton({
  data,
  size = "sm",
  className,
}: {
  data: BookingReceiptData;
  size?: "sm" | "default";
  className?: string;
}) {
  const { data: settings } = useSettings();

  return (
    <Button
      type="button"
      size={size}
      className={`gap-1.5 bg-success text-success-foreground hover:bg-success/90 ${className ?? ""}`}
      onClick={() =>
        openWhatsApp(
          data.clientPhone,
          buildBookingReceiptMessage({ ...data, businessName: settings?.business_name ?? "JOG MEDIA" }),
        )
      }
    >
      <ReceiptText className="h-4 w-4" />
      Send Booking Receipt to Client
    </Button>
  );
}
