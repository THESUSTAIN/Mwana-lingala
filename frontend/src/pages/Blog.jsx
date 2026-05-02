import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock, ChevronLeft, BookOpen } from "lucide-react";
import { api } from "@/lib/api";

// Simple markdown → HTML renderer (headings, tables, lists, bold, links, blockquote)
function renderMarkdown(md) {
  if (!md) return "";
  let html = md;
  // Code fences (rare here, keep simple)
  // Tables
  html = html.replace(/^\|(.+)\|\s*\n\|([\s:|-]+)\|\s*\n((?:\|.*\|\s*\n?)*)/gm, (_m, header, _align, body) => {
    const hcells = header.split("|").map((c) => c.trim()).filter(Boolean);
    const rows = body.trim().split("\n").map((line) => line.split("|").map((c) => c.trim()).filter((_, i, arr) => i !== 0 && i !== arr.length - 1 ? true : c !== ""));
    const th = hcells.map((c) => `<th class="px-3 py-2 text-left font-black border-b-2 border-sand-200">${c}</th>`).join("");
    const trs = rows.map((r) => `<tr class="border-b border-sand-100">${r.map((c) => `<td class="px-3 py-2">${c}</td>`).join("")}</tr>`).join("");
    return `<div class="overflow-x-auto my-4"><table class="w-full text-sm bg-white rounded-2xl overflow-hidden shadow-sm"><thead class="bg-sand-50">${th ? `<tr>${th}</tr>` : ""}</thead><tbody>${trs}</tbody></table></div>`;
  });
  // Headings
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-black mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl sm:text-3xl font-black mt-8 mb-3" style="font-family:Georgia,serif">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl sm:text-4xl font-black mt-2 mb-4" style="font-family:Georgia,serif">$1</h1>');
  // Blockquote
  html = html.replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-brick pl-4 py-1 my-4 italic text-foreground/80">$1</blockquote>');
  // Lists
  html = html.replace(/^(?:- (.+)(?:\n|$))+/gm, (match) => {
    const items = match.trim().split("\n").map((l) => l.replace(/^- /, "")).map((i) => `<li class="ml-5 list-disc">${i}</li>`).join("");
    return `<ul class="my-3 space-y-1">${items}</ul>`;
  });
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-leaf-700">$1</strong>');
  // Italic
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brick font-bold hover:underline">$1</a>');
  // Paragraphs
  html = html.split(/\n{2,}/).map((block) => {
    const t = block.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<blockquote") || t.startsWith("<div") || t.startsWith("<table")) return t;
    return `<p class="my-3 leading-relaxed">${t.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

function useMetaTags(title, description, keywords, url) {
  useEffect(() => {
    if (title) document.title = title;
    const set = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setOg = (prop, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    set("description", description);
    set("keywords", (keywords || []).join(", "));
    setOg("og:title", title);
    setOg("og:description", description);
    setOg("og:type", "article");
    if (url) setOg("og:url", url);
  }, [title, description, keywords, url]);
}

export function BlogIndex() {
  const [items, setItems] = useState([]);
  useMetaTags(
    "Blog Lingala — Apprendre la langue, articles et guides | Mwana Lingala",
    "Articles, guides et astuces pour apprendre le Lingala : traduction, expressions essentielles, méthodes pour transmettre la langue à son enfant.",
    ["blog lingala", "apprendre lingala", "traduction lingala", "expressions lingala"],
    typeof window !== "undefined" ? window.location.href : "",
  );
  useEffect(() => { api.get("/blog/articles").then((r) => setItems(r.data.items || [])); }, []);

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-leaf mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
        <div className="flex items-start gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brick-50 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-brick" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black" style={{ fontFamily: "Georgia,serif" }}>Le Blog Lingala</h1>
            <p className="text-foreground/70 mt-2 max-w-xl">
              Tout ce qu'il faut savoir pour apprendre le Lingala et le transmettre à vos enfants — expressions, traductions, astuces pédagogiques.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {items.map((a) => (
            <Link
              key={a.slug}
              to={`/blog/${a.slug}`}
              data-testid={`blog-card-${a.slug}`}
              className="ml-card p-6 bg-white hover:shadow-lg transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-14 h-14 rounded-2xl bg-sun-100 flex items-center justify-center text-3xl">{a.hero_emoji}</div>
                <div className="text-xs font-black text-leaf uppercase tracking-widest">{a.category}</div>
              </div>
              <h2 className="mt-4 text-xl font-black leading-tight">{a.title}</h2>
              <p className="mt-2 text-sm text-foreground/70 line-clamp-3">{a.meta_description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {a.read_time} min</span>
                <span className="inline-flex items-center gap-1 text-leaf font-bold">Lire <ArrowRight className="w-3 h-3" /></span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 ml-card p-8 bg-gradient-to-br from-leaf-50 to-white text-center">
          <h3 className="text-2xl font-black" style={{ fontFamily: "Georgia,serif" }}>Prêt à commencer ?</h3>
          <p className="mt-2 text-foreground/70 max-w-md mx-auto">
            L'app Mwana Lingala propose 87 mots avec audio natif, des jeux, et un mode adapté à l'âge de votre enfant.
          </p>
          <Link to="/register" className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-leaf text-white font-black hover:bg-leaf-700 active:scale-95">
            Essayer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BlogArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    api.get(`/blog/articles/${slug}`).then((r) => setArticle(r.data)).catch(() => setNotFound(true));
  }, [slug]);
  useMetaTags(
    article?.title ? `${article.title} | Mwana Lingala` : "Blog Lingala",
    article?.meta_description,
    article?.keywords,
    typeof window !== "undefined" ? window.location.href : "",
  );

  // JSON-LD schema.org Article
  useEffect(() => {
    if (!article) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "blog-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.meta_description,
      "keywords": (article.keywords || []).join(", "),
      "inLanguage": "fr-FR",
      "publisher": { "@type": "Organization", "name": "Mwana Lingala", "url": "https://mwana-lingala.com" },
      "mainEntityOfPage": typeof window !== "undefined" ? window.location.href : "",
    });
    document.querySelector("#blog-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { document.querySelector("#blog-jsonld")?.remove(); };
  }, [article]);

  if (notFound) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-black mt-4">Article introuvable</h1>
        <Link to="/blog" className="mt-4 inline-block text-leaf font-bold">Retour au blog</Link>
      </div>
    </div>
  );
  if (!article) return <div className="min-h-screen bg-sand-50 flex items-center justify-center text-foreground/60">Chargement…</div>;

  return (
    <div className="min-h-screen bg-sand-50">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-leaf mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour au blog
        </Link>
        <div className="mb-6">
          <div className="text-xs font-black text-leaf uppercase tracking-widest">{article.category}</div>
          <div className="text-4xl mt-3">{article.hero_emoji}</div>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none text-foreground"
          style={{ fontFamily: "Georgia,serif" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content_md) }}
          data-testid="blog-article-content"
        />

        {/* CTA */}
        <div className="mt-12 ml-card p-6 bg-leaf-50 border-2 border-leaf-100 text-center">
          <div className="font-black text-lg">💡 Vous apprenez plus vite avec une app</div>
          <p className="text-sm text-foreground/70 mt-1">87 mots avec audio, jeux éducatifs, mode adapté à l'âge.</p>
          <Link to="/register" className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-leaf text-white font-black hover:bg-leaf-700 active:scale-95">
            Essayer gratuitement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}
