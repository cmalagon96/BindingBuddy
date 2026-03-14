import React from "react";

/**
 * Injected into the Payload admin <head> via admin.components.header.
 *
 * Responsibilities:
 *  - Preconnect + load Google Fonts (Barlow Condensed, DM Sans)
 *  - Set theme-color so the browser chrome matches the admin dark bg
 *  - Declare a 32px favicon (belt-and-suspenders alongside payload.config meta.icons)
 */
export default function AdminHead() {
  return (
    <>
      {/* Font preconnects — reduces connection latency for Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
        rel="stylesheet"
      />

      {/* Browser chrome / PWA color — matches --bb-dark */}
      <meta name="theme-color" content="#0F1117" />
      <meta name="color-scheme" content="dark" />

      {/* Favicon — belt-and-suspenders alongside payload.config meta.icons */}
      <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
      <link rel="apple-touch-icon" href="/logo.png" />
    </>
  );
}
