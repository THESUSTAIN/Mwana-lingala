import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Testimonials() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/testimonials").then((r) => setItems(r.data || [])).catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <div className="grid md:grid-cols-3 gap-6" data-testid="testimonials-grid">
      {items.map((t) => (
        <figure key={t.testimonial_id} className="ml-card p-5 bg-white" data-testid={`testimonial-${t.testimonial_id}`}>
          {t.image && (
            <img src={t.image} alt={t.author_name} className="w-full aspect-[4/3] object-cover rounded-2xl" />
          )}
          <blockquote className="mt-4 italic text-foreground/80 leading-relaxed">« {t.quote} »</blockquote>
          <figcaption className="mt-3 text-sm font-bold text-leaf">
            — {t.author_name}{t.author_role ? `, ${t.author_role}` : ""}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
