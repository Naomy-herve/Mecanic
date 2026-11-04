"use client";

import { useState } from "react";

export default function InitialiserAdmin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Initialisation impossible.");
      setSuccess("Compte administrateur créé. Ouverture de votre espace…");
      window.location.href = "/admin";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Initialisation impossible.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="page-shell"><div className="container auth-wrap">
    <div className="section-kicker">CONFIGURATION SÉCURISÉE</div>
    <h1 className="page-title">Initialiser l’administration</h1>
    <p className="muted">Cette étape est réservée à la première création du compte administrateur. Elle sera automatiquement désactivée dès qu’un administrateur existe.</p>
    <div className="auth-card">
      {error && <p className="notice error" role="alert">{error}</p>}
      {success && <p className="notice" role="status">{success}</p>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="admin-name">Nom complet</label><input id="admin-name" name="fullName" required minLength={2} maxLength={100} autoComplete="name" /></div>
        <div className="field"><label htmlFor="admin-email">E-mail administrateur</label><input id="admin-email" name="email" type="email" required autoComplete="username" /></div>
        <div className="field"><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" name="password" type="password" required minLength={10} maxLength={100} autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="admin-token">Code de configuration initiale</label><input id="admin-token" name="setupToken" type="password" required minLength={32} maxLength={256} autoComplete="off" /></div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>{busy ? "Configuration…" : "Créer le compte administrateur"}</button>
      </form>
    </div>
  </div></main>;
}
