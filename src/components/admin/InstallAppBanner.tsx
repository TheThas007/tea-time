import React, { useState, useEffect } from "react";
import { Download, Monitor, Smartphone, Check, X } from "lucide-react";

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Detect desktop vs mobile
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/.test(userAgent);
    setIsDesktop(!isMobileDevice);

    // Check if already running in standalone mode (installed PWA)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("PWA prompt error:", err);
      }
    } else {
      // Direct Chrome / Edge / Brave native PWA shortcut guide
      const isEdge = /edg\//i.test(navigator.userAgent);
      const isChrome = /chrome|crios/i.test(navigator.userAgent) && !isEdge;

      const guideMsg = isDesktop
        ? `Desktop Shortcut உருவாக்குவதற்கு:\n\n1. உங்கள் பிரவுசர் (Chrome / Edge) மேல் வலது மூலையில் உள்ள 3 புள்ளிகளை (⋮) கிளிக் செய்யவும்.\n2. "Save and share" (அல்லது "Apps") -> "Install Menyo" (அல்லது "Create shortcut...") என்பதை கிளிக் செய்யவும்.\n3. "Open as window" டிக் செய்து "Install / Create" கொடுக்கவும்.\n\nஉடனடியாக உங்கள் Desktop-ல் Menyo Shortcut Icon வந்துவிடும்!`
        : "போனில் 'Add to Home Screen' செய்வதற்கு:\n\n1. Safari / Chrome மெனுவில் Share/Options தட்டவும்.\n2. 'Add to Home screen' கிளிக் செய்யவும்.";

      alert(guideMsg);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="bg-[#050F2A] text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-md border border-white/10 animate-fadeIn text-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#7BBBFF] flex items-center justify-center text-[#050F2A] shrink-0 shadow-sm">
          {isDesktop ? (
            <Monitor className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
          )}
        </div>
        <div>
          <span className="font-extrabold text-white block text-sm">
            {isDesktop ? "Install Menyo Desktop App" : "Install Menyo on Home Screen"}
          </span>
          <span className="text-white/70 text-[11px] hidden sm:inline">
            {isDesktop
              ? "Get a 1-click Desktop shortcut and dedicated window for your kitchen counter & admin!"
              : "Open your Live Kitchen Orders with 1-tap — No login needed each time!"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 rounded-xl bg-[#7BBBFF] hover:bg-[#68aaff] text-[#050F2A] font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isDesktop ? "Install Desktop App" : "Add to Home Screen"}</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

