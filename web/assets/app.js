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
const formatDateDisplay = (value) => {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }
  return value;
};
const parseMonthInput = (value) => {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
};

const toMonthValue = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

const shiftMonthValue = (value, delta) => {
  const { year, month } = parseMonthInput(value);
  const date = new Date(year, month - 1 + delta, 1);
  return toMonthValue(date.getFullYear(), date.getMonth() + 1);
};

const setPanelTransition = (panel) => {
  panel.classList.add("entering");
  window.setTimeout(() => panel.classList.remove("entering"), 350);
};

const DEFAULT_SLOTS = {
  0: "11:00,14:00,17:00,19:00",
  1: "11:00,14:00,17:00,19:00",
  2: "11:00,14:00,17:00,19:00",
  3: "11:00,14:00,17:00,19:00",
  4: "11:00,14:00,17:00,19:00",
  5: "10:00,13:00,16:00,18:00",
  6: "10:00,13:00,16:00,18:00",
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
          <div class="list-meta">Дата: ${formatDateDisplay(client.date)} • Время: ${client.time}</div>
          <div class="list-meta">Ссылка: ${client.link || "-"}</div>
          <div class="list-meta">Предоплата: ${client.prepayment_display}</div>
          ${
            client.link && client.link.trim().startsWith("@")
              ? `<div class="list-actions">
                   <button type="button" class="action-button" data-action="copy" data-copy="${client.link.trim()}">
                     Копировать @
                   </button>
                 </div>`
              : ""
          }
        </div>
      `
    )
    .join("");

  container.querySelectorAll("[data-action='copy']").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      if (!value) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const temp = document.createElement("textarea");
          temp.value = value;
          temp.style.position = "fixed";
          temp.style.left = "-9999px";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }
        showToast("Ссылка скопирована");
      } catch (error) {
        showToast("Не удалось скопировать", true);
      }
    });
  });
};

const renderDayClients = (container, clients, onEdit, onDelete) => {
  if (!clients.length) {
    container.textContent = "Нет записей.";
    return;
  }
  container.innerHTML = clients
    .map(
      (client) => `
        <div class="list-item" data-client-id="${client.id}">
          <div class="list-title">${client.name}</div>
          <div class="list-meta">Дата: ${formatDateDisplay(client.date)} • Время: ${client.time}</div>
          <div class="list-meta">Ссылка: ${client.link || "-"}</div>
          <div class="list-meta">Предоплата: ${client.prepayment_display}</div>
          <div class="list-actions">
            <button type="button" class="action-button" data-action="edit">Редактировать</button>
            <button type="button" class="action-button danger" data-action="delete">Удалить</button>
            ${
              client.link && client.link.trim().startsWith("@")
                ? `<button type="button" class="action-button" data-action="copy">Копировать @</button>`
                : ""
            }
          </div>
        </div>
      `
    )
    .join("");

  container.querySelectorAll(".list-item").forEach((item) => {
    const clientId = Number(item.dataset.clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    item.querySelector("[data-action='edit']").addEventListener("click", () => onEdit(client));
    item.querySelector("[data-action='delete']").addEventListener("click", () => onDelete(client));
    const copyButton = item.querySelector("[data-action='copy']");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        const value = (client.link || "").trim();
        if (!value) return;
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
          } else {
            const temp = document.createElement("textarea");
            temp.value = value;
            temp.style.position = "fixed";
            temp.style.left = "-9999px";
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
          }
          showToast("Ссылка скопирована");
        } catch (error) {
          showToast("Не удалось скопировать", true);
        }
      });
    }
  });
};

const renderCalendar = (container, year, month, markedDays, onDayClick, selectedDays = []) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const today = new Date();
  const todayIso = formatDateISO(today);
  const selectedSet = new Set((selectedDays || []).map((value) => Number(value)));
  const markedSet = new Set((markedDays || []).map((value) => Number(value)));

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
  const totalCells = 42;
  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";
    if (i < startWeekday || i >= startWeekday + totalDays) {
      cell.disabled = true;
      cell.classList.add("empty");
    } else {
      const day = i - startWeekday + 1;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7;
      cell.textContent = day;
      if (markedSet.has(day)) {
        cell.classList.add("marked");
      }
      if (selectedSet.has(day)) {
        cell.classList.add("selected");
      }
      if (weekday >= 5) {
        cell.classList.add("weekend");
      }
      if (iso === todayIso) {
        cell.classList.add("today");
      }
      cell.addEventListener("click", () => onDayClick(day, iso, cell));
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);
};

const setupTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");
  const body = document.body;
  body.dataset.activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "";
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      const panel = document.getElementById(`tab-${button.dataset.tab}`);
      panel.classList.add("active");
      setPanelTransition(panel);
      body.dataset.activeTab = button.dataset.tab || "";
    });
  });
};

const setupClients = () => {
  const form = document.getElementById("client-form");
  const prepaymentType = form.querySelector("[name='prepaymentType']");
  const prepaymentAmountField = document.getElementById("prepayment-amount-field");
  const list = document.getElementById("clients-list");
  const deleteForm = document.getElementById("client-delete-form");
  const clientsTab = document.getElementById("tab-clients");

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
    const today = formatDateISO(new Date());
    loadRange(today, "2099-12-31");
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

  const blurActiveClientInput = (event) => {
    const active = document.activeElement;
    if (!active || active.tagName !== "INPUT") return;
    if (!clientsTab || !clientsTab.contains(active)) return;
    if (event.target.closest("input, select, textarea, button")) return;
    active.blur();
  };

  document.addEventListener("touchstart", blurActiveClientInput);
  document.addEventListener("mousedown", blurActiveClientInput);
};

const setupCalendar = () => {
  const monthInput = document.getElementById("calendar-month");
  const loadButton = document.getElementById("calendar-load");
  const prevButton = document.getElementById("calendar-prev");
  const nextButton = document.getElementById("calendar-next");
  const grid = document.getElementById("calendar-grid");
  const dayClients = document.getElementById("calendar-day-clients");
  const modal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const editClose = document.getElementById("edit-close");
  const editPrepaymentType = editForm.querySelector("[name='prepaymentType']");
  const editPrepaymentAmountField = document.getElementById("edit-prepayment-amount-field");
  let activeClient = null;
  let activeDayIso = null;

  const closeModal = () => {
    modal.classList.add("hidden");
    activeClient = null;
  };

  const openModal = (client) => {
    activeClient = client;
    editForm.name.value = client.name || "";
    editForm.link.value = client.link || "";
    editForm.time.value = client.time || "";
    editForm.date.value = client.date || "";
    if (client.prepayment === 1) {
      editPrepaymentType.value = "yes";
      editPrepaymentAmountField.classList.add("hidden");
      editForm.prepaymentAmount.value = "";
    } else if (!client.prepayment) {
      editPrepaymentType.value = "no";
      editPrepaymentAmountField.classList.add("hidden");
      editForm.prepaymentAmount.value = "";
    } else {
      editPrepaymentType.value = "amount";
      editPrepaymentAmountField.classList.remove("hidden");
      editForm.prepaymentAmount.value = client.prepayment;
    }
    modal.classList.remove("hidden");
  };

  editPrepaymentType.addEventListener("change", () => {
    editPrepaymentAmountField.classList.toggle(
      "hidden",
      editPrepaymentType.value !== "amount"
    );
  });

  editClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeClient) return;
    let prepayment = 0;
    if (editPrepaymentType.value === "yes") prepayment = 1;
    if (editPrepaymentType.value === "amount") {
      prepayment = Number(editForm.prepaymentAmount.value || 0);
    }
    const payload = {
      name: editForm.name.value,
      link: editForm.link.value,
      time: editForm.time.value,
      date: editForm.date.value,
      prepayment,
    };
    try {
      await apiFetch(`/clients/${activeClient.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("Запись обновлена");
      closeModal();
      if (activeDayIso) {
        const clients = await apiFetch(`/clients/day?date_iso=${activeDayIso}`);
        renderDayClients(dayClients, clients, openModal, handleDelete);
      }
    } catch (error) {
      showToast(error.message, true);
    }
  });

  const handleDelete = async (client) => {
    if (!confirm("Удалить запись?")) return;
    try {
      await apiFetch(`/clients/${client.id}`, { method: "DELETE" });
      showToast("Запись удалена");
      if (activeDayIso) {
        const clients = await apiFetch(`/clients/day?date_iso=${activeDayIso}`);
        renderDayClients(dayClients, clients, openModal, handleDelete);
      }
    } catch (error) {
      showToast(error.message, true);
    }
  };

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
            activeDayIso = iso;
            const clients = await apiFetch(`/clients/day?date_iso=${iso}`);
            renderDayClients(dayClients, clients, openModal, handleDelete);
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
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (!monthInput.value) {
        const now = new Date();
        monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
      }
      monthInput.value = shiftMonthValue(monthInput.value, -1);
      loadMonth();
    });
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (!monthInput.value) {
        const now = new Date();
        monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
      }
      monthInput.value = shiftMonthValue(monthInput.value, 1);
      loadMonth();
    });
  }
  monthInput.addEventListener("change", loadMonth);
  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
  }
  loadMonth();
};

const setupSchedule = () => {
  const monthInput = document.getElementById("schedule-month");
  const prevButton = document.getElementById("schedule-prev");
  const nextButton = document.getElementById("schedule-next");
  const generateButton = document.getElementById("schedule-generate");
  const grid = document.getElementById("schedule-grid");
  const result = document.getElementById("schedule-result");
  const resetButton = document.getElementById("schedule-reset");
  const applyButton = document.getElementById("schedule-apply");
  const dayTitle = document.getElementById("schedule-day-title");
  const dayClients = document.getElementById("schedule-day-clients");
  const slotsCard = document.getElementById("schedule-slots");
  const slotsToggle = document.getElementById("slots-toggle");
  const slotInputs = {
    0: document.getElementById("slot-mon"),
    1: document.getElementById("slot-tue"),
    2: document.getElementById("slot-wed"),
    3: document.getElementById("slot-thu"),
    4: document.getElementById("slot-fri"),
    5: document.getElementById("slot-sat"),
    6: document.getElementById("slot-sun"),
  };
  const slotInputElements = Object.values(slotInputs).filter(Boolean);

  const loadSlots = async () => {
    let saved = {};
    try {
      const data = await apiFetch("/schedule/slots");
      saved = data.slots || {};
    } catch (error) {
      saved = {};
    }
    Object.entries(slotInputs).forEach(([weekday, input]) => {
      if (!input) return;
      input.value = saved[weekday] || DEFAULT_SLOTS[weekday] || "";
      input.classList.remove("invalid");
    });
  };

  const saveSlots = async () => {
    const payload = {};
    Object.entries(slotInputs).forEach(([weekday, input]) => {
      if (!input) return;
      payload[weekday] = input.value;
    });
    await apiFetch("/schedule/slots", {
      method: "POST",
      body: JSON.stringify({ slots: payload }),
    });
  };

  const validateSlots = () => {
    let valid = true;
    Object.values(slotInputs).forEach((input) => {
      if (!input) return;
      input.classList.remove("invalid");
      const value = input.value.trim();
      if (!value) return;
      const times = value.split(",").map((s) => s.trim()).filter(Boolean);
      const ok = times.every((time) => /^\d{1,2}([:.]\d{1,2})?$/.test(time));
      if (!ok) {
        valid = false;
        input.classList.add("invalid");
      }
    });
    return valid;
  };

  const readSlots = () => {
    const slots = {};
    Object.entries(slotInputs).forEach(([weekday, input]) => {
      if (!input || !input.value.trim()) return;
      slots[weekday] = input.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    });
    return slots;
  };

  const loadMonth = async () => {
    if (!monthInput.value) {
      const now = new Date();
      monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
    }
    const { year, month } = parseMonthInput(monthInput.value);
    try {
      const [selected, marked] = await Promise.all([
        apiFetch(`/schedule/selected?year=${year}&month=${month}`),
        apiFetch(`/clients/marked-days?year=${year}&month=${month}`),
      ]);
      renderCalendar(
        grid,
        year,
        month,
        marked.days || [],
        async (day, _iso, cell) => {
          const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          try {
            const booked = await apiFetch(`/clients/day?date_iso=${dateIso}`);
            if (dayTitle) {
              dayTitle.textContent = `Записи на ${formatDateDisplay(dateIso)}`;
            }
            if (dayClients) {
              renderClients(dayClients, booked);
            }
          } catch (error) {
            showToast(error.message, true);
          }
          try {
            if (cell) {
              cell.classList.toggle("selected");
            }
            await apiFetch("/schedule/toggle", {
              method: "POST",
              body: JSON.stringify({ year, month, day }),
            });
            loadMonth();
          } catch (error) {
            showToast(error.message, true);
            if (cell) {
              cell.classList.toggle("selected");
            }
          }
        },
        selected.days
      );
      result.textContent = "Выберите дни и нажмите «Сгенерировать».";
      if (dayTitle) {
        dayTitle.textContent = "Выберите день.";
      }
      if (dayClients) {
        dayClients.textContent = "";
      }
    } catch (error) {
      showToast(error.message, true);
    }
  };

  prevButton.addEventListener("click", () => {
    if (!monthInput.value) {
      const now = new Date();
      monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
    }
    monthInput.value = shiftMonthValue(monthInput.value, -1);
    loadMonth();
  });
  nextButton.addEventListener("click", () => {
    if (!monthInput.value) {
      const now = new Date();
      monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
    }
    monthInput.value = shiftMonthValue(monthInput.value, 1);
    loadMonth();
  });
  generateButton.addEventListener("click", async () => {
    if (!monthInput.value) {
      showToast("Выберите месяц", true);
      return;
    }
    if (!validateSlots()) {
      showToast("Проверьте формат времени слотов.", true);
      return;
    }
    const { year, month } = parseMonthInput(monthInput.value);
    try {
      await saveSlots();
      const data = await apiFetch(`/schedule/generate?year=${year}&month=${month}`, {
        method: "POST",
        body: JSON.stringify({ slots: readSlots() }),
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

  Object.values(slotInputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      input.classList.remove("invalid");
    });
  });

  const blurActiveSlotInput = (event) => {
    if (!document.activeElement || document.activeElement.tagName !== "INPUT") return;
    if (slotInputElements.includes(document.activeElement)) {
      if (!event.target.closest(".schedule-slots")) {
        document.activeElement.blur();
      }
    }
  };

  document.addEventListener("touchstart", blurActiveSlotInput);
  document.addEventListener("mousedown", blurActiveSlotInput);
  if (applyButton) {
    applyButton.addEventListener("click", async () => {
      if (!validateSlots()) {
        showToast("Проверьте формат времени слотов.", true);
        return;
      }
      try {
        await saveSlots();
        showToast("Слоты сохранены");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      apiFetch("/schedule/slots/reset", { method: "POST" })
        .then((data) => {
          Object.entries(slotInputs).forEach(([weekday, input]) => {
            if (!input) return;
            input.value = data.slots?.[weekday] || DEFAULT_SLOTS[weekday] || "";
            input.classList.remove("invalid");
          });
          showToast("Слоты сброшены к дефолту");
        })
        .catch((error) => showToast(error.message, true));
    });
  }

  if (slotsToggle && slotsCard) {
    slotsToggle.addEventListener("click", () => {
      const collapsed = slotsCard.classList.toggle("collapsed");
      slotsToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = toMonthValue(now.getFullYear(), now.getMonth() + 1);
  }
  loadSlots();
  loadMonth();
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
