"""SEO metadata for blog articles — enriches blog_data.ARTICLES without touching content.

Provides hero images (Unsplash / custom), author, dates, canonical URLs, FAQ entries
for rich snippets, and Open Graph fields. Merged into each article by server.py.
"""

SITE_URL = "https://mwana-lingala.com"

DEFAULT_AUTHOR = {
    "name": "L'équipe Mwana Lingala",
    "role": "Linguistes & parents de la diaspora congolaise",
    "picture": f"{SITE_URL}/images/icon-512.png",
    "url": SITE_URL,
}

# Maps blog slug → SEO metadata. All images are stored in /app/frontend/public/images/blog/.
# Using high-quality Unsplash URLs until custom illustrations are produced.
META = {
    "je-t-aime-en-lingala": {
        "hero_image": "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Un couple congolais qui se regarde tendrement — Nalingi yo signifie « Je t'aime » en Lingala",
        "published_at": "2026-04-12T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Comment dit-on « Je t'aime » en Lingala ?", "a": "« Je t'aime » en Lingala se dit Nalingi yo, prononcé na-LIN-gi yo."},
            {"q": "Que veut dire Bolingo ?", "a": "Bolingo est le mot Lingala pour « l'amour ». On dit Bolingo ya solo (amour vrai) ou Nazali na bolingo na yo (j'ai de l'amour pour toi)."},
            {"q": "Comment dire « Je t'aime, mon enfant » en Lingala ?", "a": "On dit Nalingi yo mwana na ngai — c'est l'expression la plus tendre pour un parent."},
            {"q": "Comment dire « Tu me manques » en Lingala ?", "a": "On dit Nazali kokanisa yo, qui veut littéralement dire « Je pense à toi »."},
        ],
    },
    "bonjour-en-lingala": {
        "hero_image": "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Deux amis africains se saluent chaleureusement — « Bonjour » en Lingala se dit Mbote",
        "published_at": "2026-04-10T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Comment dit-on « Bonjour » en Lingala ?", "a": "« Bonjour » en Lingala se dit Mbote, prononcé m-BO-té."},
            {"q": "Comment dire « Merci » en Lingala ?", "a": "« Merci » en Lingala se dit Mercí ou Natondi yo (forme traditionnelle)."},
            {"q": "Comment dire « Au revoir » en Lingala ?", "a": "« Au revoir » se dit Tokomonana (« on se revoit ») ou simplement Kende malamu (« bon voyage »)."},
            {"q": "Comment dire « Comment ça va ? » en Lingala ?", "a": "On dit Ozali malamu ? — la réponse typique est Nazali malamu (« je vais bien »)."},
        ],
    },
    "traduction-francais-lingala-guide": {
        "hero_image": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Dictionnaire français-lingala ouvert — traduction bilingue pour apprenants",
        "published_at": "2026-04-08T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Existe-t-il un traducteur français-lingala en ligne gratuit ?", "a": "Oui, l'outil gratuit Mwana Lingala Traduction permet de traduire en un clic, avec audio natif et exemples."},
            {"q": "Le Lingala a-t-il un alphabet ?", "a": "Le Lingala utilise l'alphabet latin avec 7 voyelles (a, e, ɛ, i, o, ɔ, u) et emprunte la notation française dans la pratique courante."},
            {"q": "Combien de mots faut-il connaître pour parler Lingala ?", "a": "Avec 500 mots de vocabulaire, on peut tenir 90 % des conversations quotidiennes. Mwana Lingala propose 87 mots essentiels pour démarrer."},
        ],
    },
    "apprendre-lingala-enfant": {
        "hero_image": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Un parent congolais apprend le Lingala à son enfant — transmission linguistique familiale",
        "published_at": "2026-04-05T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "À quel âge apprendre le Lingala à son enfant ?", "a": "Dès la naissance ! Le cerveau d'un bébé distingue les sons de toutes les langues jusqu'à 1 an. Plus vous commencez tôt, meilleur sera l'accent natif."},
            {"q": "Combien de temps par jour ?", "a": "5 à 10 minutes quotidiennes suffisent. La régularité compte plus que la durée."},
            {"q": "Mon enfant ne parle que français, est-ce trop tard ?", "a": "Non ! Entre 4 et 10 ans, l'enfant apprend encore très vite une 2ème langue. Mwana Lingala propose un parcours progressif adapté à chaque âge."},
        ],
    },
    "mots-lingala-indispensables": {
        "hero_image": "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Tableau de mots essentiels en Lingala — vocabulaire de base pour débutants",
        "published_at": "2026-04-02T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Quels sont les 10 mots Lingala les plus utiles ?", "a": "Mbote (bonjour), Mercí (merci), Yo (toi), Ngai (moi), Mama (maman), Tata (papa), Ndako (maison), Mai (eau), Bilei (nourriture), Malamu (bien)."},
            {"q": "Peut-on apprendre le Lingala seul ?", "a": "Oui, surtout avec une app comme Mwana Lingala qui donne audio natif, quiz et exemples en contexte."},
        ],
    },
    "apprendre-le-lingala-guide-debutant": {
        "hero_image": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Cahier de notes ouvert pour apprendre le lingala — guide complet pour débutant 2026",
        "published_at": "2026-05-01T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Combien de temps pour parler lingala couramment ?", "a": "Avec 5 minutes par jour et une méthode structurée, vous atteignez le niveau A2 (conversation simple) en 6 mois. En 12 mois, vous tenez 80 % des conversations quotidiennes."},
            {"q": "Le lingala est-il difficile à apprendre pour un francophone ?", "a": "Non, le lingala est l'une des langues bantoues les plus accessibles : alphabet latin, prononciation régulière, et de nombreux mots empruntés au français (mercí, eskolo, ofisi…)."},
            {"q": "Combien de mots faut-il connaître pour parler lingala ?", "a": "50 mots couvrent 80 % des conversations quotidiennes. 200 mots vous permettent de tenir une vraie conversation. Mwana Lingala propose 87 mots essentiels avec audio natif."},
            {"q": "Comment apprendre le lingala gratuitement ?", "a": "Plusieurs ressources gratuites existent : l'app Mwana Lingala (20 mots offerts), Wikipedia Lingala, YouTube communautaire, et le traducteur français-lingala instantané sur mwana-lingala.com."},
        ],
    },
    "comment-apprendre-lingala-enfant": {
        "hero_image": "https://images.unsplash.com/photo-1558877385-8c1cb1ed5d57?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Père qui apprend le lingala à sa fille à la maison — méthode douce 5 minutes par jour",
        "published_at": "2026-04-28T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "À quel âge commencer à apprendre le lingala à son enfant ?", "a": "Dès la naissance idéalement. Le cerveau d'un bébé distingue tous les sons de toutes les langues jusqu'à 12 mois. Mais il n'est jamais trop tard : entre 4 et 10 ans, l'enfant apprend très vite une 2ème langue."},
            {"q": "Mon enfant ne parle que français — c'est trop tard ?", "a": "Non, absolument pas. À 7 ans, votre enfant peut encore atteindre un excellent niveau en 12 mois avec 5 min/jour. L'accent natif est plus difficile, mais l'identité culturelle prime."},
            {"q": "Combien de temps par jour faut-il dédier au lingala ?", "a": "5 minutes suffisent — la régularité bat la durée. Une étude de l'université de l'Oregon prouve que 5 min/jour est plus efficace que 2h une fois par semaine."},
            {"q": "Que faire si je ne parle pas bien lingala moi-même ?", "a": "Apprenez avec votre enfant : c'est la méthode la plus efficace ! Utilisez les audios natifs de Mwana Lingala pour combler vos lacunes, et faites parler les grands-parents par WhatsApp."},
        ],
    },
    "histoire-du-lingala-origine-evolution": {
        "hero_image": "https://images.unsplash.com/photo-1602702275803-1095e9b69cb1?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Fleuve Congo et Kinshasa au coucher du soleil — berceau historique du lingala",
        "published_at": "2026-04-25T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Qui parle lingala dans le monde aujourd'hui ?", "a": "Plus de 45 millions de personnes : 30 millions en RDC, 5 millions au Congo-Brazzaville, et 3 millions dans la diaspora (France, Belgique, USA, Canada, Afrique du Sud)."},
            {"q": "Le lingala est-il une langue bantoue ?", "a": "Oui, le lingala fait partie de la famille bantoue, qui compte plus de 500 langues parlées en Afrique subsaharienne. Il dérive principalement du bobangi, langue des pêcheurs du fleuve Congo."},
            {"q": "Pourquoi le lingala est devenu si populaire ?", "a": "Trois raisons : (1) la rumba congolaise des années 1960 l'a popularisé en Afrique entière, (2) l'armée coloniale puis l'Église l'ont diffusé à Kinshasa, (3) sa prononciation régulière le rend facile à apprendre."},
        ],
    },
    "compter-en-lingala-chiffres-1-100": {
        "hero_image": "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&q=80&auto=format&fit=crop",
        "hero_image_alt": "Tableau noir avec chiffres écrits — apprendre à compter en lingala de 1 à 100",
        "published_at": "2026-04-22T09:00:00Z",
        "updated_at": "2026-05-02T00:00:00Z",
        "faq": [
            {"q": "Comment dit-on 1 en lingala ?", "a": "« Un » en lingala se dit Moko, prononcé mo-KO."},
            {"q": "Comment construire le nombre 35 en lingala ?", "a": "On dit « Tuku misato na mitano » : tuku misato (30) + na (et) + mitano (5)."},
            {"q": "Pourquoi apprendre à compter en lingala aux enfants ?", "a": "Les chiffres sont les premiers mots utilisables au quotidien (âge, jouets, doigts) et favorisent la mémorisation par associations visuelles. C'est aussi un pont vers les autres langues bantoues (swahili, kikongo)."},
        ],
    },
}


def enrich_article(article: dict) -> dict:
    """Merge core article dict with SEO metadata for the matching slug."""
    slug = article.get("slug", "")
    extra = META.get(slug, {})
    merged = dict(article)  # shallow copy; content_md stays intact
    # Hero image + alt (fallback to open-graph default)
    merged["hero_image"] = extra.get(
        "hero_image",
        f"{SITE_URL}/images/famille-couple-bebe.png",
    )
    merged["hero_image_alt"] = extra.get(
        "hero_image_alt",
        article.get("title", "Mwana Lingala"),
    )
    merged["published_at"] = extra.get("published_at", "2026-04-01T09:00:00Z")
    merged["updated_at"] = extra.get("updated_at", "2026-05-02T00:00:00Z")
    merged["author"] = extra.get("author", DEFAULT_AUTHOR)
    merged["canonical"] = f"{SITE_URL}/blog/{slug}"
    merged["faq"] = extra.get("faq", [])
    # Derive Open Graph image (use the hero image)
    merged["og_image"] = merged["hero_image"]
    return merged
