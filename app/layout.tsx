import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendLens — Multi-region trend intelligence",
  description:
    "Find precision signals across YouTube regions, analyse momentum, keywords and cross-market reach, and forecast what breaks next.",
  applicationName: "TrendLens",
  keywords: [
    "trend finder",
    "YouTube trends",
    "multi-region trends",
    "trend forecasting",
    "content intelligence"
  ]
};

export const viewport: Viewport = {
  themeColor: "#06080b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
