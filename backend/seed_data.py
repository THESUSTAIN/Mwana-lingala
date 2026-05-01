"""Seed content for Mwana Lingala — extended dictionary with free/premium tiering.

Free tier: 20 mots (les originaux MVP).
Premium tier: 60+ mots supplémentaires sur 7 nouveaux thèmes.
"""

THEMES = [
    {"slug": "famille", "label_fr": "Famille", "emoji": "family", "order": 1, "is_christian": False},
    {"slug": "nourriture", "label_fr": "Nourriture", "emoji": "apple", "order": 2, "is_christian": False},
    {"slug": "emotions", "label_fr": "Émotions", "emoji": "heart", "order": 3, "is_christian": False},
    {"slug": "bible", "label_fr": "Bible & Valeurs", "emoji": "book", "order": 4, "is_christian": True},
    {"slug": "animaux", "label_fr": "Animaux", "emoji": "animal", "order": 5, "is_christian": False},
    {"slug": "couleurs", "label_fr": "Couleurs", "emoji": "rainbow", "order": 6, "is_christian": False},
    {"slug": "nombres", "label_fr": "Nombres", "emoji": "numbers", "order": 7, "is_christian": False},
    {"slug": "corps", "label_fr": "Corps humain", "emoji": "body", "order": 8, "is_christian": False},
    {"slug": "salutations", "label_fr": "Salutations", "emoji": "wave", "order": 9, "is_christian": False},
    {"slug": "maison", "label_fr": "Maison & objets", "emoji": "home", "order": 10, "is_christian": False},
]


def _w(lingala, french, theme, example_ln, example_fr, christian=False, image="", tier="free"):
    return {
        "lingala": lingala,
        "french": french,
        "theme": theme,
        "example_ln": example_ln,
        "example_fr": example_fr,
        "is_christian": christian,
        "image": image,
        "tier": tier,
    }


WORDS = [
    # === FREE — Famille (5) ===
    _w("Mama", "Maman", "famille", "Mama azali awa", "Maman est ici"),
    _w("Tata", "Papa", "famille", "Tata azali malamu", "Papa va bien"),
    _w("Ndeko", "Frère ou sœur", "famille", "Ndeko na ngai", "Mon frère / ma sœur"),
    _w("Nkoko", "Grand-parent", "famille", "Nkoko alingi biso", "Grand-parent nous aime"),
    _w("Libota", "Famille", "famille", "Libota na ngai", "Ma famille"),

    # === FREE — Nourriture (5) ===
    _w("Mayi", "Eau", "nourriture", "Nazali komela mayi", "Je bois de l'eau"),
    _w("Bilei", "Nourriture", "nourriture", "Nazali kolia bilei", "Je mange la nourriture"),
    _w("Mampa", "Pain", "nourriture", "Napesi yo mampa", "Je te donne du pain"),
    _w("Mbuma", "Fruit", "nourriture", "Mbuma ya kitoko", "Un beau fruit"),
    _w("Miliki", "Lait", "nourriture", "Mwana amelaka miliki", "L'enfant boit du lait"),

    # === FREE — Emotions (5) ===
    _w("Esengo", "Joie", "emotions", "Nazali na esengo", "Je suis joyeux"),
    _w("Mawa", "Tristesse", "emotions", "Nazali na mawa", "Je suis triste"),
    _w("Bolingo", "Amour", "emotions", "Bolingo monene", "Un grand amour"),
    _w("Nsomo", "Peur", "emotions", "Kozala na nsomo te", "N'aie pas peur"),
    _w("Kimia", "Paix", "emotions", "Kimia ezala na yo", "Que la paix soit avec toi"),

    # === FREE — Bible (5) ===
    _w("Nzambe", "Dieu", "bible", "Nzambe alingi yo", "Dieu t'aime", christian=True),
    _w("Bondimi", "Foi", "bible", "Bondimi na ngai", "Ma foi", christian=True),
    _w("Matondi", "Merci / gratitude", "bible", "Toloba matondi", "Disons merci", christian=True),
    _w("Yesu", "Jésus", "bible", "Yesu alingi bana", "Jésus aime les enfants", christian=True),
    _w("Losambo", "Prière", "bible", "Tosambela na Nzambe", "Prions Dieu", christian=True),

    # === PREMIUM — Famille (étendu) ===
    _w("Mobali", "Homme / mari", "famille", "Mobali wa ngai", "Mon mari", tier="premium"),
    _w("Mwasi", "Femme / épouse", "famille", "Mwasi wa ngai", "Mon épouse", tier="premium"),
    _w("Mwana", "Enfant", "famille", "Mwana na ngai", "Mon enfant", tier="premium"),
    _w("Bana", "Enfants", "famille", "Bana ya kitoko", "Les beaux enfants", tier="premium"),
    _w("Yaya", "Aîné(e)", "famille", "Yaya na ngai", "Mon grand frère / grande sœur", tier="premium"),
    _w("Leki", "Cadet(te)", "famille", "Leki na ngai", "Mon petit frère / petite sœur", tier="premium"),
    _w("Tata-mokolo", "Grand-père", "famille", "Tata-mokolo alingi biso", "Grand-père nous aime", tier="premium"),
    _w("Mama-mokolo", "Grand-mère", "famille", "Mama-mokolo asalisi ngai", "Grand-mère m'aide", tier="premium"),

    # === PREMIUM — Nourriture (étendu) ===
    _w("Madesu", "Haricots", "nourriture", "Tolia madesu", "Mangeons des haricots", tier="premium"),
    _w("Loso", "Riz", "nourriture", "Loso na nsoso", "Du riz au poulet", tier="premium"),
    _w("Nsoso", "Poulet", "nourriture", "Nsoso azali kitoko", "Le poulet est bon", tier="premium"),
    _w("Ngulu", "Cochon / porc", "nourriture", "Mosuni ya ngulu", "De la viande de porc", tier="premium"),
    _w("Mbisi", "Poisson", "nourriture", "Mbisi na mayi", "Le poisson dans l'eau", tier="premium"),
    _w("Saka-saka", "Feuilles de manioc", "nourriture", "Saka-saka ezali kitoko", "Le saka-saka est délicieux", tier="premium"),
    _w("Fufu", "Pâte de manioc", "nourriture", "Tolia fufu", "Mangeons du fufu", tier="premium"),
    _w("Mbongo", "Sucre", "nourriture", "Mbongo na kafé", "Du sucre dans le café", tier="premium"),

    # === PREMIUM — Animaux ===
    _w("Mbwa", "Chien", "animaux", "Mbwa azali kobeta", "Le chien aboie", tier="premium"),
    _w("Niau", "Chat", "animaux", "Niau alali", "Le chat dort", tier="premium"),
    _w("Ngombe", "Vache", "animaux", "Ngombe ezali na esobe", "La vache est dans le champ", tier="premium"),
    _w("Ntaba", "Chèvre", "animaux", "Ntaba elie matiti", "La chèvre mange de l'herbe", tier="premium"),
    _w("Nkosi", "Lion", "animaux", "Nkosi azali makasi", "Le lion est fort", tier="premium"),
    _w("Nzoku", "Éléphant", "animaux", "Nzoku ezali monene", "L'éléphant est grand", tier="premium"),
    _w("Ndeke", "Oiseau", "animaux", "Ndeke epimbwa", "L'oiseau vole", tier="premium"),
    _w("Mboka", "Singe", "animaux", "Mboka azali na nzete", "Le singe est dans l'arbre", tier="premium"),

    # === PREMIUM — Couleurs ===
    _w("Mwindo", "Noir", "couleurs", "Lokolo ya mwindo", "Une chaussure noire", tier="premium"),
    _w("Mpembe", "Blanc", "couleurs", "Limpata ya mpembe", "Un drap blanc", tier="premium"),
    _w("Motane", "Rouge", "couleurs", "Pomme ya motane", "Une pomme rouge", tier="premium"),
    _w("Mobesu", "Vert", "couleurs", "Nkasa ya mobesu", "Une feuille verte", tier="premium"),
    _w("Bulé", "Bleu", "couleurs", "Likolo ya bulé", "Un ciel bleu", tier="premium"),
    _w("Saba", "Jaune", "couleurs", "Etumba ya saba", "Une fleur jaune", tier="premium"),

    # === PREMIUM — Nombres (1-10) ===
    _w("Moko", "Un (1)", "nombres", "Moko ya yo", "Un pour toi", tier="premium"),
    _w("Mibale", "Deux (2)", "nombres", "Bana mibale", "Deux enfants", tier="premium"),
    _w("Misato", "Trois (3)", "nombres", "Misato na mesa", "Trois sur la table", tier="premium"),
    _w("Minei", "Quatre (4)", "nombres", "Minei ya yo", "Quatre pour toi", tier="premium"),
    _w("Mitano", "Cinq (5)", "nombres", "Misapi mitano", "Cinq doigts", tier="premium"),
    _w("Motoba", "Six (6)", "nombres", "Motoba na sanduku", "Six dans la boîte", tier="premium"),
    _w("Sambo", "Sept (7)", "nombres", "Mikolo sambo", "Sept jours", tier="premium"),
    _w("Mwambe", "Huit (8)", "nombres", "Mwambe ya kitoko", "Huit beaux", tier="premium"),
    _w("Libwa", "Neuf (9)", "nombres", "Libwa na nsima", "Neuf après", tier="premium"),
    _w("Zomi", "Dix (10)", "nombres", "Zomi ya yo", "Dix pour toi", tier="premium"),

    # === PREMIUM — Corps humain ===
    _w("Motó", "Tête", "corps", "Motó na ngai elingi te", "Ma tête fait mal", tier="premium"),
    _w("Lobóko", "Main", "corps", "Lobóko ya yo", "Ta main", tier="premium"),
    _w("Lokolo", "Pied / jambe", "corps", "Lokolo ya ngai", "Ma jambe", tier="premium"),
    _w("Liso", "Œil", "corps", "Liso na ngai", "Mon œil", tier="premium"),
    _w("Litoyi", "Oreille", "corps", "Litoyi mibale", "Deux oreilles", tier="premium"),
    _w("Monoko", "Bouche", "corps", "Monoko ya kitoko", "Une jolie bouche", tier="premium"),
    _w("Zolo", "Nez", "corps", "Zolo monene", "Un grand nez", tier="premium"),
    _w("Motema", "Cœur", "corps", "Motema na ngai", "Mon cœur", tier="premium"),

    # === PREMIUM — Salutations ===
    _w("Mbote", "Bonjour", "salutations", "Mbote na yo!", "Bonjour à toi !", tier="premium"),
    _w("Botala", "Au revoir", "salutations", "Botala malamu", "Au revoir et bien", tier="premium"),
    _w("Lala malamu", "Bonne nuit", "salutations", "Lala malamu mwana", "Bonne nuit mon enfant", tier="premium"),
    _w("Sango nini?", "Comment ça va ?", "salutations", "Sango nini, ndeko?", "Comment ça va, frère ?", tier="premium"),
    _w("Malamu", "Bien", "salutations", "Nazali malamu", "Je vais bien", tier="premium"),
    _w("Limbisa ngai", "Pardon", "salutations", "Limbisa ngai mwana", "Pardonne-moi mon enfant", tier="premium"),
    _w("Nalingi yo", "Je t'aime", "salutations", "Nalingi yo mingi", "Je t'aime beaucoup", tier="premium"),

    # === PREMIUM — Maison & objets ===
    _w("Ndako", "Maison", "maison", "Ndako ya kitoko", "Une belle maison", tier="premium"),
    _w("Mesa", "Table", "maison", "Mesa ya monene", "Une grande table", tier="premium"),
    _w("Kiti", "Chaise", "maison", "Kiti mibale", "Deux chaises", tier="premium"),
    _w("Mbeto", "Lit", "maison", "Mbeto ya kitoko", "Un beau lit", tier="premium"),
    _w("Sanduku", "Boîte", "maison", "Sanduku ekangi", "La boîte est fermée", tier="premium"),
    _w("Buku", "Livre", "maison", "Buku ya kitoko", "Un beau livre", tier="premium"),

    # === PREMIUM — Bible (étendu) ===
    _w("Bana ya Nzambe", "Enfants de Dieu", "bible", "Tozali bana ya Nzambe", "Nous sommes enfants de Dieu", christian=True, tier="premium"),
    _w("Bolóngani", "Justice", "bible", "Bolóngani ya Nzambe", "La justice de Dieu", christian=True, tier="premium"),
    _w("Boboto", "Bonté", "bible", "Boboto ya Nzambe", "La bonté de Dieu", christian=True, tier="premium"),
    _w("Limbisi", "Pardon", "bible", "Limbisi ya Nzambe", "Le pardon de Dieu", christian=True, tier="premium"),
    _w("Lola", "Ciel", "bible", "Lola ya Nzambe", "Le ciel de Dieu", christian=True, tier="premium"),
    _w("Bomoi", "Vie", "bible", "Nzambe apesa biso bomoi", "Dieu nous donne la vie", christian=True, tier="premium"),
]
