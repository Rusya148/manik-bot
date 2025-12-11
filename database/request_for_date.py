import sqlite3

def get_clients_by_date_range(start_date, end_date):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()

            cursor.execute('''
            SELECT * FROM clients
            WHERE DATE(day_rec) BETWEEN ? AND ?
            ORDER BY day_rec ASC
            ''', (start_date, end_date))

            rows = cursor.fetchall()
            return rows
    except sqlite3.OperationalError as e:
        print(f"Ошибка при выполнении запроса: {e}")
        return []
    except Exception as e:
        print(f"Неизвестная ошибка: {e}")
        return []


def get_clients_by_day(day_iso: str):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            cursor.execute('''
            SELECT id, name, link, time, day_rec, prepayment
            FROM clients
            WHERE DATE(day_rec) = DATE(?)
            ORDER BY time ASC
            ''', (day_iso,))
            return cursor.fetchall()
    except sqlite3.Error as e:
        print(f"Ошибка при получении клиентов за день: {e}")
        return []

def get_marked_days_for_month(year: int, month: int):
    try:
        with sqlite3.connect('database_client.db') as connection:
            cursor = connection.cursor()
            start = f"{year:04d}-{month:02d}-01"
            # SQLite: last day via date('start','start of month','+1 month','-1 day')
            cursor.execute('''
            SELECT strftime('%d', day_rec) as d
            FROM clients
            WHERE DATE(day_rec) BETWEEN DATE(?) AND DATE( DATE(?, '+1 month', '-1 day') )
            GROUP BY d
            ''', (start, start))
            rows = cursor.fetchall()
            return {int(r[0]) for r in rows if r and r[0] is not None}
    except sqlite3.Error as e:
        print(f"Ошибка при получении дней с записями: {e}")
        return set()

