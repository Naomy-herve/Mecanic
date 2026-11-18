import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KIA PIÈCE — La bonne pièce pour votre Kia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#101619",
          color: "#f7f6f1",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 23, fontWeight: 700, letterSpacing: "5px" }}>
          <span style={{ display: "flex", width: 54, height: 54, alignItems: "center", justifyContent: "center", background: "#c8102e", fontSize: 31 }}>K</span>
          KIA PIÈCE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#bdc5c2", fontSize: 17, letterSpacing: "5px", marginBottom: 20 }}>PIÈCES AUTOMOBILES</span>
          <strong style={{ fontSize: 78, letterSpacing: "-5px", lineHeight: 1.05 }}>La bonne pièce.</strong>
          <strong style={{ color: "#f15a70", fontSize: 78, letterSpacing: "-5px", lineHeight: 1.05 }}>Le bon mouvement.</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#bdc5c2", fontSize: 17 }}>
          <span>Catalogue · Compatibilité · Contact direct</span>
          <span>kia-piece</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
