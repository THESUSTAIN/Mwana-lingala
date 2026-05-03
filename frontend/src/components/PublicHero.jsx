import React from "react";

/**
 * Reusable hero section for public pages — matches homepage visual language
 * (warm pastel gradient + Nano Banana watercolor illustration on the right).
 *
 * Props:
 * - eyebrow: small label above the H1 (e.g. "Comment ça marche")
 * - title: main H1 (you can include `<span class="text-leaf">…</span>` for color)
 * - description: paragraph under H1
 * - imageSrc / imageAlt: hero illustration
 * - children: optional CTA buttons / extra content under the description
 */
export default function PublicHero({ eyebrow, title, description, imageSrc, imageAlt, children }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sun-50 via-white to-leaf-50 pt-12 pb-16 sm:pt-16 sm:pb-20" data-testid="public-hero">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            {eyebrow && (
              <div className="text-xs font-black text-brick uppercase tracking-widest" data-testid="hero-eyebrow">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05]" style={{ fontFamily: "Georgia,serif" }}>
              {title}
            </h1>
            {description && (
              <p className="mt-5 text-lg text-foreground/75 leading-relaxed">{description}</p>
            )}
            {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
          </div>
          <div className="relative">
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="eager"
              fetchpriority="high"
              className="w-full rounded-3xl shadow-2xl object-cover aspect-[4/5] sm:aspect-[4/5] lg:aspect-[4/5]"
              data-testid="hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
