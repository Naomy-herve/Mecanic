import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata:Metadata={title:{default:"KIA PIÈCE — Pièces automobiles Kia",template:"%s | KIA PIÈCE"},description:"Trouvez les pièces adaptées à votre véhicule Kia. Catalogue, compatibilité et demande de devis.",applicationName:"KIA PIÈCE"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><SiteHeader/>{children}<SiteFooter/></body></html>;}