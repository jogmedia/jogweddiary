import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<unknown> };

/**
 * "Install App" button. Uses the browser beforeinstallprompt event when available.
 * Hides itself when the app already runs installed (standalone display mode).
 */
export function InstallAppButton({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
    if (isIos) setIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!promptEvent && !iosHint) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("h-11 gap-2 px-3", className)}
      onClick={async () => {
        if (promptEvent) {
          await promptEvent.prompt();
          return;
        }
        // iOS has no install prompt API — guide the user.
        const { toast } = await import("sonner");
        toast.info("Tap the Share icon in Safari, then “Add to Home Screen”.");
      }}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
