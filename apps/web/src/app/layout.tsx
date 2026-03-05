import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sigil",
  description: "CRE-powered compliance layer for the ERC-8004 agent economy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
