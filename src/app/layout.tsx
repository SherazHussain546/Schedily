
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
  title: "Schedily | Professional Schedily Portal by Sheraz Hussain",
  description: "The future of team synchronization. Schedily allows professionals to tag teammates, dispatch retail shifts, and coordinate schedules effortlessly. Engineered by Sheraz Hussain with support from SYNC TECH Solutions.",
  keywords: [
    "Professional Scheduling", 
    "Social Coordination", 
    "Retail Shift Management", 
    "Team Productivity", 
    "Schedily", 
    "ICS Calendar Generator", 
    "Sheraz Hussain",
    "SYNC TECH Solutions",
    "Dublin Tech Hub",
    "Professional Networking Portal",
    "Shift Sync Engine",
    "Business Coordination Tool",
    "Enterprise Scheduling Portal"
  ],
  authors: [{ name: "Sheraz Hussain", url: "https://sheraz.synctech.ie" }],
  creator: "Sheraz Hussain",
  publisher: "Schedily",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: "https://schedily.com",
    title: "Schedily - Professional Coordination Portal",
    description: "Streamline your professional life with social tagging and instant calendar synchronization. Engineered by Sheraz Hussain.",
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
    description: "The future of team synchronization. Engineered by Sheraz Hussain.",
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
