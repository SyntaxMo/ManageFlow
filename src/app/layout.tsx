import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ManageFlow",
  description:
    "Project and team management for game development teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
