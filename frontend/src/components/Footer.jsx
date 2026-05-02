import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-leaf-700 text-white mt-20" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid md:grid-cols-4 gap-8">
        <div>
          <div className="text-2xl font-black">
            <span className="text-sand-200">Mwana</span> <span className="text-brick-100">Lingala</span>
          </div>
          <p className="mt-3 text-sand-100/90 text-sm leading-relaxed">
            Transmettre le Lingala et les valeurs à son enfant, en douceur, sans écran excessif.
          </p>
        </div>
        <div>
          <h4 className="font-black text-sand-200 mb-3">L’app</h4>
          <ul className="space-y-2 text-sand-100/90 text-sm">
            <li><Link className="hover:text-white" to="/comment-ca-marche">Comment ça marche</Link></li>
            <li><Link className="hover:text-white" to="/traduction-lingala">Traduire Lingala</Link></li>
            <li><Link className="hover:text-white" to="/pourquoi-lingala">Pourquoi le Lingala</Link></li>
            <li><Link className="hover:text-white" to="/tarifs">Tarifs</Link></li>
            <li><Link className="hover:text-white" to="/assistant-ia">Assistant IA</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-sand-200 mb-3">Support</h4>
          <ul className="space-y-2 text-sand-100/90 text-sm">
            <li><Link className="hover:text-white" to="/faq">FAQ</Link></li>
            <li><Link className="hover:text-white" to="/blog">Blog Lingala</Link></li>
            <li><Link className="hover:text-white" to="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" to="/mentions-legales">Mentions légales</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-sand-200 mb-3">Rejoindre</h4>
          <p className="text-sand-100/90 text-sm">Créez votre compte en 30 secondes.</p>
          <Link
            to="/login"
            className="inline-block mt-3 px-6 py-3 rounded-full bg-brick text-white font-bold active:scale-95 transition-transform"
            data-testid="footer-cta-login"
          >
            Commencer
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-sand-100/60 text-xs">
        © {new Date().getFullYear()} Mwana Lingala — Transmettre le Lingala à son enfant.
      </div>
    </footer>
  );
}
