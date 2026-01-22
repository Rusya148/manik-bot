import sqlite3

DB_PATH = 'shedule.db'


def get_connection():
    return sqlite3.connect(DB_PATH)


def create_tables():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute('''
        CREATE TABLE IF NOT EXISTS schedule_days (
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            day INTEGER NOT NULL,
            PRIMARY KEY (year, month, day)
        )
        ''')
        conn.commit()


def get_selected_days(year: int, month: int):
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute('SELECT day FROM schedule_days WHERE year=? AND month=? ORDER BY day ASC', (year, month))
            rows = cur.fetchall()
            return {int(r[0]) for r in rows}
    except sqlite3.Error:
        return set()


def set_day_selected(year: int, month: int, day: int, selected: bool):
    with get_connection() as conn:
        cur = conn.cursor()
        if selected:
            cur.execute('INSERT OR IGNORE INTO schedule_days(year, month, day) VALUES (?, ?, ?)', (year, month, day))
        else:
            cur.execute('DELETE FROM schedule_days WHERE year=? AND month=? AND day=?', (year, month, day))
        conn.commit()


def toggle_day(year: int, month: int, day: int) -> bool:
    selected_now = get_selected_days(year, month)
    will_select = day not in selected_now
    set_day_selected(year, month, day, will_select)
    return will_select


create_tables()


