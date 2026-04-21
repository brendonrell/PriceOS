import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PriceOS",
  description: "Price Discussion — curated generative art on Ethereum.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Rubik Mono One via plain Google Fonts <link> (not next/font/google)
            so the production build has zero build-time network dependency. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
