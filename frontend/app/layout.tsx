import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { OptimizationProvider } from "@/context/OptimizationContext";
import ToastContainer from "@/components/ToastContainer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LEADHER — Quantum Women's Empowerment Optimizer",
  description:
    "Quantum-enhanced budget allocation optimizer for women's empowerment across Indian districts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <OptimizationProvider>
          <div className="grid-bg" />
          <div className="relative z-10 min-h-screen">{children}</div>
          <ToastContainer />
        </OptimizationProvider>
      </body>
    </html>
  );
}
