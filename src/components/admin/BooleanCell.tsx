"use client";
import type { DefaultCellComponentProps } from "payload";

export default function BooleanCell({ cellData }: DefaultCellComponentProps) {
  const isTrue = cellData === true;
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: isTrue ? "#22c55e" : "#8B8FA8",
      }}
    >
      {isTrue ? "Yes" : "No"}
    </span>
  );
}
