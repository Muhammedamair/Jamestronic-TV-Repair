import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "./ThemeRegistry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | JamesTronic TV Repair',
    default: 'JamesTronic TV Repair | Expert Doorstep Service in Hyderabad',
  },
  description: "Hyderabad's most trusted LED, OLED, and QLED TV repair service. 40-min doorstep service in Manikonda, Gachibowli, Jubilee Hills and more. 6-month warranty.",
  keywords: ["tv repair hyderabad", "led tv repair near me", "tv installation hyderabad", "sony tv service center", "samsung tv repair", "manikonda tv repair", "gachibowli tv repair", "jubilee hills tv repair", "lg tv repair"],
  openGraph: {
    title: 'JamesTronic TV Repair | Expert Doorstep Service in Hyderabad',
    description: 'Same-day doorstep TV repair in Hyderabad. Top-rated technicians, guaranteed work.',
    url: 'https://jamestronic.com',
    siteName: 'JamesTronic TV Repair',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
