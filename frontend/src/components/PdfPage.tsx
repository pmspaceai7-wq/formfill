"use client";

import { useEffect, useRef, useState } from "react";
import { pageImageUrl } from "@/lib/api";
import type { PageInfo } from "@/lib/types";

interface Props {
  formId: string;
  page: number;
  zoom: number;
  pageInfo?: PageInfo;
  onRendered?: (width: number, height: number) => void;
}

// PDF points are 72 DPI; screen pixels in CSS standard are 96 DPI.
// Backend renders pages at 150 DPI.
const RENDER_DPI = 150;
const SCREEN_DPI = 96;
const BASE_SCALE = SCREEN_DPI / RENDER_DPI; // 96 / 150 = 0.64
const PT_TO_PX = SCREEN_DPI / 72;           // 96 / 72 = 1.3333333333333333

export function PdfPage({ formId, page, zoom, pageInfo, onRendered }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => { onRenderedRef.current = onRendered; });

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // If pageInfo is available from the schema, dimensions are 100% deterministic
  // without needing to wait for the image to download or onLoad to trigger.
  const displayWidth = pageInfo
    ? Math.round(pageInfo.width * PT_TO_PX * zoom)
    : natural
    ? Math.round(natural.w * BASE_SCALE * zoom)
    : undefined;

  const displayHeight = pageInfo
    ? Math.round(pageInfo.height * PT_TO_PX * zoom)
    : natural
    ? Math.round(natural.h * BASE_SCALE * zoom)
    : undefined;

  // Reset natural state on page change
  useEffect(() => {
    setNatural(null);
  }, [formId, page]);

  // Synchronously or reactively report rendered dimensions
  useEffect(() => {
    if (displayWidth && displayHeight) {
      onRenderedRef.current?.(displayWidth, displayHeight);
    }
  }, [displayWidth, displayHeight]);

  // Check if image is already cached/complete on mount or page change
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  }, [formId, page]);

  return (
    <img
      ref={imgRef}
      src={pageImageUrl(formId, page)}
      alt={`Page ${page}`}
      draggable={false}
      width={displayWidth}
      height={displayHeight}
      className="rounded-lg max-w-none max-h-none select-none"
      style={{
        display: "block",
        width: displayWidth ? `${displayWidth}px` : undefined,
        height: displayHeight ? `${displayHeight}px` : undefined,
        maxWidth: "none",
        maxHeight: "none",
        userSelect: "none",
      }}
      onLoad={(e) => {
        const img = e.currentTarget;
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      }}
    />
  );
}
