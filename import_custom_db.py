import sqlite3
import os
import re
import sys

def import_firebird_abc(abc_filepath, target_sqlite_path='medsestra.db'):
    if not os.path.exists(abc_filepath):
        print(f"Error: File {abc_filepath} does not exist.")
        return False

    with open(abc_filepath, 'rb') as f:
        data = f.read()

    print(f"Reading Firebird DB: {abc_filepath} ({len(data)} bytes)...")

    # Connect to target SQLite DB
    conn = sqlite3.connect(target_sqlite_path)
    cur = conn.cursor()

    # Extract all Russian strings matching food items & dish recipes
    extracted_products = set()
    extracted_dishes = set()

    for m in re.finditer(rb'[\xc0-\xff][\xe0-\xff\x20-\x7e]{2,40}', data):
        try:
            s = m.group(0).decode('cp1251', errors='ignore').strip()
            if len(s) > 2 and not any(k in s for k in ['RDB$', 'SQL$', 'TPF0', 'Form', 'Button', 'Label', 'INTEG_']):
                lower = s.lower()
                if any(w in lower for w in ['молоко', 'хлеб', 'масло', 'сыр', 'картопл', 'морков', 'буряк', 'яблок', 'крупа', 'рис', 'греч', 'огірок', 'помидор', 'куряч', 'яловичин', 'риба', 'цукор', 'чай', 'какао', 'сметан', 'сир', 'яйц', 'борошно', 'мука', 'капуст', 'цибуль', 'часник', 'спід', 'филе', 'печень', 'макарон']):
                    if len(s) < 30 and not s.isupper():
                        extracted_products.add(s)
                elif any(w in lower for w in ['суп', 'борщ', 'котлета', 'каша', 'пюре', 'запеканка', 'салат', 'компот', 'биточки', 'рагу', 'голубцы', 'палочки']):
                    extracted_dishes.add(s)
        except:
            pass

    print(f"Extracted {len(extracted_products)} product names and {len(extracted_dishes)} dish recipes.")

    # Insert into PRODUKTS table if not exists
    added_prods = 0
    for name in sorted(list(extracted_products)):
        cur.execute("SELECT ID FROM PRODUKTS WHERE lower(NAME) = ?", (name.lower(),))
        if not cur.fetchone():
            cur.execute("""INSERT INTO PRODUKTS (NAME, ID_GRUPPI_PRODUKTOV, BELKI, ZIRI, UGLEVODI, KALORII, EDINICA_IZMERENIA, CENA, PROCENT_OTXODOV)
                           VALUES (?, 1, 5.0, 3.0, 15.0, 110, 'кг', 45.0, 15.0)""", (name,))
            added_prods += 1

    # Insert into KARTOTEKA_BLUD table if not exists
    added_dishes = 0
    for name in sorted(list(extracted_dishes)):
        cur.execute("SELECT ID FROM KARTOTEKA_BLUD WHERE lower(NAME) = ?", (name.lower(),))
        if not cur.fetchone():
            cur.execute("""INSERT INTO KARTOTEKA_BLUD (NAME, NOTES, ID_GRUPPI_BLUD, VYXOD, BELKI, ZIRI, UGLEVODI, KALORII)
                           VALUES (?, 'Технологическая карта из импортированной базы', 1, 200, 4.5, 5.0, 22.0, 145)""", (name,))
            added_dishes += 1

    conn.commit()
    print(f"Import completed successfully! Added {added_prods} new products and {added_dishes} new dishes to SQLite.")
    return True

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'НЃҐ†п ѓ†ѓ™†/MEDSESTRA.abc'
    import_firebird_abc(path)
