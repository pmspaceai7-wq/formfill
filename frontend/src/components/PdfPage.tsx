"use client";

import { useEffect, useRef, useState } from "react";
import { pageImageUrl } from "@/lib/api";

interface Props {
  formId: string;
  page: number;
  zoom: number;
  onRendered: (width: number, height: number) => void;
}

// The backend renders pages at 150 DPI (roughly double a typical CSS pixel
// grid), so painting the image at its natural pixel size makes every page
// look zoomed in far past "100%". This brings a 150-DPI render down to a
// sane on-screen baseline before the user's zoom is applied on top.
const RENDER_DPI = 150;
const SCREEN_DPI = 96;
const BASE_SCALE = SCREEN_DPI / RENDER_DPI;

export function PdfPage({ formId, page, zoom, onRendered }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => { onRenderedRef.current = onRendered; });

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Reset the known natural size whenever the page image itself changes, so a
  // stale size from the previous page can't briefly flash before onLoad fires.
  useEffect(() => {
    setNatural(null);
  }, [formId, page]);

  useEffect(() => {
    if (!natural) return;
    onRenderedRef.current(
      Math.round(natural.w * BASE_SCALE * zoom),
      Math.round(natural.h * BASE_SCALE * zoom)
    );
  }, [natural, zoom]);

  const displayWidth = natural ? Math.round(natural.w * BASE_SCALE * zoom) : undefined;
  const displayHeight = natural ? Math.round(natural.h * BASE_SCALE * zoom) : undefined;

  return (
    <img
      ref={imgRef}
      src={pageImageUrl(formId, page)}
      alt={`Page ${page}`}
      draggable={false}
      width={displayWidth}
      height={displayHeight}
      style={{
        display: "block",
        width: displayWidth ? `${displayWidth}px` : undefined,
        height: displayHeight ? `${displayHeight}px` : undefined,
        userSelect: "none",
      }}
      onLoad={(e) => {
        const img = e.currentTarget;
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      }}
    />
  );
}
