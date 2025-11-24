import sqlite3

# Установить соединение с базой данных для трат
def get_expenses_db_connection():
    connection = sqlite3.connect('expenses_db.db')  # Подключаемся к новой базе данных для трат
    return connection

# Функция для создания таблицы трат в новой базе данных
def create_expenses_table():
    connection = get_expenses_db_connection()
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

# Функция для добавления трат в новую базу данных
def add_expenses_to_db(amount, month_year):
    try:
        with get_expenses_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute('''
            INSERT INTO expenses (amount, date)
            VALUES (?, ?)
            ''', (amount, month_year))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при добавлении трат: {e}")

# Функция для получения общей суммы трат за месяц
def get_total_expenses_for_month(month_year):
    try:
        with get_expenses_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute('''
            SELECT SUM(amount) FROM expenses WHERE date = ?
            ''', (month_year,))
            total_expenses = cursor.fetchone()[0]
            return total_expenses if total_expenses is not None else 0
    except sqlite3.Error as e:
        print(f"Ошибка при получении общей суммы трат: {e}")
        return 0

# Функция для удаления последней траты из базы данных
def remove_last_expenses_from_db(month_year):
    try:
        with get_expenses_db_connection() as connection:
            cursor = connection.cursor()
            cursor.execute('''
            DELETE FROM expenses WHERE id = (SELECT id FROM expenses WHERE date = ? ORDER BY id DESC LIMIT 1)
            ''', (month_year,))
            connection.commit()
    except sqlite3.Error as e:
        print(f"Ошибка при удалении последней траты: {e}")

# Создание таблицы для трат (если не существует)
create_expenses_table()
