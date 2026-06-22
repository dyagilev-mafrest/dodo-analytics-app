import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Додо Пицца МАФРЕСТ — Аналитика",
  description: "Аналитический дашборд сети пиццерий МАФРЕСТ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="h-full antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
