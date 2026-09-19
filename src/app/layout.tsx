import type { Metadata } from "next";
import { Chakra_Petch, Orbitron, Space_Grotesk } from "next/font/google";
import { personal } from "@/data/resume";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import StarField from "@/components/StarField";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${personal.name} — ${personal.role}`,
  description: personal.tagline,
  keywords: [
    personal.name,
    "portfolio",
    "developer",
    "apps",
    "websites",
    "ui/ux",
    "full-stack",
  ],
  openGraph: {
    title: `${personal.name} — ${personal.role}`,
    description: personal.tagline,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${chakra.variable} ${spaceGrotesk.variable}`}
    >
      <body className="nebula-page min-h-full">
        <SmoothScroll>
          <StarField />
          <Navbar />
          <main className="relative z-10">{children}</main>
          <Footer />
          <Chatbot />
        </SmoothScroll>
      </body>
    </html>
  );
}