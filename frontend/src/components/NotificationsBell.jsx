import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// In-app notification bell — shows a badge with SRS due count + new parent messages.
// Also registers the service worker (PWA) and requests push permission on click (prep).

export default function NotificationsBell() {
  const { activeChild } = useAuth();
  const [notifs, setNotifs] = useState({ items: [], total: 0 });
  const [open, setOpen] = useState(false);

  const load = () => {
    const q = activeChild?.profile_id ? `?profile_id=${activeChild.profile_id}` : "";
    api.get(`/notifications${q}`).then((r) => setNotifs(r.data)).catch(() => {});
  };
  useEffect(() => {
    load();
    // Poll every 60s while page is open
    const id = setInterval(load, 60000);
    // Register SW for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [activeChild?.profile_id]);

  const requestPush = async () => {
    try {
      if (!("Notification" in window)) return;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      // Fetch VAPID public key from backend
      const keyResp = await api.get("/notifications/vapid-public-key");
      const vapidPub = keyResp.data?.vapid_public_key;
      if (!vapidPub) return;
      // Convert URL-safe base64 to Uint8Array
      const pad = "=".repeat((4 - vapidPub.length % 4) % 4);
      const b64 = (vapidPub + pad).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(b64);
      const appServerKey = new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
      try {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
        const json = sub.toJSON();
        await api.post("/notifications/push-subscription", {
          endpoint: sub.endpoint,
          keys: json?.keys || {},
        });
      } catch (_e) { /* already subscribed or refused */ }
    } catch (_e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); requestPush(); }}
        data-testid="notifications-bell"
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-full hover:bg-sand-100 text-foreground/70 hover:text-foreground flex items-center justify-center transition-colors"
      >
        <Bell className="w-5 h-5" />
        {notifs.total > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brick text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white" data-testid="notifications-badge">
            {notifs.total > 9 ? "9+" : notifs.total}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop (tap outside to close) */}
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] max-w-sm bg-white rounded-2xl shadow-xl border-2 border-sand-200 z-40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="notifications-panel"
          >
          <div className="px-4 py-3 border-b-2 border-sand-100 bg-gradient-to-r from-sun-100 to-white">
            <div className="font-black">Notifications</div>
            <div className="text-xs text-foreground/60">Résumé de ta journée</div>
          </div>
          {notifs.items.length === 0 ? (
            <div className="p-6 text-center text-sm text-foreground/60">
              ✨ Rien à signaler pour l'instant.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifs.items.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.url}
                    onClick={() => setOpen(false)}
                    data-testid={`notif-${n.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-sand-100 border-b border-sand-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sun-100 flex items-center justify-center text-xl shrink-0">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm leading-tight">{n.title}</div>
                      <div className="text-xs text-foreground/60 mt-0.5 line-clamp-2">{n.body}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 py-3 bg-sand-50 text-[10px] text-foreground/60">
            💡 Active les notifications navigateur pour être rappelé sur mobile.
          </div>
        </div>
        </>
      )}
    </div>
  );
}
