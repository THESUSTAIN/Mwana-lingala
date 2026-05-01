"""Seed content for Mwana Lingala MVP - 20 mots across 4 themes."""

THEMES = [
    {"slug": "famille", "label_fr": "Famille", "emoji": "family", "order": 1, "is_christian": False},
    {"slug": "nourriture", "label_fr": "Nourriture", "emoji": "apple", "order": 2, "is_christian": False},
    {"slug": "emotions", "label_fr": "Émotions", "emoji": "heart", "order": 3, "is_christian": False},
    {"slug": "bible", "label_fr": "Bible & Valeurs", "emoji": "book", "order": 4, "is_christian": True},
]

# 20 mots: 5 par thème
WORDS = [
    # Famille
    {"lingala": "Mama", "french": "Maman", "theme": "famille", "example_ln": "Mama azali awa", "example_fr": "Maman est ici", "is_christian": False, "image": "https://images.unsplash.com/photo-1547226846-000337daf073?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Tata", "french": "Papa", "theme": "famille", "example_ln": "Tata azali malamu", "example_fr": "Papa va bien", "is_christian": False, "image": "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Ndeko", "french": "Frère ou sœur", "theme": "famille", "example_ln": "Ndeko na ngai", "example_fr": "Mon frère / ma sœur", "is_christian": False, "image": "https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Nkoko", "french": "Grand-parent", "theme": "famille", "example_ln": "Nkoko alingi biso", "example_fr": "Grand-parent nous aime", "is_christian": False, "image": "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Libota", "french": "Famille", "theme": "famille", "example_ln": "Libota na ngai", "example_fr": "Ma famille", "is_christian": False, "image": "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&auto=format&fit=crop&q=60"},

    # Nourriture
    {"lingala": "Mayi", "french": "Eau", "theme": "nourriture", "example_ln": "Nazali komela mayi", "example_fr": "Je bois de l'eau", "is_christian": False, "image": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Bilei", "french": "Nourriture", "theme": "nourriture", "example_ln": "Nazali kolia bilei", "example_fr": "Je mange la nourriture", "is_christian": False, "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Mampa", "french": "Pain", "theme": "nourriture", "example_ln": "Napesi yo mampa", "example_fr": "Je te donne du pain", "is_christian": False, "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Mbuma", "french": "Fruit", "theme": "nourriture", "example_ln": "Mbuma ya kitoko", "example_fr": "Un beau fruit", "is_christian": False, "image": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Miliki", "french": "Lait", "theme": "nourriture", "example_ln": "Mwana amelaka miliki", "example_fr": "L'enfant boit du lait", "is_christian": False, "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60"},

    # Emotions
    {"lingala": "Esengo", "french": "Joie", "theme": "emotions", "example_ln": "Nazali na esengo", "example_fr": "Je suis joyeux", "is_christian": False, "image": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Mawa", "french": "Tristesse", "theme": "emotions", "example_ln": "Nazali na mawa", "example_fr": "Je suis triste", "is_christian": False, "image": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Bolingo", "french": "Amour", "theme": "emotions", "example_ln": "Bolingo monene", "example_fr": "Un grand amour", "is_christian": False, "image": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Nsomo", "french": "Peur", "theme": "emotions", "example_ln": "Kozala na nsomo te", "example_fr": "N'aie pas peur", "is_christian": False, "image": "https://images.unsplash.com/photo-1621274147744-cfb5694bb233?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Kimia", "french": "Paix", "theme": "emotions", "example_ln": "Kimia ezala na yo", "example_fr": "Que la paix soit avec toi", "is_christian": False, "image": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&auto=format&fit=crop&q=60"},

    # Bible / Valeurs (mode chrétien)
    {"lingala": "Nzambe", "french": "Dieu", "theme": "bible", "example_ln": "Nzambe alingi yo", "example_fr": "Dieu t'aime", "is_christian": True, "image": "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Bondimi", "french": "Foi", "theme": "bible", "example_ln": "Bondimi na ngai", "example_fr": "Ma foi", "is_christian": True, "image": "https://images.unsplash.com/photo-1529066792305-5e4efe40cde7?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Matondi", "french": "Merci / gratitude", "theme": "bible", "example_ln": "Toloba matondi", "example_fr": "Disons merci", "is_christian": True, "image": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Yesu", "french": "Jésus", "theme": "bible", "example_ln": "Yesu alingi bana", "example_fr": "Jésus aime les enfants", "is_christian": True, "image": "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&auto=format&fit=crop&q=60"},
    {"lingala": "Losambo", "french": "Prière", "theme": "bible", "example_ln": "Tosambela na Nzambe", "example_fr": "Prions Dieu", "is_christian": True, "image": "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=400&auto=format&fit=crop&q=60"},
]
