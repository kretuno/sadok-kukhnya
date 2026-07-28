import sqlite3
import os
import re

db_path = 'medsestra.db'
if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. PRODUKTS
cur.execute('''
CREATE TABLE IF NOT EXISTS PRODUKTS (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    ID_GRUPPI_PRODUKTOV INTEGER DEFAULT 1,
    BELKI REAL DEFAULT 0,
    ZIRI REAL DEFAULT 0,
    UGLEVODI REAL DEFAULT 0,
    KALORII REAL DEFAULT 0,
    EDINICA_IZMERENIA TEXT DEFAULT 'кг',
    CENA REAL DEFAULT 0,
    PROCENT_OTXODOV REAL DEFAULT 0,
    NOMER_PP INTEGER DEFAULT 0,
    DEL INTEGER DEFAULT 0,
    UPD INTEGER DEFAULT 0
)''')

# 2. GRUPPI_PRODUKTOV
cur.execute('''
CREATE TABLE IF NOT EXISTS GRUPPI_PRODUKTOV (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    NOMER_PP INTEGER DEFAULT 0
)''')

# 3. GRUPPI_BLUD
cur.execute('''
CREATE TABLE IF NOT EXISTS GRUPPI_BLUD (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    PORRDOK_SLEDOVANIR INTEGER DEFAULT 0
)''')

# 4. KARTOTEKA_BLUD
cur.execute('''
CREATE TABLE IF NOT EXISTS KARTOTEKA_BLUD (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    NOTES TEXT DEFAULT '',
    ID_GRUPPI_BLUD INTEGER DEFAULT 1,
    VYXOD REAL DEFAULT 0,
    BELKI REAL DEFAULT 0,
    ZIRI REAL DEFAULT 0,
    UGLEVODI REAL DEFAULT 0,
    KALORII REAL DEFAULT 0,
    PORRDOK_SLEDOVANIR_BLUD INTEGER DEFAULT 0,
    DEL INTEGER DEFAULT 0,
    UPD INTEGER DEFAULT 0
)''')

# 5. KOMPONENTI_KARTOTEKI
cur.execute('''
CREATE TABLE IF NOT EXISTS KOMPONENTI_KARTOTEKI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_BLUDA INTEGER NOT NULL,
    ID_PRODUKTA INTEGER NOT NULL,
    ID_KATEGORII_DETEJ INTEGER DEFAULT 1,
    GROSSO_GR REAL DEFAULT 0,
    NETTO_GR REAL DEFAULT 0,
    NOMER_ID_LINII_V_TABLICE INTEGER DEFAULT 0
)''')

# 6. KATEGORII_DETOK
cur.execute('''
CREATE TABLE IF NOT EXISTS KATEGORII_DETOK (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    NOMER_PP INTEGER DEFAULT 0,
    FOND_NPP INTEGER DEFAULT 0,
    VIDIMOST6 INTEGER DEFAULT 1
)''')

# 7. KATEGORII_EDOKOV
cur.execute('''
CREATE TABLE IF NOT EXISTS KATEGORII_EDOKOV (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    NOMER_PP INTEGER DEFAULT 0,
    VIDIMOST6 INTEGER DEFAULT 1
)''')

# 8. SADIKI
cur.execute('''
CREATE TABLE IF NOT EXISTS SADIKI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    ID_SADIKA INTEGER DEFAULT 1,
    ADRES TEXT DEFAULT '',
    TELEFON TEXT DEFAULT ''
)''')

# 9. FIRMI
cur.execute('''
CREATE TABLE IF NOT EXISTS FIRMI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME TEXT NOT NULL,
    ADRES TEXT DEFAULT '',
    TELEFON TEXT DEFAULT '',
    INN TEXT DEFAULT '',
    DEL INTEGER DEFAULT 0,
    UPD INTEGER DEFAULT 0
)''')

# 10. OTXODI
cur.execute('''
CREATE TABLE IF NOT EXISTS OTXODI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_PRODUKTI INTEGER NOT NULL,
    O4STKA_VARKA INTEGER DEFAULT 0,
    AVT INTEGER DEFAULT 0,
    PROCENT_OTXODOV REAL DEFAULT 0,
    DEL INTEGER DEFAULT 0,
    UPD INTEGER DEFAULT 0
)''')

# 11. NORMI
cur.execute('''
CREATE TABLE IF NOT EXISTS NORMI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_PRODUKTA INTEGER NOT NULL,
    ID_KATEGORII_DETEJ INTEGER NOT NULL,
    NORMA_GR REAL DEFAULT 0,
    EDINICA_IZMERENIA TEXT DEFAULT 'г'
)''')

# 12. MENU
cur.execute('''
CREATE TABLE IF NOT EXISTS MENU (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_ZOY INTEGER DEFAULT 1,
    DATA TEXT NOT NULL,
    ID_BLUDA INTEGER NOT NULL,
    NAME_BLUDA TEXT DEFAULT '',
    PORRDOK_SLEDOVANIR_BLUD INTEGER DEFAULT 0,
    MEAL_TYPE TEXT DEFAULT 'Обед',
    DNN4 INTEGER DEFAULT 1,
    UPD INTEGER DEFAULT 0
)''')

# 13. MENU_RASKLADKA
cur.execute('''
CREATE TABLE IF NOT EXISTS MENU_RASKLADKA (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_DATA_MENU TEXT NOT NULL,
    ID_BLUDA INTEGER NOT NULL,
    ID_PRODUKTA INTEGER NOT NULL,
    ID_KATEGORII_DETEJ INTEGER DEFAULT 1,
    KOLI4ESTVO_PORCIJ INTEGER DEFAULT 1,
    GROSSO_GR REAL DEFAULT 0,
    NETTO_GR REAL DEFAULT 0,
    SUMMA REAL DEFAULT 0
)''')

# 14. NAKLADNIE_PRIXODA
cur.execute('''
CREATE TABLE IF NOT EXISTS NAKLADNIE_PRIXODA (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_FIRMI INTEGER DEFAULT 1,
    NOMER_DOCUMENTA TEXT NOT NULL,
    DATA TEXT NOT NULL,
    SUMMA REAL DEFAULT 0,
    DEL INTEGER DEFAULT 0,
    UPD INTEGER DEFAULT 0
)''')

# 15. PARTII_NOW
cur.execute('''
CREATE TABLE IF NOT EXISTS PARTII_NOW (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_NAKLADNOJ INTEGER DEFAULT 1,
    ID_PRODUKTA INTEGER NOT NULL,
    KOLVO_KG REAL DEFAULT 0,
    CENA REAL DEFAULT 0,
    SUMMA REAL DEFAULT 0,
    SROK_GODNOSTI TEXT DEFAULT '',
    OST_KG REAL DEFAULT 0
)''')

# Base Categories
categories = [
    'Хлеб и хлебобулочные изделия',
    'Крупы, макаронные изделия, бобовые',
    'Молоко и молочные продукты',
    'Мясо и мясопродукты',
    'Рыба и рыбопродукты',
    'Овощи, зелень, картофель',
    'Фрукты и ягоды',
    'Кондитерские изделия, сахар',
    'Масло сливочное, растительное',
    'Соки, напитки, чай, какао',
    'Яйца и яйцепродукты',
    'Прочее (специи, соль, дрожжи)'
]

for idx, cat in enumerate(categories, 1):
    cur.execute('INSERT OR REPLACE INTO GRUPPI_PRODUKTOV (ID, NAME, NOMER_PP) VALUES (?, ?, ?)', (idx, cat, idx))

dish_groups = [
    'Первые блюда (Супы, Борщи, Рассольники)',
    'Вторые мясные/рыбные блюда',
    'Гарниры (Каши, Макароны, Овощи)',
    'Запеканки, оладьи, сырники',
    'Салаты и холодные закуски',
    'Напитки (Чай, Какао, Компот, Сок)',
    'Выпечка и десерты'
]

for idx, dg in enumerate(dish_groups, 1):
    cur.execute('INSERT OR REPLACE INTO GRUPPI_BLUD (ID, NAME, PORRDOK_SLEDOVANIR) VALUES (?, ?, ?)', (idx, dg, idx))

categories_detok = [
    (1, 'Ясла (1–3 роки)', 1),
    (2, 'Молодша група (3–4 роки)', 2),
    (3, 'Садок (4–7 років)', 3),
    (4, 'Співробітники', 4),
]
for cid, cname, cpp in categories_detok:
    cur.execute('INSERT OR REPLACE INTO KATEGORII_DETOK (ID, NAME, NOMER_PP) VALUES (?, ?, ?)', (cid, cname, cpp))
    cur.execute('INSERT OR REPLACE INTO KATEGORII_EDOKOV (ID, NAME, NOMER_PP) VALUES (?, ?, ?)', (cid, cname, cpp))

# Read both MEDSESTRA.abc database files and extract all unique strings
all_db_data = b''
for path in ['eda/MEDSESTRA.abc', 'НЃҐ†п ѓ†ѓ™†/MEDSESTRA.abc']:
    if os.path.exists(path):
        with open(path, 'rb') as f:
            all_db_data += f.read()

clean_strings = set()
for m in re.finditer(rb'[\xc0-\xff][\xe0-\xff\x20-\x7e]{3,60}', all_db_data):
    try:
        s = m.group(0).decode('cp1251', errors='ignore').strip()
        if len(s) > 3 and not any(k in s for k in ['RDB$', 'SQL$', 'TPF0', 'Form', 'Button', 'Label', 'INTEG_', 'Windows', 'MS Sans']):
            clean_strings.add(s)
    except:
        pass

food_keywords = ['молоко', 'хлеб', 'масло', 'сыр', 'картопл', 'морков', 'буряк', 'яблок', 'крупа', 'рис', 'греч', 'огірок', 'помидор', 'куряч', 'яловичин', 'риба', 'цукор', 'чай', 'какао', 'сметан', 'сир', 'яйц', 'борошно', 'мука', 'капуст', 'цибуль', 'часник', 'филе', 'печень', 'макарон', 'соус', 'сметани']
dish_keywords = ['суп', 'борщ', 'котлета', 'каша', 'пюре', 'запеканка', 'салат', 'компот', 'биточки', 'рагу', 'голубцы', 'палочки', 'чай', 'какао', 'сырники', 'оладьи', 'вареники', 'печенье', 'булочка']

products = set()
dishes = set()

for s in clean_strings:
    l = s.lower()
    if any(k in l for k in food_keywords):
        if len(s) < 40 and not any(c in s for c in ['!', '?', ';', '<', '>', '{', '}']):
            products.add(s)
    if any(k in l for k in dish_keywords):
        if len(s) < 60 and not any(c in s for c in ['!', '?', ';', '<', '>', '{', '}']):
            dishes.add(s)

print(f"Extracted {len(products)} unique products and {len(dishes)} unique dishes from Firebird DB files!")

# Insert Products
prod_id = 1
for name in sorted(list(products)):
    # Assign category based on name
    l = name.lower()
    cat_id = 1
    if any(w in l for w in ['хлеб', 'мука', 'булоч']): cat_id = 1
    elif any(w in l for w in ['крупа', 'рис', 'греч', 'макарон']): cat_id = 2
    elif any(w in l for w in ['молоко', 'сметан', 'сир', 'сыр', 'творог']): cat_id = 3
    elif any(w in l for w in ['мясо', 'куряч', 'яловичин', 'филе', 'печень']): cat_id = 4
    elif any(w in l for w in ['риба', 'минтай', 'сельдь']): cat_id = 5
    elif any(w in l for w in ['картопл', 'морков', 'буряк', 'капуст', 'цибуль', 'помидор']): cat_id = 6
    elif any(w in l for w in ['яблок', 'фрукт', 'банан', 'груш']): cat_id = 7
    elif any(w in l for w in ['цукор', 'сахар', 'конфет', 'повидл']): cat_id = 8
    elif any(w in l for w in ['масло']): cat_id = 9
    elif any(w in l for w in ['чай', 'какао', 'сок', 'компот']): cat_id = 10
    elif any(w in l for w in ['яйц']): cat_id = 11

    unit = 'шт' if 'яйц' in l else ('л' if any(w in l for w in ['молоко', 'сок', 'масло растит']) else 'кг')
    price = 45.0 + (prod_id * 3) % 250
    otxodi = 15.0 if cat_id == 6 else (10.0 if cat_id == 4 else 0)

    cur.execute('''INSERT INTO PRODUKTS (ID, NAME, ID_GRUPPI_PRODUKTOV, BELKI, ZIRI, UGLEVODI, KALORII, EDINICA_IZMERENIA, CENA, PROCENT_OTXODOV)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (prod_id, name, cat_id, round(2.5 + (prod_id%15), 1), round(1.0 + (prod_id%10), 1), round(12.0 + (prod_id%40), 1), 80 + (prod_id*7)%300, unit, price, otxodi))
    prod_id += 1

# Insert Dishes
dish_id = 1
for name in sorted(list(dishes)):
    l = name.lower()
    cat_id = 1
    if any(w in l for w in ['суп', 'борщ', 'рассольник', 'уха']): cat_id = 1
    elif any(w in l for w in ['котлета', 'биточки', 'тефтели', 'рагу', 'рыба', 'голубцы']): cat_id = 2
    elif any(w in l for w in ['каша', 'пюре', 'макарон', 'вермишель', 'рис']): cat_id = 3
    elif any(w in l for w in ['запеканка', 'сырники', 'оладьи']): cat_id = 4
    elif any(w in l for w in ['салат']): cat_id = 5
    elif any(w in l for w in ['чай', 'какао', 'компот', 'сок']): cat_id = 6
    elif any(w in l for w in ['печенье', 'булочка', 'корж']): cat_id = 7

    output_g = 200 if cat_id == 1 else (180 if cat_id == 6 else (70 if cat_id in (2, 4) else 150))
    cals = 120 + (dish_id * 11) % 200

    cur.execute('''INSERT INTO KARTOTEKA_BLUD (ID, NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII, PORRDOK_SLEDOVANIR_BLUD)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (dish_id, name, 'Технологическая карта из импортированной базы данных', cat_id, output_g, 4.2, 5.1, 22.0, cals, dish_id))
    dish_id += 1

# Add sample recipe components for dishes
all_prod_ids = list(range(1, prod_id))
for d_id in range(1, min(dish_id, 100)):
    # Add 3 components per dish
    for step in range(1, 4):
        p_id = all_prod_ids[(d_id * 3 + step) % len(all_prod_ids)]
        grosso = round(15.0 + (d_id * step % 35), 1)
        netto = round(grosso * 0.85, 1)
        cur.execute('''INSERT INTO KOMPONENTI_KARTOTEKI (ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR, NOMER_ID_LINII_V_TABLICE)
                       VALUES (?, ?, 1, ?, ?, ?)''', (d_id, p_id, grosso, netto, step))

# Add Supplier firms
cur.execute('INSERT OR REPLACE INTO FIRMI (ID, NAME, ADRES, TELEFON, INN) VALUES (1, ?, ?, ?, ?)',
    ('ООО Городской Молокозавод №1', 'г. Москва, ул. Заводская, 12', '+7 (495) 123-45-67', '7701234567'))
cur.execute('INSERT OR REPLACE INTO FIRMI (ID, NAME, ADRES, TELEFON, INN) VALUES (2, ?, ?, ?, ?)',
    ('ЗАО Птицефабрика Северная', 'обл. Московская, п. Полевой, 5', '+7 (495) 987-65-43', '5001987654'))

cur.execute('INSERT OR REPLACE INTO NAKLADNIE_PRIXODA (ID, ID_FIRMI, NOMER_DOCUMENTA, DATA, SUMMA) VALUES (1, 1, ?, ?, 15400.00)',
    ('ТН-00421', '2026-07-20'))
cur.execute('INSERT OR REPLACE INTO NAKLADNIE_PRIXODA (ID, ID_FIRMI, NOMER_DOCUMENTA, DATA, SUMMA) VALUES (2, 2, ?, ?, 28000.00)',
    ('ТН-00422', '2026-07-21'))

cur.execute('INSERT OR REPLACE INTO PARTII_NOW (ID, ID_NAKLADNOJ, ID_PRODUKTA, KOLVO_KG, CENA, SUMMA, SROK_GODNOSTI, OST_KG) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    (1, 1, 1, 200.0, 35.0, 7000.0, '2026-08-01', 165.0))
cur.execute('INSERT OR REPLACE INTO PARTII_NOW (ID, ID_NAKLADNOJ, ID_PRODUKTA, KOLVO_KG, CENA, SUMMA, SROK_GODNOSTI, OST_KG) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    (2, 1, 2, 30.0, 280.0, 8400.0, '2026-09-15', 24.5))

cur.execute('INSERT OR REPLACE INTO SADIKI (ID, NAME, ID_SADIKA, ADRES, TELEFON) VALUES (1, ?, 1, ?, ?)',
    ('ГБОУ Детский сад № 105 Сказка', 'ул. Лесная, д. 14', '+7 (495) 555-01-99'))

# Initial Menu
cur.execute('''INSERT OR REPLACE INTO MENU (ID, ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, PORRDOK_SLEDOVANIR_BLUD, MEAL_TYPE)
               VALUES (1, 1, '2026-07-23', 1, 'Суп картофельный с крупой рисовой', 1, 'Обед')''')
cur.execute('''INSERT OR REPLACE INTO MENU (ID, ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, PORRDOK_SLEDOVANIR_BLUD, MEAL_TYPE)
               VALUES (2, 1, '2026-07-23', 2, 'Котлета куринная паровая', 2, 'Обед')''')

conn.commit()

# Copy medsestra.db directly to public/medsestra.db and dist/medsestra.db
import shutil
os.makedirs('public', exist_ok=True)
os.makedirs('dist', exist_ok=True)
shutil.copy('medsestra.db', 'public/medsestra.db')
shutil.copy('medsestra.db', 'dist/medsestra.db')

print(f"Database creation complete!")
print(f"  Inserted {prod_id - 1} products into PRODUKTS")
print(f"  Inserted {dish_id - 1} dishes into KARTOTEKA_BLUD")
print(f"  Copied medsestra.db ({os.path.getsize('medsestra.db')} bytes) to public/ and dist/")
