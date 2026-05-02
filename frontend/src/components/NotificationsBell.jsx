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
      // VAPID key placeholder — actual push sending needs server keys
      // We still subscribe so the browser registers the capability
      try {
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true });
        await api.post("/notifications/push-subscription", {
          endpoint: sub.endpoint,
          keys: sub.toJSON()?.keys || {},
        });
      } catch (_e) {
        // Need a VAPID key to subscribe — silently skip for now
      }
    } catch (_e) {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); requestPush(); }}
        data-testid="notifications-bell"
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-full bg-white shadow-sm hover:bg-sand-100 flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {notifs.total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-brick text-white text-[10px] font-black flex items-center justify-center" data-testid="notifications-badge">
            {notifs.total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border-2 border-sand-200 z-40 overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="notifications-panel">
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
      )}
    </div>
  );
}
