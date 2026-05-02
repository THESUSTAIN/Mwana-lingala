import React, { useState } from "react";
import { MessageCircle, Share2, Link as LinkIcon, Check, Mail, Heart } from "lucide-react";

/**
 * ShareBlock — Bouton "Partager à un proche"
 * - WhatsApp (lien pré-rempli bilingue Lingala/Français)
 * - Copier le lien
 * - Partage natif (mobile) via Web Share API
 * - Email (mailto fallback)
 */
export default function ShareBlock() {
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://mwana-lingala.com/";
  const shareText =
    "Mbote ! J'ai trouvé une super app pour transmettre le Lingala aux enfants : Mwana Lingala. 5 minutes par jour, en famille. Tala 👇";

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent("Mwana Lingala — Le Lingala pour nos enfants")}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mwana Lingala",
          text: shareText,
          url: shareUrl,
        });
      } catch (_) {
        // user cancelled
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {
      // no-op
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <section className="py-16 lg:py-20" data-testid="share-block">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="ml-card p-8 sm:p-12 bg-gradient-to-br from-leaf-50 via-white to-sand-100 border border-sand-200">
          <div className="flex items-center gap-3 text-brick">
            <Heart className="w-5 h-5" strokeWidth={2.5} />
            <div className="text-sm font-bold uppercase tracking-widest">Diaspora & famille</div>
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">
            Partagez Mwana Lingala <br className="hidden sm:block" />
            <span className="text-leaf">à un proche</span>
          </h2>
          <p className="mt-4 text-foreground/75 text-lg max-w-2xl leading-relaxed">
            Un cousin à Paris, une tata à Bruxelles, un papa à Kinshasa ? Transmettez aussi l’envie
            de transmettre. En un clic, sans inscription.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-whatsapp-btn"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-[#25D366] text-white font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
              WhatsApp
            </a>

            {hasNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                data-testid="share-native-btn"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-brick text-white font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                <Share2 className="w-5 h-5" strokeWidth={2.5} />
                Partager
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              data-testid="share-copy-btn"
              className={`inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 font-bold active:scale-95 transition-all ${
                copied
                  ? "bg-leaf text-white border-leaf"
                  : "bg-white text-foreground border-sand-300 hover:border-leaf"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                  Copié !
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5" strokeWidth={2.5} />
                  Copier le lien
                </>
              )}
            </button>

            <a
              href={mailHref}
              data-testid="share-email-btn"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 border-sand-300 bg-white text-foreground font-bold hover:border-leaf active:scale-95 transition-all"
            >
              <Mail className="w-5 h-5" strokeWidth={2.5} />
              Email
            </a>
          </div>

          <p className="mt-5 text-xs text-foreground/50">
            Merci — chaque partage aide une famille de plus à préserver sa langue.
          </p>
        </div>
      </div>
    </section>
  );
}
