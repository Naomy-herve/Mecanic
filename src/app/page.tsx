import type { Metadata } from "next";
import HomeStory from "@/components/home-story";

export const metadata: Metadata = {
  title: "La bonne pièce pour votre Kia",
  description:
    "Identifiez votre véhicule, recherchez une pièce Kia et vérifiez la référence, le prix et la disponibilité avec notre équipe.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomeStory />;
}
