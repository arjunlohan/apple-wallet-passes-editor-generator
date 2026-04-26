"use client";
import { useEffect, useRef } from "react";
import type { LayoutBarcode } from "@/lib/pass-layout";
import styles from "../css/preview.module.css";

/** Map Apple's PKBarcodeFormat enums to bwip-js format strings. */
const BWIP_FORMAT: Record<string, string> = {
  PKBarcodeFormatQR: "qrcode",
  PKBarcodeFormatPDF417: "pdf417",
  PKBarcodeFormatAztec: "azteccode",
  PKBarcodeFormatCode128: "code128",
};

export interface BarcodeBlockProps {
  barcode: LayoutBarcode;
}

export function BarcodeBlock({ barcode }: BarcodeBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const bwip = await import("bwip-js/browser");
      if (cancelled || !canvasRef.current) return;
      const format = BWIP_FORMAT[barcode.format] ?? "qrcode";
      const c = canvasRef.current;
      try {
        bwip.default.toCanvas(c, {
          bcid: format,
          text: barcode.message,
          scale: 2,
          includetext: false,
        });
        // bwip-js sets the canvas's intrinsic width/height attributes to the
        // rendered pixel dimensions. The CSS width/height we want to show is
        // smaller — force it here so the rendered canvas shrinks via CSS.
        if (format === "qrcode" || format === "azteccode") {
          c.style.width = "144px";
          c.style.height = "144px";
        } else {
          // pdf417 / code128 are wider than tall.
          c.style.width = "200px";
          c.style.height = "56px";
        }
        // Signal success to any external harness (Playwright) waiting on
        // a non-blank canvas. We flip a data attribute at the end of the
        // paint so tooling can gate a screenshot on it.
        c.dataset.barcodeReady = "1";
      } catch (err) {
        console.warn("bwip-js failed to render barcode", err);
        c.dataset.barcodeError = err instanceof Error ? err.message : "unknown";
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [barcode.format, barcode.message]);

  return (
    <div className={styles.barcode} data-format={barcode.format}>
      <canvas ref={canvasRef} aria-label={barcode.altText ?? barcode.message} />
      {barcode.altText ? (
        <div className={styles.barcodeAlt}>{barcode.altText}</div>
      ) : null}
    </div>
  );
}
