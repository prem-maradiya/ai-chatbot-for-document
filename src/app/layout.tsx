import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat with your documents",
  description: "A retrieval-augmented (RAG) app: ask questions about your uploaded documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
