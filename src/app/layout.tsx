import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BetAI - Sports Betting Predictions",
  description: "AI-powered sports betting predictions for NBA and MLB games with confidence ratings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <Navbar />
        <div className="pt-0 pb-16 md:pt-16 md:pb-0 px-4 max-w-6xl mx-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
