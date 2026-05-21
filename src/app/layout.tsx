import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مودة | زواج شرعي",
  description: "منصة مودة للزواج الشرعي — تعارف وقور بضوابط شرعية صارمة وبخصوصية تامة",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "مودة",
    startupImage: "/icon-512.png",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#375346",
    "msapplication-TileImage": "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#375346",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import Navbar from "../components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        {/* Android PWA */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <div className="app-container">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
