"use client";

import { Check, ExternalLink, RefreshCw, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

type PendingPandal = {
  id: string;
  name: string;
  area: string;
  description: string;
  coordinates: [number, number];
  image: string;
  crowd: string;
  eco: boolean;
  createdAt: number;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [pending, setPending] = useState<PendingPandal[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPending = useCallback(async (key = adminKey) => {
    if (!key) {
      setError("Enter the admin key to continue.");
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pandals", {
        cache: "no-store",
        headers: { "x-pandal-admin-key": key },
      });
      const result = (await response.json().catch(() => null)) as { pandals?: PendingPandal[]; error?: string } | null;
      if (!response.ok) {
        setConnected(false);
        setError(result?.error ?? "Admin access was not accepted.");
        return false;
      }
      setPending(result?.pandals ?? []);
      setConnected(true);
      return true;
    } catch {
      setError("The approval service could not be reached.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/pandals/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-pandal-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "The pandal could not be updated.");
        return;
      }
      setPending((items) => items.filter((item) => item.id !== id));
    } catch {
      setError("The approval service could not be reached.");
    } finally {
      setBusyId(null);
    }
  };

  const signOut = () => {
    setAdminKey("");
    setPending([]);
    setConnected(false);
    setError(null);
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <Link className="admin-back-link" href="/">← Back to Bappa Map</Link>
        <section className="admin-card">
          <div className="admin-heading">
            <span className="admin-icon"><ShieldCheck size={22} /></span>
            <div>
              <p className="admin-eyebrow">Private moderation</p>
              <h1>Approve community pandals</h1>
            </div>
          </div>

          {!connected ? (
            <form className="admin-login" onSubmit={(event) => { event.preventDefault(); void loadPending(); }}>
              <p>Enter the <code>PANDAL_ADMIN_KEY</code> configured in Vercel or your local <code>.env.local</code>.</p>
              <label>
                <span>Admin key</span>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Paste your admin key"
                  required
                />
              </label>
              <button className="admin-primary-button" type="submit" disabled={loading}>
                {loading ? "Checking…" : "Open approvals"}
              </button>
            </form>
          ) : (
            <>
              <div className="admin-toolbar">
                <p>{pending.length} pandal{pending.length === 1 ? "" : "s"} waiting for review.</p>
                <div>
                  <button className="admin-secondary-button" type="button" onClick={() => void loadPending()} disabled={loading}>
                    <RefreshCw size={16} /> Refresh
                  </button>
                  <button className="admin-secondary-button" type="button" onClick={signOut}>Sign out</button>
                </div>
              </div>

              {pending.length > 0 ? (
                <div className="approval-list">
                  {pending.map((pandal) => (
                    <article className="approval-item" key={pandal.id}>
                      <img src={pandal.image} alt={`${pandal.name} submission`} />
                      <div className="approval-copy">
                        <div className="approval-title-row">
                          <div>
                            <h2>{pandal.name}</h2>
                            <p>{pandal.area} · {pandal.crowd} crowd{pandal.eco ? " · Eco-friendly" : ""}</p>
                            {pandal.description && <span className="approval-description">{pandal.description}</span>}
                          </div>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${pandal.coordinates[1]},${pandal.coordinates[0]}`} target="_blank" rel="noreferrer" aria-label={`Open ${pandal.name} location`}>
                            <ExternalLink size={17} />
                          </a>
                        </div>
                        <small>Submitted {new Date(pandal.createdAt).toLocaleString()}</small>
                        <div className="approval-actions">
                          <button className="approve-button" type="button" onClick={() => void updateStatus(pandal.id, "approved")} disabled={busyId === pandal.id}>
                            <Check size={17} /> Approve
                          </button>
                          <button className="reject-button" type="button" onClick={() => void updateStatus(pandal.id, "rejected")} disabled={busyId === pandal.id}>
                            <X size={17} /> Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">
                  <Check size={24} />
                  <strong>All caught up</strong>
                  <span>New submissions will appear here after someone adds a pandal.</span>
                </div>
              )}
            </>
          )}

          {error && <p className="admin-error" role="alert">{error}</p>}
        </section>
      </div>
    </main>
  );
}
