import sqlite3
import os

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

# SEED DATA
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
    (1, 'Ясли (1 - 3 года)', 1),
    (2, 'Сад (3 - 7 лет)', 2),
    (3, 'Персонал / Сотрудники', 3)
]
for cid, cname, cpp in categories_detok:
    cur.execute('INSERT OR REPLACE INTO KATEGORII_DETOK (ID, NAME, NOMER_PP) VALUES (?, ?, ?)', (cid, cname, cpp))
    cur.execute('INSERT OR REPLACE INTO KATEGORII_EDOKOV (ID, NAME, NOMER_PP) VALUES (?, ?, ?)', (cid, cname, cpp))

products_list = [
    (1, 'Молоко пастеризованное 2.5%', 3, 2.8, 2.5, 4.7, 52, 'л', 35.0, 0, 1),
    (2, 'Масло сливочное 82.5%', 9, 0.8, 82.5, 0.8, 748, 'кг', 280.0, 0, 2),
    (3, 'Хлеб пшеничный', 1, 7.9, 1.0, 48.3, 235, 'кг', 24.0, 0, 3),
    (4, 'Хлеб ржано-пшеничный', 1, 6.6, 1.2, 39.6, 196, 'кг', 26.0, 0, 4),
    (5, 'Картофель свежий', 6, 2.0, 0.4, 18.1, 80, 'кг', 15.0, 25.0, 5),
    (6, 'Морковь свежая', 6, 1.3, 0.1, 6.9, 32, 'кг', 18.0, 20.0, 6),
    (7, 'Свекла свежая', 6, 1.5, 0.1, 8.8, 40, 'кг', 16.0, 20.0, 7),
    (8, 'Капуста белокочанная', 6, 1.8, 0.1, 4.7, 27, 'кг', 14.0, 20.0, 8),
    (9, 'Лук репчатый', 6, 1.4, 0.2, 8.2, 41, 'кг', 12.0, 16.0, 9),
    (10, 'Яблоки свежие', 7, 0.4, 0.4, 9.8, 47, 'кг', 45.0, 12.0, 10),
    (11, 'Крупа гречневая', 2, 12.6, 3.3, 62.1, 313, 'кг', 48.0, 0, 11),
    (12, 'Крупа рисовая', 2, 7.0, 1.0, 74.0, 330, 'кг', 38.0, 0, 12),
    (13, 'Макаронные изделия', 2, 10.4, 1.1, 71.5, 337, 'кг', 32.0, 0, 13),
    (14, 'Мясо куры (филе)', 4, 20.8, 8.8, 0.6, 165, 'кг', 140.0, 10.0, 14),
    (15, 'Говядина (мякоть)', 4, 18.9, 12.4, 0.0, 187, 'кг', 220.0, 15.0, 15),
    (16, 'Филе минтая / рыбы', 5, 16.0, 1.0, 0.0, 73, 'кг', 130.0, 10.0, 16),
    (17, 'Сахар-песок', 8, 0.0, 0.0, 99.8, 387, 'кг', 30.0, 0, 17),
    (18, 'Чай черный', 10, 20.0, 5.1, 6.9, 152, 'кг', 350.0, 0, 18),
    (19, 'Какао-порошок', 10, 24.2, 17.5, 27.9, 374, 'кг', 260.0, 0, 19),
    (20, 'Сыр твердый 45%', 3, 26.0, 26.5, 0.0, 343, 'кг', 250.0, 0, 20),
    (21, 'Творог 9%', 3, 16.7, 9.0, 2.0, 156, 'кг', 110.0, 0, 21),
    (22, 'Сметана 15%', 3, 2.6, 15.0, 3.0, 158, 'кг', 95.0, 0, 22),
    (23, 'Яйцо диетическое (шт)', 11, 12.7, 11.5, 0.7, 157, 'шт', 4.5, 0, 23),
    (24, 'Мука пшеничная в/с', 1, 10.3, 1.1, 70.6, 334, 'кг', 22.0, 0, 24),
    (25, 'Масло растительное', 9, 0.0, 99.9, 0.0, 899, 'л', 65.0, 0, 25)
]

for p in products_list:
    cur.execute('''INSERT OR REPLACE INTO PRODUKTS 
        (ID, NAME, ID_GRUPPI_PRODUKTOV, BELKI, ZIRI, UGLEVODI, KALORII, EDINICA_IZMERENIA, CENA, PROCENT_OTXODOV, NOMER_PP)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]))

dishes_list = [
    (1, 'Суп картофельный с крупой рисовой', 'Сварить бульон, добавить картофель и рис, пассерованные овощи.', 1, 200, 3.2, 4.1, 18.5, 123, 1),
    (2, 'Борщ с капустой и картофелем', 'Пассеровать буряк и морковь с томатом, варить в мясном бульоне.', 1, 200, 3.8, 4.5, 16.2, 118, 2),
    (3, 'Котлета куринная паровая', 'Формовать котлеты из фарша филе куры с хлебом и выпекать на пару.', 2, 70, 14.2, 7.8, 6.4, 152, 3),
    (4, 'Тефтели из говядины с соусом', 'Сформировать тефтели с рисом, запекать в соусе.', 2, 80, 13.8, 9.2, 8.1, 171, 4),
    (5, 'Рыба припущенная в молочном соусе', 'Припустить филе минтая, залить молочным соусом.', 2, 70, 12.5, 4.2, 3.9, 104, 5),
    (6, 'Каша гречневая рассыпчатая', 'Варить в соотношении 1:2 с добавлением сливочного масла.', 3, 150, 4.8, 3.9, 31.2, 178, 6),
    (7, 'Пюре картофельное', 'Отварить картофель, размять с горячим молоком и маслом.', 3, 150, 3.1, 4.2, 22.4, 140, 7),
    (8, 'Запеканка творожная с соусом', 'Взбить творог с яйцом и манкой, запечь в духовом шкафу.', 4, 120, 16.5, 9.8, 21.0, 238, 8),
    (9, 'Салат из свежей моркови с яблоком', 'Натереть свежую морковь и яблоки, заправить сахаром и маслом.', 5, 60, 0.8, 2.1, 8.5, 56, 9),
    (10, 'Чай с сахаром', 'Заварить чай, добавить сахар.', 6, 180, 0.2, 0.0, 14.0, 56, 10),
    (11, 'Какао на молоке', 'Сварить какао-порошок на молоке с сахаром.', 6, 180, 3.6, 3.2, 16.8, 110, 11)
]

for d in dishes_list:
    cur.execute('''INSERT OR REPLACE INTO KARTOTEKA_BLUD
        (ID, NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII, PORRDOK_SLEDOVANIR_BLUD)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', d)

components = [
    (1, 1, 5, 1, 35.0, 26.25, 1),
    (2, 1, 12, 1, 10.0, 10.0, 2),
    (3, 1, 6, 1, 10.0, 8.0, 3),
    (4, 1, 9, 1, 5.0, 4.2, 4),
    (5, 1, 2, 1, 3.0, 3.0, 5),
    (6, 3, 14, 1, 60.0, 54.0, 1),
    (7, 3, 3, 1, 12.0, 12.0, 2),
    (8, 3, 1, 1, 15.0, 15.0, 3),
    (9, 3, 2, 1, 3.0, 3.0, 4),
    (10, 7, 5, 1, 160.0, 120.0, 1),
    (11, 7, 1, 1, 30.0, 30.0, 2),
    (12, 7, 2, 1, 5.0, 5.0, 3)
]

for c in components:
    cur.execute('''INSERT OR REPLACE INTO KOMPONENTI_KARTOTEKI
        (ID, ID_BLUDA, ID_PRODUKTA, ID_KATEGORII_DETEJ, GROSSO_GR, NETTO_GR, NOMER_ID_LINII_V_TABLICE)
        VALUES (?, ?, ?, ?, ?, ?, ?)''', c)

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
cur.execute('INSERT OR REPLACE INTO PARTII_NOW (ID, ID_NAKLADNOJ, ID_PRODUKTA, KOLVO_KG, CENA, SUMMA, SROK_GODNOSTI, OST_KG) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    (3, 2, 14, 200.0, 140.0, 28000.0, '2026-08-20', 178.0))

cur.execute('INSERT OR REPLACE INTO SADIKI (ID, NAME, ID_SADIKA, ADRES, TELEFON) VALUES (1, ?, 1, ?, ?)',
    ('ГБОУ Детский сад № 105 Сказка', 'ул. Лесная, д. 14', '+7 (495) 555-01-99'))

menu_entries = [
    (1, 1, '2026-07-23', 1, 'Суп картофельный с крупой рисовой', 1, 'Обед'),
    (2, 1, '2026-07-23', 3, 'Котлета куринная паровая', 2, 'Обед'),
    (3, 1, '2026-07-23', 7, 'Пюре картофельное', 3, 'Обед'),
    (4, 1, '2026-07-23', 10, 'Чай с сахаром', 4, 'Обед')
]

for me in menu_entries:
    cur.execute('''INSERT OR REPLACE INTO MENU
        (ID, ID_ZOY, DATA, ID_BLUDA, NAME_BLUDA, PORRDOK_SLEDOVANIR_BLUD, MEAL_TYPE)
        VALUES (?, ?, ?, ?, ?, ?, ?)''', me)

conn.commit()
print('Database creation complete! Row counts:')
for tbl in ['PRODUKTS', 'GRUPPI_PRODUKTOV', 'GRUPPI_BLUD', 'KARTOTEKA_BLUD', 'KOMPONENTI_KARTOTEKI', 'KATEGORII_DETOK', 'FIRMI', 'NAKLADNIE_PRIXODA', 'PARTII_NOW', 'SADIKI', 'MENU']:
    cur.execute(f'SELECT count(*) FROM {tbl}')
    cnt = cur.fetchone()[0]
    print(f'  Table {tbl:22s}: {cnt} rows')
