"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface BrandedQRProps {
  url: string;
  size?: number;
  showActions?: boolean;
  className?: string;
}

export function BrandedQR({ url, size = 200, showActions = false, className = "" }: BrandedQRProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;
    let cancelled = false;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: "svg",
        data: url,
        image: "/logos/mark-yellow.png",
        dotsOptions: { color: "#1e1e1e", type: "extra-rounded" },
        cornersSquareOptions: { color: "#ffd716", type: "extra-rounded" },
        cornersDotOptions: { color: "#1e1e1e", type: "dot" },
        backgroundOptions: { color: "#ffffff" },
        imageOptions: { crossOrigin: "anonymous", margin: 5 },
        margin: 8,
        qrOptions: { errorCorrectionLevel: "H" },
      });
      containerRef.current.innerHTML = "";
      qr.append(containerRef.current);
      setReady(true);
    });

    return () => { cancelled = true; };
  }, [url, size]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy"); }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await navigator.share({ url, title: "Nomarc Projects" }); return; }
      catch { /* fall through */ }
    }
    copyLink();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: ready ? 1 : 0.25, scale: ready ? 1 : 0.9 }}
        transition={{ duration: 0.45, type: "spring", stiffness: 220, damping: 20 }}
        ref={containerRef}
        className="rounded-2xl overflow-hidden shadow-sm border border-[#f0f0f0] dark:border-white/10 bg-white"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
      {showActions && (
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f5f5f5] dark:bg-white/10 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            onClick={share}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f5f5f5] dark:bg-white/10 text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white hover:bg-[#ebebeb] dark:hover:bg-white/15 transition-colors"
          >
            <Share2 size={13} /> Share
          </button>
        </div>
      )}
    </div>
  );
}

/** Generate a branded QR as an SVG string (for injection into print HTML). */
export async function generateQRSVG(url: string, size = 210): Promise<string> {
  try {
    const { default: QRCodeStyling } = await import("qr-code-styling");
    const qr = new QRCodeStyling({
      width: size,
      height: size,
      type: "svg",
      data: url,
      image: "/logos/mark-yellow.png",
      dotsOptions: { color: "#1e1e1e", type: "extra-rounded" },
      cornersSquareOptions: { color: "#ffd716", type: "extra-rounded" },
      cornersDotOptions: { color: "#1e1e1e", type: "dot" },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { crossOrigin: "anonymous", margin: 5 },
      margin: 8,
      qrOptions: { errorCorrectionLevel: "H" },
    });
    const blob = await qr.getRawData("svg");
    if (!blob) return "";
    return await (blob as Blob).text();
  } catch {
    return "";
  }
}
