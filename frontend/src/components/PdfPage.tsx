"use client";

import { useEffect, useRef } from "react";
import { pageImageUrl } from "@/lib/api";

interface Props {
  formId: string;
  page: number;
  zoom: number;
  onRendered: (width: number, height: number) => void;
}

export function PdfPage({ formId, page, zoom, onRendered }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => { onRenderedRef.current = onRendered; });

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      onRenderedRef.current(
        Math.round(img.naturalWidth * zoom),
        Math.round(img.naturalHeight * zoom)
      );
    }
  }, [zoom]);

  return (
    <img
      ref={imgRef}
      src={pageImageUrl(formId, page)}
      alt={`Page ${page}`}
      draggable={false}
      style={{ display: "block", maxWidth: "none", userSelect: "none" }}
      onLoad={(e) => {
        const img = e.currentTarget;
        onRenderedRef.current(
          Math.round(img.naturalWidth * zoom),
          Math.round(img.naturalHeight * zoom)
        );
      }}
    />
  );
}
