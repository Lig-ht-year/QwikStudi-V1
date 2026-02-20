import type { Metadata } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { ToastProvider } from "@/components/Toast";

const instrumentSans = Instrument_Sans({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-display",
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "QwikStudi | AI-Powered Study Assistant",
    description: "Transform your studying with AI. Generate quizzes, summarize documents, and learn smarter with QwikStudi - your intelligent study companion.",
    keywords: ["AI study assistant", "quiz generator", "document summarizer", "study tools", "learning AI", "education technology"],
    authors: [{ name: "QwikStudi Team" }],
    creator: "QwikStudi",
    publisher: "QwikStudi",
    robots: "index, follow",
    openGraph: {
        type: "website",
        locale: "en_US",
        siteName: "QwikStudi",
        title: "QwikStudi | AI-Powered Study Assistant",
        description: "Transform your studying with AI. Generate quizzes, summarize documents, and learn smarter.",
    },
    twitter: {
        card: "summary_large_image",
        title: "QwikStudi | AI-Powered Study Assistant",
        description: "Transform your studying with AI. Generate quizzes, summarize documents, and learn smarter.",
    },
    icons: {
        icon: "/icon.svg",
        shortcut: "/icon.svg",
        apple: "/icon.svg",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn(
                instrumentSans.className,
                instrumentSans.variable,
                spaceGrotesk.variable,
                "min-h-screen bg-background antialiased"
            )}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ToastProvider>
                        <ClientErrorBoundary>
                            {children}
                        </ClientErrorBoundary>
                    </ToastProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
