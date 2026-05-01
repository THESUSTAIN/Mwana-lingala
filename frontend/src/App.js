import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import {
  CommentCaMarche,
  PourquoiLingala,
  Tarifs,
  AssistantIA,
  Faq,
  Contact,
  MentionsLegales,
} from "@/pages/PublicPages";
import Dashboard from "@/pages/app/Dashboard";
import ModeBebe from "@/pages/app/ModeBebe";
import ModeEnfant from "@/pages/app/ModeEnfant";
import Quiz from "@/pages/app/Quiz";
import ModeParent from "@/pages/app/ModeParent";
import ModeChretien from "@/pages/app/ModeChretien";
import Onboarding from "@/pages/app/Onboarding";
import MissionLingala from "@/pages/app/MissionLingala";
import Assistant from "@/pages/app/Assistant";
import Jouer from "@/pages/app/Jouer";
import PalaisMental from "@/pages/app/PalaisMental";
import Memoire from "@/pages/app/Memoire";
import Parametres from "@/pages/app/Parametres";
import WeeklyProgram from "@/pages/app/WeeklyProgram";
import Admin from "@/pages/app/Admin";
import BillingReturn from "@/pages/BillingReturn";

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-10 text-center bg-white">
      <div>
        <div className="text-6xl font-black text-brick">404</div>
        <p className="mt-3 text-foreground/70">Cette page n’existe pas.</p>
        <a href="/" className="ml-btn-primary mt-6 inline-block">Retour à l’accueil</a>
      </div>
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback from URL hash fragment first (race-safe)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
      <Route path="/pourquoi-lingala" element={<PourquoiLingala />} />
      <Route path="/tarifs" element={<Tarifs />} />
      <Route path="/assistant-ia" element={<AssistantIA />} />
      <Route path="/faq" element={<Faq />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/login" element={<Login />} />

      {/* Auth-gated app */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bebe" element={<ModeBebe />} />
        <Route path="enfant" element={<ModeEnfant />} />
        <Route path="enfant/jouer" element={<Jouer />} />
        <Route path="enfant/jouer/palais-mental" element={<PalaisMental />} />
        <Route path="enfant/jouer/memoire" element={<Memoire />} />
        <Route path="enfant/quiz" element={<Quiz />} />
        <Route path="parent" element={<ModeParent />} />
        <Route path="chretien" element={<ModeChretien />} />
        <Route path="mission" element={<MissionLingala />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="programme" element={<WeeklyProgram />} />
        <Route path="parametres" element={<Parametres />} />
        <Route path="admin" element={<Admin />} />
      </Route>

      <Route
        path="/billing/return"
        element={
          <ProtectedRoute>
            <BillingReturn />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
