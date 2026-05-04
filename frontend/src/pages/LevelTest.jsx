import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import PublicHero from "@/components/PublicHero";
import { ArrowRight, CheckCircle2, Loader2, Sparkles, Award } from "lucide-react";
import { api } from "@/lib/api";

const TITLE = "Test de niveau lingala gratuit (A1, A2, B1, B2) | Mwana Lingala";
const DESC = "Évaluez votre niveau de lingala en 2 minutes. 10 questions du débutant à l'avancé. Recevez votre programme d'apprentissage personnalisé. 100 % gratuit.";

function useMeta() {
  useEffect(() => {
    document.title = TITLE;
    const set = (n, c, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${n}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, n); document.head.appendChild(el); }
      el.setAttribute("content", c);
    };
    set("description", DESC);
    set("keywords", "test de niveau lingala, test lingala, niveau lingala A1 A2 B1, évaluation lingala, quiz lingala");
    set("og:title", TITLE, "property");
    set("og:description", DESC, "property");
    set("og:image", "https://mwana-lingala.com/og-default.jpg", "property");
  }, []);
}

export default function LevelTest() {
  useMeta();
  const navigate = useNavigate();
  const [stage, setStage] = useState("intro"); // "intro" | "quiz" | "email" | "result"
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (stage === "quiz" && questions.length === 0) {
      api.get("/level-test/questions").then((r) => setQuestions(r.data.questions));
    }
  }, [stage, questions.length]);

  const select = (qid, opt) => {
    setAnswers((a) => ({ ...a, [qid]: opt }));
    if (idx < questions.length - 1) setTimeout(() => setIdx((i) => i + 1), 200);
    else setTimeout(() => setStage("email"), 300);
  };

  const submit = async (skipEmail = false) => {
    setBusy(true);
    try {
      const ans = questions.map((q) => answers[q.id] ?? -1);
      const r = await api.post("/level-test/submit", {
        answers: ans,
        email: skipEmail ? null : email.trim() || null,
        name: skipEmail ? null : name.trim() || null,
      });
      setResult(r.data);
      setStage("result");
    } catch (e) {
      alert(e?.response?.data?.detail || "Erreur — réessayez.");
    } finally { setBusy(false); }
  };

  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const progress = questions.length ? ((idx + 1) / questions.length) * 100 : 0;

  return (
    <PublicLayout>
      {stage === "intro" && (
        <PublicHero
          eyebrow="Test gratuit · 2 minutes"
          title={<>Quel est votre <span className="text-leaf">niveau de lingala</span> ?</>}
          description="10 questions, du débutant à l'avancé. À la fin, vous recevez votre niveau (A1, A2, B1, B2) et un programme d'apprentissage personnalisé. Sans inscription obligatoire."
          imageSrc="/images/hero-assistant-ia.png"
          imageAlt="Test de niveau lingala — illustration apprenante avec livre magique"
        >
          <button
            onClick={() => setStage("quiz")}
            className="ml-btn-primary inline-flex items-center gap-2"
            data-testid="leveltest-start"
          >
            Commencer le test <ArrowRight className="w-5 h-5" />
          </button>
        </PublicHero>
      )}

      {stage === "quiz" && questions.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          {/* Progress */}
          <div className="mb-6">
            <div className="text-xs font-black text-foreground/60 uppercase tracking-widest mb-2">
              Question {idx + 1} / {questions.length}
            </div>
            <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
              <div className="h-full bg-leaf transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="ml-card p-7 bg-white">
            <div className="text-xs font-black text-brick uppercase tracking-widest">Niveau {questions[idx].level}</div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 leading-tight" style={{ fontFamily: "Georgia,serif" }}>
              {questions[idx].question}
            </h2>
            <div className="mt-6 space-y-2.5">
              {questions[idx].options.map((opt, i) => {
                const selected = answers[questions[idx].id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => select(questions[idx].id, i)}
                    data-testid={`leveltest-option-${i}`}
                    className={`w-full text-left p-4 rounded-2xl border-2 font-bold transition-all active:scale-[0.99] ${selected ? "border-brick bg-brick-50" : "border-sand-200 bg-white hover:border-leaf-200 hover:bg-sand-50"}`}
                  >
                    <span className="inline-block w-7 h-7 rounded-full bg-sand-100 text-foreground/70 text-sm font-black mr-3 text-center leading-7">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {stage === "email" && (
        <section className="max-w-xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="ml-card p-8 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-leaf-50 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-leaf" />
            </div>
            <h2 className="text-3xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
              Recevez votre niveau et votre programme personnalisé
            </h2>
            <p className="mt-2 text-foreground/70">
              On vous envoie un email avec votre niveau (A1, A2, B1 ou B2) + un plan d'apprentissage adapté + 5 phrases lingala bonus.
            </p>
            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre prénom (optionnel)"
                className="w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
                data-testid="leveltest-name"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full border-2 rounded-2xl px-4 py-3 bg-sand-50 outline-none focus:border-brick"
                data-testid="leveltest-email"
                autoFocus
              />
            </div>
            <button
              onClick={() => submit(false)}
              disabled={busy || !validEmail}
              className="mt-5 w-full ml-btn-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="leveltest-submit-with-email"
            >
              {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Calcul…</>) : (<>Voir mon niveau <ArrowRight className="w-5 h-5" /></>)}
            </button>
            <button
              onClick={() => submit(true)}
              disabled={busy}
              className="mt-3 w-full text-sm font-bold text-foreground/60 hover:text-foreground py-2"
              data-testid="leveltest-skip"
            >
              Passer sans email →
            </button>
          </div>
        </section>
      )}

      {stage === "result" && result && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="ml-card p-8 bg-white text-center">
            <div className="w-20 h-20 rounded-2xl bg-sun-100 flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-brick" />
            </div>
            <div className="text-xs font-black text-leaf uppercase tracking-widest">Votre niveau</div>
            <h2 className="text-6xl sm:text-7xl font-black mt-2 text-brick" style={{ fontFamily: "Georgia,serif" }}>
              {result.result.level}
            </h2>
            <div className="text-xl font-black mt-1">{result.result.label}</div>
            <div className="text-sm text-foreground/60 mt-1">Score : {result.score}/{result.max_score}</div>
            <p className="mt-5 text-foreground/80 leading-relaxed">{result.result.description}</p>
            <div className="mt-5 ml-card p-5 bg-leaf-50 border border-leaf-100 text-left">
              <div className="text-xs font-black text-leaf uppercase tracking-widest">Prochaine étape</div>
              <p className="mt-1 text-foreground/80">{result.result.next_step}</p>
            </div>
            <Link to="/login" className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brick text-white font-black hover:bg-brick-600 active:scale-95 transition-transform" data-testid="leveltest-cta-app">
              Lancer mon programme dans l'app <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Detailed breakdown (collapsible-style) */}
          <details className="mt-6 ml-card p-5 bg-white" data-testid="leveltest-breakdown">
            <summary className="font-black cursor-pointer">Voir le détail des réponses ({result.breakdown.filter((b) => b.is_correct).length}/{result.breakdown.length} correctes)</summary>
            <ul className="mt-4 space-y-3">
              {result.breakdown.map((b, i) => (
                <li key={b.id} className="text-sm p-3 rounded-xl bg-sand-50">
                  <div className="font-bold mb-1">
                    {b.is_correct ? "✓" : "✗"} Question {i + 1}
                  </div>
                  <div className="text-foreground/70">{b.explain}</div>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </PublicLayout>
  );
}
