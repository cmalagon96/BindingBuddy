import type React from "react";
import "@payloadcms/next/css";

export const metadata = {
  title: "Admin – Binding Buddy",
};

export default function PayloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
