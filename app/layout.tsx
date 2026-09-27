import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Singer Lee Goun",
  description: "가수 고운의 방송 라이브 노래 목록 & 다시보기 링크",
  openGraph: {
    title: "Singer Lee Goun",
    description: "가수 고운의 방송 라이브 노래 목록 & 다시보기 링크",
    url: "https://goun-live-list.vercel.app",
    siteName: "Singer Lee Goun",
    images: [
      {
        url: "https://goun-live-list.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Singer Lee Goun 대표 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Singer Lee Goun",
    description: "가수 고운의 방송 라이브 노래 목록 & 다시보기 링크",
    images: ["https://goun-live-list.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}