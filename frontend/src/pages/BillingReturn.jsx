import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function BillingReturn() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [type, setType] = useState("");

  useEffect(() => {
    // Mollie doesn't return payment_id in URL reliably; we store last payment in sessionStorage at checkout
    const lastPayment = sessionStorage.getItem("last_payment_id");
    if (!lastPayment) {
      setStatus("unknown");
      return;
    }
    let tries = 0;
    const check = async () => {
      tries += 1;
      try {
        const r = await api.get(`/billing/verify/${lastPayment}`);
        setType(r.data.type);
        if (r.data.status === "paid") {
          setStatus("paid");
          sessionStorage.removeItem("last_payment_id");
          await checkAuth();
        } else if (["failed", "canceled", "expired"].includes(r.data.status)) {
          setStatus(r.data.status);
        } else if (tries < 8) {
          setTimeout(check, 2000);
        } else {
          setStatus("pending");
        }
      } catch {
        if (tries < 4) setTimeout(check, 2000);
        else setStatus("error");
      }
    };
    check();
  }, [checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6" data-testid="billing-return">
      <div className="ml-card p-10 bg-white max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-brick animate-spin" />
            <h1 className="text-2xl font-black mt-4">Vérification du paiement…</h1>
            <p className="text-foreground/70 mt-2">Merci de patienter quelques secondes.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-leaf" />
            <h1 className="text-3xl font-black mt-4">Paiement réussi !</h1>
            <p className="text-foreground/70 mt-2">
              {type === "subscription" ? "Votre abonnement Premium est actif." : "Vos crédits ont été ajoutés à votre compte."}
            </p>
            <button onClick={() => navigate("/app")} className="mt-6 ml-btn-primary" data-testid="return-to-app">
              Retourner à l'app
            </button>
          </>
        )}
        {["failed", "canceled", "expired", "pending", "error", "unknown"].includes(status) && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-brick" />
            <h1 className="text-2xl font-black mt-4">
              {status === "pending" ? "Paiement en attente" : "Paiement non finalisé"}
            </h1>
            <p className="text-foreground/70 mt-2">
              {status === "pending"
                ? "Votre paiement est en cours de traitement, vos crédits arriveront sous peu."
                : "Aucun crédit n'a été retiré. Vous pouvez réessayer."}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button onClick={() => navigate("/tarifs")} className="ml-btn-outline">Voir les tarifs</button>
              <button onClick={() => navigate("/app")} className="ml-btn-primary">Retour à l'app</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
