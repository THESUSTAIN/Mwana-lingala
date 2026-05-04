"""Adult-learner features: level test, travel phrases, streak tracking, lead magnet."""

# ============================================================================
# LEVEL TEST — 10 progressive questions, scoring → A1 / A2 / B1 / B2
# Each question carries 1 point. Total ≤3=A1, ≤6=A2, ≤8=B1, 9-10=B2.
# ============================================================================
LEVEL_TEST_QUESTIONS = [
    {
        "id": 1,
        "level": "A1",
        "question": "Comment dit-on « Bonjour » en lingala ?",
        "options": ["Mbote", "Asante", "Jambo", "Tata"],
        "answer": 0,
        "explain": "« Mbote » est le bonjour standard en lingala. Asante = swahili.",
    },
    {
        "id": 2,
        "level": "A1",
        "question": "Que signifie « Mama » en lingala ?",
        "options": ["Père", "Mère", "Maison", "Eau"],
        "answer": 1,
        "explain": "« Mama » = mère / maman, comme en français.",
    },
    {
        "id": 3,
        "level": "A1",
        "question": "Comment dit-on « Merci » en lingala ?",
        "options": ["Tokomonana", "Kende malamu", "Mercí (ou Natondi)", "Yebisa"],
        "answer": 2,
        "explain": "« Mercí » est l'emprunt courant ; « Natondi » est la forme traditionnelle.",
    },
    {
        "id": 4,
        "level": "A2",
        "question": "Comment demander « Comment vas-tu ? » en lingala ?",
        "options": ["Olei nini ?", "Ozali malamu ?", "Wapi ndako ?", "Nazali wapi ?"],
        "answer": 1,
        "explain": "« Ozali malamu ? » signifie littéralement « Tu es bien ? ».",
    },
    {
        "id": 5,
        "level": "A2",
        "question": "Que veut dire « Ndako » ?",
        "options": ["Voiture", "École", "Maison", "Ami"],
        "answer": 2,
        "explain": "« Ndako » = maison. « Eskolo » = école. « Voitire » = voiture.",
    },
    {
        "id": 6,
        "level": "A2",
        "question": "Comment dit-on « 5 » en lingala ?",
        "options": ["Misato", "Mibale", "Mitano", "Motoba"],
        "answer": 2,
        "explain": "Mitano = 5. Misato = 3, Mibale = 2, Motoba = 6.",
    },
    {
        "id": 7,
        "level": "B1",
        "question": "Que signifie « Nazali kokanisa yo » ?",
        "options": ["Je t'aime", "Je pense à toi / tu me manques", "Je viens chez toi", "Je suis content"],
        "answer": 1,
        "explain": "Littéralement « Je suis en train de penser à toi » — utilisé pour « tu me manques ».",
    },
    {
        "id": 8,
        "level": "B1",
        "question": "Quel est le préfixe pluriel pour les humains en lingala ?",
        "options": ["mu-", "ba-", "ki-", "ma-"],
        "answer": 1,
        "explain": "« Mu-/mo- » est singulier (mwana = enfant), « ba- » est pluriel (bana = enfants).",
    },
    {
        "id": 9,
        "level": "B1",
        "question": "Comment dire « Je vais à Kinshasa » ?",
        "options": ["Nakei na Kinshasa", "Nazali Kinshasa", "Ngai Kinshasa", "Yo Kinshasa"],
        "answer": 0,
        "explain": "« Nakei » = je vais (verbe kokende au présent), suivi de « na » + lieu.",
    },
    {
        "id": 10,
        "level": "B2",
        "question": "Que signifie l'expression « Liboso ya kosala mosala » ?",
        "options": ["Avant de travailler", "Pendant le travail", "Après le travail", "Chercher du travail"],
        "answer": 0,
        "explain": "« Liboso ya » = avant de. « Mosala » = travail. Donc « Avant de faire le travail ».",
    },
]


def score_to_level(score: int) -> dict:
    """Map raw score (0-10) to CEFR level + descriptor."""
    if score <= 3:
        return {
            "level": "A1",
            "label": "Débutant",
            "description": "Vous connaissez quelques mots de base. C'est le début d'une aventure passionnante !",
            "next_step": "Apprenez les 50 mots les plus utiles avec audio natif — 5 min par jour.",
            "estimated_months_to_a2": 4,
        }
    if score <= 6:
        return {
            "level": "A2",
            "label": "Élémentaire",
            "description": "Vous tenez une conversation simple sur des sujets familiers.",
            "next_step": "Travaillez les phrases du quotidien et la grammaire de base. Niveau B1 en 4-6 mois avec 10 min/jour.",
            "estimated_months_to_b1": 5,
        }
    if score <= 8:
        return {
            "level": "B1",
            "label": "Intermédiaire",
            "description": "Vous gérez les situations courantes en lingala — voyage, famille, achats.",
            "next_step": "Ajoutez des nuances : expressions idiomatiques, registres soutenu/familier, lecture de textes simples.",
            "estimated_months_to_b2": 8,
        }
    return {
        "level": "B2",
        "label": "Avancé",
        "description": "Vous parlez le lingala avec aisance. Bravo !",
        "next_step": "Continuez à pratiquer en immersion (musique, films, conversations natives).",
    }


# ============================================================================
# TRAVEL PHRASES — 50 phrases utiles pour Kinshasa / Brazzaville
# ============================================================================
TRAVEL_PHRASES = [
    # Aéroport / arrivée
    {"category": "Aéroport", "fr": "Bonjour, je viens du Congo (ou retour au pays)", "ln": "Mbote, naye uta na Kongo", "context": "À l'arrivée"},
    {"category": "Aéroport", "fr": "Pouvez-vous m'aider ?", "ln": "Okoki kosalisa ngai ?", "context": "Demander de l'aide"},
    {"category": "Aéroport", "fr": "Où sont les bagages ?", "ln": "Wapi mikumba ?", "context": "Récupération des valises"},
    {"category": "Aéroport", "fr": "Combien coûte un taxi vers le centre-ville ?", "ln": "Taxi ezali boni mpo na centre-ville ?", "context": "Négocier le taxi"},
    # Salutations & politesse
    {"category": "Politesse", "fr": "Bonjour à tous", "ln": "Mbote na bino nionso", "context": "Salutation collective"},
    {"category": "Politesse", "fr": "Comment ça va ?", "ln": "Ozali malamu ?", "context": "Conversation"},
    {"category": "Politesse", "fr": "Je vais bien, merci", "ln": "Nazali malamu, mercí", "context": "Réponse"},
    {"category": "Politesse", "fr": "S'il vous plaît", "ln": "Bondoki", "context": "Demander poliment"},
    {"category": "Politesse", "fr": "Excusez-moi", "ln": "Bolimbisa ngai", "context": "S'excuser"},
    {"category": "Politesse", "fr": "Au revoir", "ln": "Tokomonana", "context": "Quitter quelqu'un"},
    # Hôtel / hébergement
    {"category": "Hôtel", "fr": "Avez-vous une chambre disponible ?", "ln": "Bozali na shambre ya kofanda ?", "context": "Réservation"},
    {"category": "Hôtel", "fr": "Combien coûte la nuit ?", "ln": "Butu ezali boni ?", "context": "Demander le prix"},
    {"category": "Hôtel", "fr": "Est-ce qu'il y a internet ?", "ln": "Ezali na internet ?", "context": "Wifi"},
    {"category": "Hôtel", "fr": "Je voudrais le petit-déjeuner", "ln": "Nalingi déjeuner ya tongo", "context": "Repas"},
    # Restaurant / nourriture
    {"category": "Restaurant", "fr": "Je voudrais commander", "ln": "Nalingi kosumba bilei", "context": "Au restaurant"},
    {"category": "Restaurant", "fr": "C'est délicieux", "ln": "Eleki kitoko", "context": "Compliment"},
    {"category": "Restaurant", "fr": "Avez-vous du poulet à la moambe ?", "ln": "Bozali na nsoso ya mwambe ?", "context": "Plat traditionnel"},
    {"category": "Restaurant", "fr": "L'addition s'il vous plaît", "ln": "Note bondoki", "context": "Payer"},
    {"category": "Restaurant", "fr": "Sans piment, s'il vous plaît", "ln": "Bondoki, sans pili-pili", "context": "Préférence alimentaire"},
    # Transport
    {"category": "Transport", "fr": "Où est l'arrêt de bus ?", "ln": "Wapi arrêt ya bus ?", "context": "Demander le chemin"},
    {"category": "Transport", "fr": "Combien coûte le trajet ?", "ln": "Bopayi ezali boni ?", "context": "Tarif"},
    {"category": "Transport", "fr": "Allons-y", "ln": "Tokende", "context": "Encouragement"},
    {"category": "Transport", "fr": "Arrêtez-vous ici", "ln": "Pemisa awa", "context": "Descendre"},
    # Marché / shopping
    {"category": "Marché", "fr": "Combien ça coûte ?", "ln": "Ezali boni ?", "context": "Demander un prix"},
    {"category": "Marché", "fr": "C'est trop cher", "ln": "Eleki ntalo", "context": "Négocier"},
    {"category": "Marché", "fr": "Pouvez-vous baisser le prix ?", "ln": "Okoki kokitisa ntalo ?", "context": "Marchander"},
    {"category": "Marché", "fr": "Je prends celui-ci", "ln": "Nakozwa oyo", "context": "Acheter"},
    {"category": "Marché", "fr": "Avez-vous la monnaie ?", "ln": "Ozali na mbongo ya makasi ?", "context": "Rendre la monnaie"},
    # Famille / rencontres
    {"category": "Famille", "fr": "Voici ma famille", "ln": "Tala libota na ngai", "context": "Présentation"},
    {"category": "Famille", "fr": "C'est mon enfant", "ln": "Oyo ezali mwana na ngai", "context": "Présenter son enfant"},
    {"category": "Famille", "fr": "Je suis content de vous voir", "ln": "Nazali na esengo komona bino", "context": "Émotion"},
    {"category": "Famille", "fr": "Ma famille vit en France", "ln": "Libota na ngai efandi na France", "context": "Diaspora"},
    # Santé / urgence
    {"category": "Urgence", "fr": "Je suis malade", "ln": "Nazali na bokono", "context": "Santé"},
    {"category": "Urgence", "fr": "Où est l'hôpital ?", "ln": "Wapi lopitalo ?", "context": "Trouver un hôpital"},
    {"category": "Urgence", "fr": "Appelez la police", "ln": "Bombela police", "context": "Urgence"},
    {"category": "Urgence", "fr": "J'ai besoin d'aide", "ln": "Nazali na mposa ya lisalisi", "context": "Demander de l'aide"},
    # Petites phrases utiles
    {"category": "Pratique", "fr": "Je ne comprends pas", "ln": "Nazali kososola te", "context": "Communication"},
    {"category": "Pratique", "fr": "Pouvez-vous répéter ?", "ln": "Okoki kozonga ?", "context": "Faire répéter"},
    {"category": "Pratique", "fr": "Parlez plus lentement, s'il vous plaît", "ln": "Loba moke moke, bondoki", "context": "Demander plus lent"},
    {"category": "Pratique", "fr": "J'apprends le lingala", "ln": "Nazali koyekola lingala", "context": "Expliquer son niveau"},
    {"category": "Pratique", "fr": "Je viens de France", "ln": "Naye uta na France", "context": "Origine"},
    {"category": "Pratique", "fr": "Quel est votre nom ?", "ln": "Kombo na yo nani ?", "context": "Faire connaissance"},
    {"category": "Pratique", "fr": "Mon nom est…", "ln": "Kombo na ngai…", "context": "Se présenter"},
    {"category": "Pratique", "fr": "J'ai faim", "ln": "Nazali na nzala", "context": "Besoins"},
    {"category": "Pratique", "fr": "J'ai soif", "ln": "Nazali na mposa ya mai", "context": "Besoins"},
    {"category": "Pratique", "fr": "Où sont les toilettes ?", "ln": "Wapi cabinets ?", "context": "Pratique"},
    # Encouragement
    {"category": "Émotion", "fr": "C'est magnifique", "ln": "Ezali kitoko mingi", "context": "Compliment"},
    {"category": "Émotion", "fr": "Je suis heureux/heureuse", "ln": "Nazali na esengo", "context": "Émotion positive"},
    {"category": "Émotion", "fr": "Je vous aime beaucoup", "ln": "Nalingi bino mingi", "context": "Affection"},
    {"category": "Émotion", "fr": "Bon voyage", "ln": "Mobembo malamu", "context": "Souhait"},
]
