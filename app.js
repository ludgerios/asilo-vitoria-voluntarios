const STORAGE_KEY = "asilo_vitoria_volunteers_v1";
const $ = (id) => document.getElementById(id);
let data = loadData();
let toastTimer;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      saved &&
      Array.isArray(saved.volunteers) &&
      Array.isArray(saved.activities)
    )
      return saved;
  } catch (e) {}
  return { volunteers: [], activities: [] };
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}
function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase();
}
function dateObj(s) {
  return s ? new Date(s + "T12:00:00") : null;
}
function fmtDate(
  s,
  options = { day: "2-digit", month: "short", year: "numeric" },
) {
  const d = dateObj(s);
  return d
    ? new Intl.DateTimeFormat("pt-BR", options).format(d)
    : "Data não informada";
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function openModal(id) {
  $(id).classList.add("open");
  $(id).setAttribute("aria-hidden", "false");
}
function closeModal(id) {
  $(id).classList.remove("open");
  $(id).setAttribute("aria-hidden", "true");
}
function goTo(view) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  $(view + "View").classList.add("active");
  document
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("breadcrumbCurrent").textContent = {
    dashboard: "Visão geral",
    volunteers: "Voluntários",
    activities: "Atividades",
  }[view];
  $("sidebar").classList.remove("open");
}
function personMarkup(v) {
  return `<div class="person-cell"><div class="person-avatar">${escapeHTML(initials(v.name))}</div><div><div class="person-name">${escapeHTML(v.name)}</div><div class="person-sub">${escapeHTML(v.email || "Sem e-mail informado")}</div></div></div>`;
}
function statusMarkup(status) {
  return `<span class="status ${status === "Ativo" ? "active" : "inactive"}">${escapeHTML(status)}</span>`;
}
function renderDashboard() {
  const active = data.volunteers.filter((v) => v.status === "Ativo");
  $("totalVolunteers").textContent = data.volunteers.length;
  $("availableVolunteers").textContent = active.length;
  $("totalActivities").textContent = data.activities.length;
  $("totalParticipations").textContent = data.activities.reduce(
    (n, a) => n + (a.volunteers || []).length,
    0,
  );
  $("navVolunteerCount").textContent = data.volunteers.length;
  const recent = [...data.volunteers]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 5);
  $("recentTable").innerHTML = recent
    .map(
      (v) =>
        `<tr><td>${personMarkup(v)}</td><td>${escapeHTML(v.area)}</td><td class="availability">${escapeHTML(v.availability)}</td><td>${statusMarkup(v.status)}</td></tr>`,
    )
    .join("");
  $("recentEmpty").style.display = recent.length ? "none" : "block";
  const upcoming = data.activities
    .filter((a) => a.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  $("upcomingActivities").innerHTML = upcoming
    .map((a) => {
      const d = dateObj(a.date);
      return `<div class="upcoming-item"><div class="date-tile"><strong>${d.getDate()}</strong><span>${new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", "")}</span></div><div class="upcoming-info"><strong>${escapeHTML(a.name)}</strong><span>${escapeHTML(a.time || "Horário a definir")} · ${(a.volunteers || []).length} participante(s)</span></div></div>`;
    })
    .join("");
  $("activitiesEmpty").style.display = upcoming.length ? "none" : "block";
}
function renderVolunteers() {
  const q = $("volunteerSearch").value.toLowerCase(),
    status = $("statusFilter").value,
    area = $("areaFilter").value;
  const list = data.volunteers
    .filter(
      (v) =>
        (!q ||
          [v.name, v.email, v.phone].join(" ").toLowerCase().includes(q)) &&
        (!status || v.status === status) &&
        (!area || v.area === area),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  $("volunteerResults").textContent =
    `${list.length} ${list.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}`;
  $("volunteersTable").innerHTML = list
    .map(
      (v) =>
        `<tr><td>${personMarkup(v)}</td><td>${escapeHTML(v.phone || "—")}<div class="person-sub">${escapeHTML(v.email || "")}</div></td><td>${escapeHTML(v.area)}</td><td class="availability">${escapeHTML(v.availability)}</td><td>${statusMarkup(v.status)}</td><td><div class="row-actions"><button class="mini-action" title="Editar" data-edit-vol="${v.id}">✎</button><button class="mini-action" title="Excluir" data-delete-vol="${v.id}">×</button></div></td></tr>`,
    )
    .join("");
  $("volunteersEmpty").style.display = list.length ? "none" : "block";
}
function renderActivities() {
  const q = $("activitySearch").value.toLowerCase(),
    filter = $("activityFilter").value;
  const list = data.activities
    .filter(
      (a) =>
        (!q ||
          [a.name, a.location, a.description]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        (!filter ||
          (filter === "future" ? a.date >= todayISO() : a.date < todayISO())),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  $("activityCards").innerHTML = list
    .map(
      (a) =>
        `<article class="activity-card"><div class="activity-card-top"><span class="activity-date">${escapeHTML(fmtDate(a.date, { day: "2-digit", month: "short", year: "numeric" }))}</span><div class="row-actions"><button class="mini-action" title="Editar" data-edit-act="${a.id}">✎</button><button class="mini-action" title="Excluir" data-delete-act="${a.id}">×</button></div></div><h3>${escapeHTML(a.name)}</h3><p>${escapeHTML(a.description || "Atividade da instituição.")}</p><div class="activity-meta"><span>◷ ${escapeHTML(a.time || "Horário a definir")}</span><span>⌖ ${escapeHTML(a.location || "Local a definir")}</span><span>♙ ${(a.volunteers || []).length} voluntário(s) participante(s)${a.slots ? ` · ${a.slots} vaga(s)` : ""}</span></div><div class="activity-card-footer"><span>${a.date < todayISO() ? "Atividade realizada" : "Programação"}</span><span>${(a.volunteers || []).length} confirmado(s)</span></div></article>`,
    )
    .join("");
  $("activityCardsEmpty").style.display = list.length ? "none" : "block";
}
function renderAll() {
  renderDashboard();
  renderVolunteers();
  renderActivities();
}
function resetVolunteerForm() {
  $("volunteerForm").reset();
  $("volunteerId").value = "";
  $("vDate").value = todayISO();
  $("volunteerModalTitle").textContent = "Novo voluntário";
}
function editVolunteer(id) {
  const v = data.volunteers.find((x) => x.id === id);
  if (!v) return;
  resetVolunteerForm();
  $("volunteerModalTitle").textContent = "Editar voluntário";
  $("volunteerId").value = v.id;
  $("vName").value = v.name;
  $("vEmail").value = v.email || "";
  $("vPhone").value = v.phone || "";
  $("vArea").value = v.area;
  $("vAvailability").value = v.availability;
  $("vStatus").value = v.status;
  $("vDate").value = v.date || "";
  $("vNotes").value = v.notes || "";
  openModal("volunteerModal");
}
function addVolunteer() {
  resetVolunteerForm();
  openModal("volunteerModal");
}
function refreshVolunteerOptions(selected = []) {
  $("aVolunteers").innerHTML = data.volunteers
    .filter((v) => v.status === "Ativo")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map(
      (v) =>
        `<option value="${v.id}" ${selected.includes(v.id) ? "selected" : ""}>${escapeHTML(v.name)} — ${escapeHTML(v.area)}</option>`,
    )
    .join("");
}
function addActivity() {
  $("activityForm").reset();
  $("activityId").value = "";
  $("activityModalTitle").textContent = "Nova atividade";
  $("aDate").value = todayISO();
  refreshVolunteerOptions();
  openModal("activityModal");
}
function editActivity(id) {
  const a = data.activities.find((x) => x.id === id);
  if (!a) return;
  $("activityForm").reset();
  $("activityModalTitle").textContent = "Editar atividade";
  $("activityId").value = a.id;
  $("aName").value = a.name;
  $("aDate").value = a.date;
  $("aTime").value = a.time || "";
  $("aLocation").value = a.location || "";
  $("aSlots").value = a.slots || "";
  $("aDescription").value = a.description || "";
  refreshVolunteerOptions(a.volunteers || []);
  openModal("activityModal");
}
function csvExport() {
  const headers = [
    "Nome",
    "E-mail",
    "Telefone",
    "Área de interesse",
    "Disponibilidade",
    "Status",
    "Data de entrada",
    "Observações",
  ];
  const rows = data.volunteers.map((v) => [
    v.name,
    v.email,
    v.phone,
    v.area,
    v.availability,
    v.status,
    v.date,
    v.notes,
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((x) => `"${String(x || "").replace(/"/g, '""')}"`).join(";"),
    )
    .join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "voluntarios-asilo-vitoria.csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Arquivo CSV exportado.");
}

document
  .querySelectorAll(".nav-item")
  .forEach((b) => b.addEventListener("click", () => goTo(b.dataset.view)));
document
  .querySelectorAll("[data-goto]")
  .forEach((b) => b.addEventListener("click", () => goTo(b.dataset.goto)));
$("mobileMenu").addEventListener("click", () =>
  $("sidebar").classList.toggle("open"),
);
["addVolunteerTop", "addVolunteerBtn", "emptyAddBtn"].forEach((id) =>
  $(id).addEventListener("click", addVolunteer),
);
["addActivityBtn", "addActivityQuick"].forEach((id) =>
  $(id).addEventListener("click", addActivity),
);
document
  .querySelectorAll("[data-close]")
  .forEach((b) =>
    b.addEventListener("click", () => closeModal(b.dataset.close)),
  );
document.querySelectorAll(".modal-backdrop").forEach((m) =>
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModal(m.id);
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    document
      .querySelectorAll(".modal-backdrop.open")
      .forEach((m) => closeModal(m.id));
});
$("volunteerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("volunteerId").value;
  const old = data.volunteers.find((v) => v.id === id);
  const v = {
    id: id || crypto.randomUUID(),
    name: $("vName").value.trim(),
    email: $("vEmail").value.trim(),
    phone: $("vPhone").value.trim(),
    area: $("vArea").value,
    availability: $("vAvailability").value,
    status: $("vStatus").value,
    date: $("vDate").value,
    notes: $("vNotes").value.trim(),
    createdAt: old?.createdAt || new Date().toISOString(),
  };
  if (!v.name) {
    showToast("Informe o nome do voluntário.");
    return;
  }
  if (old) data.volunteers = data.volunteers.map((x) => (x.id === id ? v : x));
  else data.volunteers.push(v);
  saveData();
  closeModal("volunteerModal");
  showToast(
    old ? "Cadastro atualizado." : "Voluntário cadastrado com sucesso.",
  );
});
$("activityForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("activityId").value;
  const a = {
    id: id || crypto.randomUUID(),
    name: $("aName").value.trim(),
    date: $("aDate").value,
    time: $("aTime").value,
    location: $("aLocation").value.trim(),
    slots: $("aSlots").value,
    description: $("aDescription").value.trim(),
    volunteers: [...$("aVolunteers").selectedOptions].map((o) => o.value),
  };
  const old = data.activities.some((x) => x.id === id);
  if (old) data.activities = data.activities.map((x) => (x.id === id ? a : x));
  else data.activities.push(a);
  saveData();
  closeModal("activityModal");
  showToast(
    old ? "Atividade atualizada." : "Atividade cadastrada com sucesso.",
  );
});
document.addEventListener("click", (e) => {
  const ev = e.target.closest("[data-edit-vol]");
  const dv = e.target.closest("[data-delete-vol]");
  const ea = e.target.closest("[data-edit-act]");
  const da = e.target.closest("[data-delete-act]");
  if (ev) editVolunteer(ev.dataset.editVol);
  if (dv) {
    const v = data.volunteers.find((x) => x.id === dv.dataset.deleteVol);
    if (v && confirm(`Excluir o cadastro de ${v.name}?`)) {
      data.volunteers = data.volunteers.filter((x) => x.id !== v.id);
      data.activities.forEach(
        (a) =>
          (a.volunteers = (a.volunteers || []).filter((id) => id !== v.id)),
      );
      saveData();
      showToast("Voluntário excluído.");
    }
  }
  if (ea) editActivity(ea.dataset.editAct);
  if (da) {
    const a = data.activities.find((x) => x.id === da.dataset.deleteAct);
    if (a && confirm(`Excluir a atividade "${a.name}"?`)) {
      data.activities = data.activities.filter((x) => x.id !== a.id);
      saveData();
      showToast("Atividade excluída.");
    }
  }
});
["volunteerSearch", "statusFilter", "areaFilter"].forEach((id) =>
  $(id).addEventListener(
    id === "volunteerSearch" ? "input" : "change",
    renderVolunteers,
  ),
);
["activitySearch", "activityFilter"].forEach((id) =>
  $(id).addEventListener(
    id === "activitySearch" ? "input" : "change",
    renderActivities,
  ),
);
$("exportBtn").addEventListener("click", csvExport);
$("todayLabel").textContent = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
})
  .format(new Date())
  .replace(".", "");
renderAll();
