import type { Metadata } from "next";
import { Chakra_Petch, Space_Grotesk } from "next/font/google";
import { personal } from "@/data/resume";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import StarField from "@/components/StarField";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";
import ResumeProvider from "@/components/ResumeProvider";

// Font system (two fonts only):
//  • Chakra Petch — slightly futuristic: headings, section titles, nav,
//    buttons, labels (via --font-display / --font-name)
//  • Space Grotesk — clean & readable: all body text and descriptions
//    (via --font-body)
// The downloadable CV stays Arial/Helvetica (B&W, ATS-friendly) on purpose.
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
      className={`${chakra.variable} ${spaceGrotesk.variable}`}
    >
      <body className="nebula-page min-h-full">
        <ResumeProvider>
          <SmoothScroll>
            <StarField />
            <Navbar />
            <main className="relative z-10">{children}</main>
            <Footer />
            <Chatbot />
          </SmoothScroll>
        </ResumeProvider>
      </body>
    </html>
  );
}