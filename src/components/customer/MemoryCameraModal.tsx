import React, { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCw, Share2, Sparkles, SwitchCamera, X } from "lucide-react";

export type LogoOverlayPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

interface MemoryCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  businessName: string;
  logoUrl?: string;
}

const FILTERS = [
  { id: "normal", label: "Original", css: "none" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.12) brightness(1.04)" },
  { id: "warm", label: "Golden", css: "sepia(0.22) saturate(1.3) brightness(1.05)" },
  { id: "cool", label: "Crisp", css: "hue-rotate(-10deg) saturate(1.15) contrast(1.08)" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.2)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.45) contrast(1.1) brightness(0.96)" },
] as const;

export const MemoryCameraModal: React.FC<MemoryCameraModalProps> = ({
  isOpen,
  onClose,
  businessId = "teatime",
  businessName,
  logoUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const overlayPos: LogoOverlayPosition =
    ((typeof window !== "undefined"
      ? localStorage.getItem(`menyo_memory_logo_pos_${businessId}`) ||
        (businessId ? localStorage.getItem(`menyo_memory_logo_pos_${businessId.replace(/^biz_/, "")}`) : null)
      : null) as LogoOverlayPosition) || "bottom-right";

  const customOverlayLogo =
    (typeof window !== "undefined"
      ? localStorage.getItem(`menyo_memory_logo_url_${businessId}`) ||
        (businessId ? localStorage.getItem(`menyo_memory_logo_url_${businessId.replace(/^biz_/, "")}`) : null)
      : null) || logoUrl;

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: "user" | "environment") => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1350 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(
        err?.message || "Camera access denied. Please allow camera permissions to capture your memory."
      );
    }
  };

  useEffect(() => {
    if (isOpen && !capturedDataUrl) {
      startCamera(facingMode);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, capturedDataUrl]);

  if (!isOpen) return null;

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setIsCapturing(true);

    try {
      const targetW = 1080;
      const targetH = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Center-crop video to 4:5 (1080 x 1350)
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const targetRatio = targetW / targetH;
      const videoRatio = vw / vh;

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (videoRatio > targetRatio) {
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / targetRatio;
        sy = (vh - sh) / 2;
      }

      ctx.save();
      ctx.filter = activeFilter.css;
      if (facingMode === "user") {
        ctx.translate(targetW, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
      ctx.restore();

      // Subtle bottom gradient for premium framing
      const grad = ctx.createLinearGradient(0, targetH - 220, 0, targetH);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, targetH - 220, targetW, 220);

      // Draw shop logo overlay in its natural shape if available
      if (customOverlayLogo) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = customOverlayLogo;
          });
          const maxDim = 180;
          const ratio = img.width && img.height ? img.width / img.height : 1;
          const drawW = ratio >= 1 ? maxDim : maxDim * ratio;
          const drawH = ratio >= 1 ? maxDim / ratio : maxDim;
          const pad = 48;
          let lx = targetW - drawW - pad;
          let ly = targetH - drawH - pad;
          if (overlayPos === "top-left") {
            lx = pad;
            ly = pad;
          } else if (overlayPos === "top-right") {
            lx = targetW - drawW - pad;
            ly = pad;
          } else if (overlayPos === "bottom-left") {
            lx = pad;
            ly = targetH - drawH - pad;
          } else if (overlayPos === "bottom-center") {
            lx = (targetW - drawW) / 2;
            ly = targetH - drawH - pad;
          }
          ctx.drawImage(img, lx, ly, drawW, drawH);
        } catch {
          // Ignore CORS logo load failure
        }
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
      setCapturedDataUrl(dataUrl);
      stopStream();

      // Increment admin memory photo counter
      try {
        const key = `menyo_memory_count_${businessId}`;
        const prev = Number(localStorage.getItem(key) || "0");
        localStorage.setItem(key, String(prev + 1));
      } catch {
        // ignore storage errors
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!capturedDataUrl) return;
    const a = document.createElement("a");
    a.href = capturedDataUrl;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}-memory.jpg`;
    a.click();
  };

  const handleShare = async () => {
    if (!capturedDataUrl) return;
    try {
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "memory.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Memories at ${businessName}`,
          text: `Having a great time at ${businessName}!`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const overlayClass =
    overlayPos === "top-left"
      ? "top-4 left-4"
      : overlayPos === "top-right"
      ? "top-4 right-4"
      : overlayPos === "bottom-left"
      ? "bottom-4 left-4"
      : overlayPos === "bottom-center"
      ? "bottom-4 left-1/2 -translate-x-1/2"
      : "bottom-4 right-4";

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-y-auto overscroll-none p-2 sm:p-4">
      {/* Centered Modal Container that fits completely in view */}
      <div className="w-full max-w-[400px] mx-auto my-auto bg-[#111113] text-white rounded-[28px] overflow-hidden border border-white/10 shadow-2xl flex flex-col shrink-0">
        {/* Top Bar */}
        <div className="px-4 py-3 flex items-center justify-end border-b border-white/10">
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>

        {/* 4:5 (1080 x 1350) Viewport */}
        <div className="relative w-full aspect-[4/5] bg-black overflow-hidden flex items-center justify-center">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
              <Camera className="w-10 h-10 text-white/40" />
              <p className="text-xs text-white/70">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : capturedDataUrl ? (
            <div className="relative w-full h-full">
              <img
                src={capturedDataUrl}
                alt="Captured memory"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  filter: activeFilter.css,
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
                className="w-full h-full object-cover"
              />
              {customOverlayLogo ? (
                <img
                  src={customOverlayLogo}
                  alt={businessName}
                  className={`absolute ${overlayClass} max-w-[76px] max-h-[76px] object-contain drop-shadow-lg pointer-events-none`}
                />
              ) : (
                <div className={`absolute ${overlayClass} px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 shadow-lg pointer-events-none`}>
                  <span>{businessName}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        {!capturedDataUrl ? (
          <div className="p-3 sm:p-4 space-y-3 bg-[#111113]">
            {/* Filter Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                    activeFilter.id === f.id
                      ? "bg-white text-black shadow-sm font-bold"
                      : "bg-white/10 text-white/75 hover:bg-white/20"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Shutter & Switch */}
            <div className="flex items-center justify-between px-3 pt-1">
              <div className="w-10" />
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing || !!cameraError}
                className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                title="Capture 1080x1350 Photo"
              >
                <div className="w-10 h-10 rounded-full bg-white" />
              </button>
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 flex items-center gap-2 bg-[#111113]">
            <button
              type="button"
              onClick={() => setCapturedDataUrl(null)}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold flex items-center gap-1 transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

