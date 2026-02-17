import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap" 
});

export const metadata: Metadata = {
  title: "Schedily | Professional Social Coordination by SYNC TECH Solutions",
  description: "The future of team synchronization. Schedily allows professionals to tag teammates, dispatch retail shifts, and coordinate schedules effortlessly. Engineered for performance by SYNC TECH Solutions in Dublin.",
  keywords: [
    "Professional Scheduling", 
    "Social Coordination", 
    "Retail Shift Management", 
    "Team Productivity", 
    "Schedily", 
    "ICS Calendar Generator", 
    "SYNC TECH Solutions", 
    "Sheraz Hussain",
    "Dublin Tech Ops",
    "Professional Networking",
    "Shift Sync",
    "Business Coordination Tool",
    "Enterprise Scheduling Engine"
  ],
  authors: [{ name: "Sheraz Hussain", url: "https://sheraz.synctech.ie" }],
  creator: "SYNC TECH Solutions",
  publisher: "synctech.ie",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: "https://synctech.ie",
    title: "Schedily - Professional Social Coordination",
    description: "Streamline your professional life with social tagging and instant calendar synchronization. Engineered for performance by SYNC TECH Solutions.",
    siteName: "Schedily",
    images: [
      {
        url: "https://picsum.photos/seed/schedily-og/1200/630",
        width: 1200,
        height: 630,
        alt: "Schedily Professional Coordination Hub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedily | Professional Social Coordination",
    description: "The future of team synchronization. Developed by Sheraz Hussain at SYNC TECH Solutions.",
    images: ["https://picsum.photos/seed/schedily-tw/1200/630"],
  },
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<any>;
}) {
  const params = await props.params;
  const children = props.children;

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
