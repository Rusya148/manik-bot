const API_BASE = "/api";

const toast = document.getElementById("toast");
const showToast = (message, isError = false) => {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Ошибка запроса");
  }
  return response.json();
};

const formatDateISO = (date) => date.toISOString().slice(0, 10);
const parseMonthInput = (value) => {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
};

const setPanelTransition = (panel) => {
  panel.classList.add("entering");
  window.setTimeout(() => panel.classList.remove("entering"), 350);
};

const renderClients = (container, clients) => {
  if (!clients.length) {
    container.textContent = "Нет записей.";
    return;
  }
  container.innerHTML = clients
    .map(
      (client) => `
        <div class="list-item">
          <div class="list-title">${client.name}</div>
          <div class="list-meta">Дата: ${client.date} • Время: ${client.time}</div>
          <div class="list-meta">Ссылка: ${client.link || "-"}</div>
          <div class="list-meta">Предоплата: ${client.prepayment_display}</div>
        </div>
      `
    )
    .join("");
};

const renderCalendar = (container, year, month, markedDays, onDayClick, selectedDays = []) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const today = new Date();
  const todayIso = formatDateISO(today);

  container.innerHTML = "";
  const header = document.createElement("div");
  header.className = "calendar-header";
  weekdays.forEach((day) => {
    const cell = document.createElement("div");
    cell.textContent = day;
    header.appendChild(cell);
  });
  container.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "calendar-body";
  const totalCells = startWeekday + totalDays;
  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    if (i < startWeekday) {
      cell.disabled = true;
      cell.classList.add("empty");
    } else {
      const day = i - startWeekday + 1;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7;
      cell.textContent = day;
      if (markedDays.includes(day)) {
        cell.classList.add("marked");
      }
      if (selectedDays.includes(day)) {
        cell.classList.add("selected");
      }
      if (weekday >= 5) {
        cell.classList.add("weekend");
      }
      if (iso === todayIso) {
        cell.classList.add("today");
      }
      cell.addEventListener("click", () => onDayClick(day, iso));
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);
};

const setupTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      const panel = document.getElementById(`tab-${button.dataset.tab}`);
      panel.classList.add("active");
      setPanelTransition(panel);
    });
  });
};

const setupClients = () => {
  const form = document.getElementById("client-form");
  const prepaymentType = form.querySelector("[name='prepaymentType']");
  const prepaymentAmountField = document.getElementById("prepayment-amount-field");
  const list = document.getElementById("clients-list");
  const deleteForm = document.getElementById("client-delete-form");

  prepaymentType.addEventListener("change", () => {
    prepaymentAmountField.classList.toggle("hidden", prepaymentType.value !== "amount");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const prepaymentTypeValue = formData.get("prepaymentType");
    let prepayment = 0;
    if (prepaymentTypeValue === "yes") prepayment = 1;
    if (prepaymentTypeValue === "amount") {
      prepayment = Number(formData.get("prepaymentAmount") || 0);
    }
    const payload = {
      name: formData.get("name"),
      link: formData.get("link"),
      time: formData.get("time"),
      date: formData.get("date"),
      prepayment,
    };
    try {
      await apiFetch("/clients", { method: "POST", body: JSON.stringify(payload) });
      showToast("Клиент записан");
      form.reset();
      prepaymentAmountField.classList.add("hidden");
    } catch (error) {
      showToast(error.message, true);
    }
  });

  const loadRange = async (start, end) => {
    try {
      const clients = await apiFetch(`/clients?start=${start}&end=${end}`);
      renderClients(list, clients);
    } catch (error) {
      showToast(error.message, true);
    }
  };

  document.getElementById("clients-today").addEventListener("click", () => {
    const today = formatDateISO(new Date());
    loadRange(today, today);
  });
  document.getElementById("clients-week").addEventListener("click", () => {
    const today = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    loadRange(formatDateISO(today), formatDateISO(end));
  });
  document.getElementById("clients-all").addEventListener("click", () => {
    loadRange("2000-01-01", "2099-12-31");
  });
  document.getElementById("clients-range").addEventListener("click", () => {
    const start = document.getElementById("clients-from").value;
    const end = document.getElementById("clients-to").value;
    if (!start || !end) {
      showToast("Выберите диапазон дат", true);
      return;
    }
    loadRange(start, end);
  });

  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const link = deleteForm.querySelector("input[name='link']").value.trim();
    if (!link) return;
    try {
      await apiFetch(`/clients/by-link?link=${encodeURIComponent(link)}`, { method: "DELETE" });
      showToast("Клиент удален");
      deleteForm.reset();
    } catch (error) {
      showToast(error.message, true);
    }
  });
};

const setupCalendar = () => {
  const monthInput = document.getElementById("calendar-month");
  const loadButton = document.getElementById("calendar-load");
  const grid = document.getElementById("calendar-grid");
  const dayClients = document.getElementById("calendar-day-clients");

  const loadMonth = async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    const { year, month } = parseMonthInput(monthInput.value);
    try {
      const data = await apiFetch(`/clients/marked-days?year=${year}&month=${month}`);
      renderCalendar(
        grid,
        year,
        month,
        data.days,
        async (_day, iso) => {
          try {
            const clients = await apiFetch(`/clients/day?date_iso=${iso}`);
            renderClients(dayClients, clients);
          } catch (error) {
            showToast(error.message, true);
          }
        }
      );
      dayClients.textContent = "Выберите день.";
    } catch (error) {
      showToast(error.message, true);
    }
  };

  loadButton.addEventListener("click", loadMonth);
};

const setupSchedule = () => {
  const monthInput = document.getElementById("schedule-month");
  const loadButton = document.getElementById("schedule-load");
  const generateButton = document.getElementById("schedule-generate");
  const grid = document.getElementById("schedule-grid");
  const result = document.getElementById("schedule-result");

  const loadMonth = async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    const { year, month } = parseMonthInput(monthInput.value);
    try {
      const selected = await apiFetch(`/schedule/selected?year=${year}&month=${month}`);
      renderCalendar(
        grid,
        year,
        month,
        [],
        async (day) => {
          try {
            await apiFetch("/schedule/toggle", {
              method: "POST",
              body: JSON.stringify({ year, month, day }),
            });
            loadMonth();
          } catch (error) {
            showToast(error.message, true);
          }
        },
        selected.days
      );
      result.textContent = "Выберите дни и нажмите «Сгенерировать».";
    } catch (error) {
      showToast(error.message, true);
    }
  };

  loadButton.addEventListener("click", loadMonth);
  generateButton.addEventListener("click", async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    const { year, month } = parseMonthInput(monthInput.value);
    try {
      const data = await apiFetch(`/schedule/generate?year=${year}&month=${month}`, {
        method: "POST",
      });
      if (!data.lines.length) {
        result.textContent = "Дни не выбраны.";
        return;
      }
      result.innerHTML = data.lines.map((line) => (line ? line : "")).join("<br>");
    } catch (error) {
      showToast(error.message, true);
    }
  });
};

const setupSalary = () => {
  const monthInput = document.getElementById("salary-month");
  const amountInput = document.getElementById("salary-amount");
  const addButton = document.getElementById("salary-add");
  const removeButton = document.getElementById("salary-remove");
  const total = document.getElementById("salary-total");

  const loadTotal = async () => {
    if (!monthInput.value) return;
    const data = await apiFetch(`/salary?month=${monthInput.value}`);
    total.textContent = `Зарплата за ${data.month}: ${data.total} руб.`;
  };

  addButton.addEventListener("click", async () => {
    if (!monthInput.value || !amountInput.value) {
      showToast("Введите месяц и сумму", true);
      return;
    }
    try {
      const payload = { amount: Number(amountInput.value), month: monthInput.value };
      await apiFetch("/salary", { method: "POST", body: JSON.stringify(payload) });
      showToast("Сумма добавлена");
      amountInput.value = "";
      loadTotal();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  removeButton.addEventListener("click", async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    try {
      await apiFetch(`/salary/last?month=${monthInput.value}`, { method: "DELETE" });
      showToast("Последняя сумма удалена");
      loadTotal();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  monthInput.addEventListener("change", loadTotal);
};

const setupExpenses = () => {
  const monthInput = document.getElementById("expenses-month");
  const amountInput = document.getElementById("expenses-amount");
  const addButton = document.getElementById("expenses-add");
  const removeButton = document.getElementById("expenses-remove");
  const total = document.getElementById("expenses-total");

  const loadTotal = async () => {
    if (!monthInput.value) return;
    const data = await apiFetch(`/expenses?month=${monthInput.value}`);
    total.textContent = `Траты за ${data.month}: ${data.total} руб.`;
  };

  addButton.addEventListener("click", async () => {
    if (!monthInput.value || !amountInput.value) {
      showToast("Введите месяц и сумму", true);
      return;
    }
    try {
      const payload = { amount: Number(amountInput.value), month: monthInput.value };
      await apiFetch("/expenses", { method: "POST", body: JSON.stringify(payload) });
      showToast("Сумма добавлена");
      amountInput.value = "";
      loadTotal();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  removeButton.addEventListener("click", async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    try {
      await apiFetch(`/expenses/last?month=${monthInput.value}`, { method: "DELETE" });
      showToast("Последняя сумма удалена");
      loadTotal();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  monthInput.addEventListener("change", loadTotal);
};

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupClients();
  setupCalendar();
  setupSchedule();
  setupSalary();
  setupExpenses();
});
