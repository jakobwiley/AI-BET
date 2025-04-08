import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI-BET",
  description: "Smart sports betting with real game data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 text-gray-900`}>
        <div className="flex flex-col md:flex-row min-h-screen">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-gray-900 text-white p-4 md:min-h-screen">
            <header className="mb-6">
              <h1 className="text-2xl font-bold">AI-BET</h1>
              <p className="text-gray-400 text-sm">Smart Sports Analytics</p>
            </header>
            
            <nav className="mb-6">
              <ul>
                <li className="mb-2">
                  <Link href="/" className="block py-2 px-4 hover:bg-gray-800 rounded transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li className="mb-2">
                  <Link href="/nba" className="block py-2 px-4 hover:bg-gray-800 rounded transition-colors">
                    NBA Games
                  </Link>
                </li>
                <li className="mb-2">
                  <Link href="/mlb" className="block py-2 px-4 hover:bg-gray-800 rounded transition-colors">
                    MLB Games
                  </Link>
                </li>
                <li className="mb-2">
                  <Link href="/insights" className="block py-2 px-4 hover:bg-gray-800 rounded transition-colors">
                    Insights
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Main content */}
          <main className="flex-1 p-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
