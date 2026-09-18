import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bóveda de Recursos | Classroom Exclusivo",
  description: "Accede a herramientas, plantillas y recursos prácticos de alta conversión.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-[#f3f4f6] text-[#111827] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
