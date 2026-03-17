"use client";
import type { DefaultCellComponentProps } from "payload";

export default function PriceCell({ cellData }: DefaultCellComponentProps) {
  if (typeof cellData !== "number") return <span>—</span>;
  return <span>${(cellData / 100).toFixed(2)}</span>;
}
