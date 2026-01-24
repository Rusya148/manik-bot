import sqlite3

def get_db_connection():
    connection = sqlite3.connect('database_client.db')
    return connection

def create_clients_table():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        link TEXT,
        time TEXT,
        day_rec TEXT,
        prepayment REAL DEFAULT 0
    )
    ''')
    connection.commit()
    connection.close()


def migrate_clients_add_prepayment():
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute("PRAGMA table_info(clients)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'prepayment' not in columns:
                cursor.execute("ALTER TABLE clients ADD COLUMN prepayment REAL DEFAULT 0")
                connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка миграции (добавление prepayment): {e}")

def create_salary_table():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS salary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER,
        date TEXT
    )
    ''')
    connection.commit()
    connection.close()

def create_expenses_table():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER,
        date TEXT
    )
    ''')
    connection.commit()
    connection.close()

def save_client(name, link, time, day_rec, prepayment):
    print(f"Saving client with: {name}, {link}, {time}, {day_rec}, prepayment={prepayment}")
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('INSERT INTO clients(name, link, time, day_rec, prepayment) VALUES (?, ?, ?, ?, ?)',
                           (name, link, time, day_rec, prepayment))
            connection.commit()
            print(f"Client {name} saved successfully.")
    except sqlite3.OperationalError as e:
        print(f"Ошибка при сохранении клиента: {e}")
    except Exception as e:
        print(f"Неизвестная ошибка: {e}")


def update_client_by_id(client_id: int, name, link, time, day_rec, prepayment) -> bool:
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            UPDATE clients
            SET name = ?, link = ?, time = ?, day_rec = ?, prepayment = ?
            WHERE id = ?
            ''', (name, link, time, day_rec, prepayment, client_id))
            connection.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Ошибка при обновлении клиента: {e}")
        return False


def delete_client_by_id(client_id: int) -> bool:
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('DELETE FROM clients WHERE id = ?', (client_id,))
            connection.commit()
            return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"Ошибка при удалении клиента по id: {e}")
        return False

def add_salary_to_db(amount, month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            INSERT INTO salary (amount, date)
            VALUES (?, ?)
            ''', (amount, month_year))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при добавлении зарплаты: {e}")

def get_total_salary_for_month(month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            SELECT SUM(amount) FROM salary WHERE date = ?
            ''', (month_year,))
            total_salary = cursor.fetchone()[0]
            return total_salary if total_salary is not None else 0
    except sqlite3.Error as e:
        print(f"Ошибка при получении общей суммы зарплаты: {e}")
        return 0

def remove_last_salary_from_db(month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            DELETE FROM salary WHERE id = (SELECT id FROM salary WHERE date = ? ORDER BY id DESC LIMIT 1)
            ''', (month_year,))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при удалении последней зарплаты: {e}")


def add_expenses_to_db(amount, month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            INSERT INTO expenses (amount, date)
            VALUES (?, ?)
            ''', (amount, month_year))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при добавлении трат: {e}")

def get_total_expenses_for_month(month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            SELECT SUM(amount) FROM expenses WHERE date = ?
            ''', (month_year,))
            total_expenses = cursor.fetchone()[0]
            return total_expenses if total_expenses is not None else 0
    except sqlite3.Error as e:
        print(f"Ошибка при получении общей суммы: {e}")
        return 0

def remove_last_expenses_from_db(month_year):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            DELETE FROM expenses WHERE id = (SELECT id FROM expenses WHERE date = ? ORDER BY id DESC LIMIT 1)
            ''', (month_year,))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при удалении последней траты: {e}")


def count_visits_by_link(link: str) -> int:
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('SELECT COUNT(*) FROM clients WHERE link = ?', (link,))
            return int(cursor.fetchone()[0] or 0)
    except sqlite3.Error as e:
        print(f"Ошибка при подсчете посещений: {e}")
        return 0

create_clients_table()
migrate_clients_add_prepayment()
create_salary_table()
create_expenses_table()
