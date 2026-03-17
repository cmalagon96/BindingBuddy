"use client";

import type { DefaultCellComponentProps } from "payload";

export default function MediaThumbnailCell({
  cellData,
  rowData,
}: DefaultCellComponentProps) {
  // Prefer the 160×160 thumbnail size; fall back to full URL
  const src: string | undefined =
    (rowData?.sizes?.thumbnail?.url as string | undefined) ||
    (rowData?.url as string | undefined);

  const alt = typeof cellData === "string" ? cellData : (rowData?.alt as string | undefined) ?? "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={36}
          height={36}
          style={{
            width: "36px",
            height: "36px",
            objectFit: "cover",
            borderRadius: "4px",
            border: "1px solid #1E2130",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "4px",
            border: "1px solid #1E2130",
            background: "#0F1219",
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px" }}>
        {alt}
      </span>
    </div>
  );
}
