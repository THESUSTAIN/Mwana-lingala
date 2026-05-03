import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, ChevronLeft, BookOpen } from "lucide-react";
import { api } from "@/lib/api";

// Simple markdown → HTML renderer (headings, tables, lists, bold, links, blockquote)
function renderMarkdown(md) {
  if (!md) return "";
  let html = md;
  // Code fences (rare here, keep simple)
  // Tables
  html = html.replace(/^\|(.+)\|\s*\n\|([\s:|-]+)\|\s*\n((?:\|.*\|\s*\n?)*)/gm, (_m, header, _align, body) => {
    const hcells = header.split("|").map((cell) => cell.trim()).filter(Boolean);
    const rows = body.trim().split("\n").map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      // Drop the first/last fields if they came from the leading/trailing pipe
      if (cells.length > 0 && cells[0] === "") cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      return cells;
    });
    const th = hcells.map((cell) => `<th class="px-3 py-2 text-left font-black border-b-2 border-sand-200">${cell}</th>`).join("");
    const trs = rows.map((r) => `<tr class="border-b border-sand-100">${r.map((cell) => `<td class="px-3 py-2">${cell}</td>`).join("")}</tr>`).join("");
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
  // Links — internal (starting with /) get a data-internal flag for SPA interception;
  // external links get target=_blank + rel=noopener nofollow ugc to avoid leaking PR
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const isInternal = url.startsWith("/") && !url.startsWith("//");
    if (isInternal) {
      return `<a href="${url}" data-internal="1" class="text-brick font-bold hover:underline">${label}</a>`;
    }
    const isAnchor = url.startsWith("#");
    if (isAnchor) {
      return `<a href="${url}" class="text-brick font-bold hover:underline">${label}</a>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener nofollow" class="text-brick font-bold hover:underline">${label} ↗</a>`;
  });
  // Paragraphs
  html = html.split(/\n{2,}/).map((block) => {
    const t = block.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<blockquote") || t.startsWith("<div") || t.startsWith("<table")) return t;
    return `<p class="my-3 leading-relaxed">${t.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

function useMetaTags(title, description, keywords, url, image) {
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
    if (image) setOg("og:image", image);
    if (image) {
      let tw = document.querySelector('meta[name="twitter:image"]');
      if (!tw) { tw = document.createElement("meta"); tw.setAttribute("name", "twitter:image"); document.head.appendChild(tw); }
      tw.setAttribute("content", image);
    }
    // Canonical link
    if (url) {
      let can = document.querySelector('link[rel="canonical"]');
      if (!can) { can = document.createElement("link"); can.setAttribute("rel", "canonical"); document.head.appendChild(can); }
      can.setAttribute("href", url);
    }
  }, [title, description, keywords, url, image]);
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
              className="ml-card bg-white hover:shadow-lg transition-all active:scale-[0.99] overflow-hidden flex flex-col"
            >
              {a.hero_image && (
                <img
                  src={a.hero_image}
                  alt={a.hero_image_alt || a.title}
                  loading="lazy"
                  className="w-full aspect-[16/9] object-cover"
                />
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black text-leaf uppercase tracking-widest">{a.category}</div>
                  {a.hero_emoji && <div className="text-2xl">{a.hero_emoji}</div>}
                </div>
                <h2 className="mt-3 text-xl font-black leading-tight">{a.title}</h2>
                <p className="mt-2 text-sm text-foreground/70 line-clamp-3 flex-1">{a.meta_description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {a.read_time} min</span>
                  <span className="inline-flex items-center gap-1 text-leaf font-bold">Lire <ArrowRight className="w-3 h-3" /></span>
                </div>
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

function useInterceptInternalLinks(navigate) {
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest("a[data-internal=\"1\"]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http")) return;
      e.preventDefault();
      navigate(href);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [navigate]);
}

export function BlogArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  useInterceptInternalLinks(navigate);
  const [article, setArticle] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setNotFound(false);
    setArticle(null);
    window.scrollTo({ top: 0, behavior: "auto" });
    api.get(`/blog/articles/${slug}`).then((r) => setArticle(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  // Reading progress bar — gives the reader a sense of completion (Nielsen Norman Group: +30 % time on page)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const p = total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0;
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const canonicalUrl = article?.canonical || (typeof window !== "undefined" ? window.location.href : "");
  useMetaTags(
    article?.title ? `${article.title} | Mwana Lingala` : "Blog Lingala",
    article?.meta_description,
    article?.keywords,
    canonicalUrl,
    article?.hero_image,
  );

  // JSON-LD schema.org Article + FAQPage + BreadcrumbList
  useEffect(() => {
    if (!article) return;
    const publisherLogo = "https://mwana-lingala.com/images/icon-512.png";
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://mwana-lingala.com/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://mwana-lingala.com/blog" },
        { "@type": "ListItem", "position": 3, "name": article.title, "item": canonicalUrl },
      ],
    };
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.meta_description,
      "image": article.hero_image ? [article.hero_image] : undefined,
      "datePublished": article.published_at,
      "dateModified": article.updated_at || article.published_at,
      "author": {
        "@type": "Organization",
        "name": article.author?.name || "Mwana Lingala",
        "url": article.author?.url || "https://mwana-lingala.com",
      },
      "publisher": {
        "@type": "Organization",
        "name": "Mwana Lingala",
        "logo": { "@type": "ImageObject", "url": publisherLogo },
      },
      "keywords": (article.keywords || []).join(", "),
      "inLanguage": "fr-FR",
      "mainEntityOfPage": canonicalUrl,
    };
    const faqLd = (article.faq && article.faq.length > 0) ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": article.faq.map((f) => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    } : null;
    const appendLd = (obj, id) => {
      document.querySelector(`#${id}`)?.remove();
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.id = id;
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
    };
    appendLd(breadcrumb, "blog-breadcrumb-ld");
    appendLd(articleLd, "blog-article-ld");
    if (faqLd) appendLd(faqLd, "blog-faq-ld");
    return () => {
      ["blog-breadcrumb-ld", "blog-article-ld", "blog-faq-ld"].forEach((id) => document.querySelector(`#${id}`)?.remove());
    };
  }, [article, canonicalUrl]);

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

  const fmtDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    } catch { return ""; }
  };
  // Remove the first Markdown H1 from content since we now render a styled H1 above
  const contentNoDupTitle = (article.content_md || "").replace(/^# [^\n]*\n+/, "");

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Reading progress bar */}
      <div className="sticky top-0 z-40 h-1 bg-sand-100">
        <div
          className="h-full bg-gradient-to-r from-leaf via-brick to-sun transition-[width] duration-150"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
          data-testid="blog-reading-progress"
        />
      </div>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-foreground/60">
          <Link to="/" className="hover:text-leaf">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-leaf">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground/80 font-bold">{article.category}</span>
        </nav>

        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-leaf mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour au blog
        </Link>

        {/* Title block */}
        <div className="text-xs font-black text-leaf uppercase tracking-widest">{article.category}</div>
        <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight" style={{ fontFamily: "Georgia,serif" }}>
          {article.title}
        </h1>
        <p className="mt-3 text-lg text-foreground/70 leading-relaxed">
          {article.meta_description}
        </p>

        {/* Meta row: author + date + reading time */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/60 border-b-2 border-sand-200 pb-5">
          <span className="inline-flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-leaf-50 flex items-center justify-center text-leaf font-black text-xs">
              {(article.author?.name || "M").slice(0, 1)}
            </span>
            <span className="font-bold text-foreground/80">{article.author?.name || "Mwana Lingala"}</span>
          </span>
          {article.published_at && (
            <time dateTime={article.published_at} className="inline-flex items-center gap-1">
              <span aria-hidden="true">📅</span> {fmtDate(article.published_at)}
            </time>
          )}
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.read_time || 5} min de lecture</span>
        </div>

        {/* Hero image */}
        {article.hero_image && (
          <figure className="mt-6">
            <img
              src={article.hero_image}
              alt={article.hero_image_alt || article.title}
              className="w-full aspect-[16/9] object-cover rounded-3xl shadow-md"
              loading="eager"
              fetchpriority="high"
            />
            {article.hero_image_alt && (
              <figcaption className="mt-2 text-xs text-foreground/50 text-center italic">
                {article.hero_image_alt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none text-foreground mt-8"
          style={{ fontFamily: "Georgia,serif" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(contentNoDupTitle) }}
          data-testid="blog-article-content"
        />

        {/* FAQ (user-visible, paired with JSON-LD FAQPage above) */}
        {article.faq && article.faq.length > 0 && (
          <section className="mt-12" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl sm:text-3xl font-black" style={{ fontFamily: "Georgia,serif" }}>Questions fréquentes</h2>
            <div className="mt-4 space-y-3">
              {article.faq.map((f, idx) => (
                <details key={idx} className="ml-card p-5 bg-white group" data-testid={`blog-faq-${idx}`}>
                  <summary className="font-black cursor-pointer list-none flex items-center justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-brick group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-foreground/80 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related articles — same theme first */}
        {article.related && article.related.length > 0 && (
          <section className="mt-16 pt-10 border-t-2 border-sand-200" aria-labelledby="related-heading">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <div>
                <div className="text-xs font-black text-brick uppercase tracking-widest">À lire ensuite</div>
                <h2 id="related-heading" className="text-2xl sm:text-3xl font-black mt-1" style={{ fontFamily: "Georgia,serif" }}>
                  Continuer dans <span className="text-leaf">{article.category}</span>
                </h2>
              </div>
              <Link to="/blog" className="text-sm font-bold text-leaf hover:underline inline-flex items-center gap-1" data-testid="related-blog-all">
                Tous les articles <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {article.related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  data-testid={`related-${r.slug}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                  className="ml-card bg-white hover:shadow-xl active:scale-[0.98] transition-all overflow-hidden flex flex-col"
                >
                  {r.hero_image && (
                    <img
                      src={r.hero_image}
                      alt={r.title}
                      loading="lazy"
                      className="w-full aspect-[16/10] object-cover"
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[11px] font-black text-leaf uppercase tracking-wider">{r.category}</div>
                    <h3 className="mt-1.5 font-black leading-snug line-clamp-2">{r.title}</h3>
                    <p className="mt-1.5 text-xs text-foreground/60 line-clamp-2 flex-1">{r.meta_description}</p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-foreground/60"><Clock className="w-3 h-3" /> {r.read_time} min</span>
                      <span className="text-brick font-black inline-flex items-center gap-0.5">Lire <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
