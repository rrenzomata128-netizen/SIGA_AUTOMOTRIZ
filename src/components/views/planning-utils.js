export const DEFAULT_SHIFTS = [
  "Turno 1 (06:00 - 14:30)",
  "Turno 2 (14:00 - 22:30)",
  "Turno 3 (22:00 - 06:30)",
];

const upper = (v) => String(v ?? "").trim().toUpperCase();

export function toKeyList(raw) {
  if (raw === null || raw === undefined || raw === "") return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(",");
  return list.map(upper).filter(Boolean);
}

export function matchPlant(plant, key) {
  if (!plant || key === null || key === undefined) return false;
  const k = upper(key);
  return upper(plant.id) === k || upper(plant.code) === k;
}

export function findPlant(plants, key) {
  return plants.find((p) => matchPlant(p, key));
}

export function plantsForUser(user, plants) {
  const raw = user?.plantId ?? user?.plant_id;
  const keys = toKeyList(raw);
  if (keys.length === 0 || keys.includes("ALL")) return plants;
  return plants.filter((p) => keys.some((k) => matchPlant(p, k)));
}

export function shiftsForPlant(plant) {
  return Array.isArray(plant?.shifts) && plant.shifts.length > 0
    ? plant.shifts
    : DEFAULT_SHIFTS;
}

export function inspectorsOfPlant(systemUsers, plant) {
  if (!plant) return [];
  return systemUsers
    .filter((u) => {
      if (upper(u.systemRole ?? u.system_role) !== "INSPECTOR") return false;
      if (u.active === false || u.status === "BAJA") return false;
      return toKeyList(u.plantId ?? u.plant_id).some((k) =>
        matchPlant(plant, k),
      );
    })
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

export const employeeNumber = (u) => u?.empNo ?? u?.emp_no ?? "";

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const todayISO = () => toISO(new Date());

export function tomorrowISO() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return toISO(t);
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatPlanDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const text = dateFormatter.format(new Date(y, m - 1, d)).replace(/\./g, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function friendlyError(error) {
  if (!error) return "Error desconocido";
  if (error.code === "23505") {
    return "Ya existe una planeación para esa planta, fecha y turno.";
  }
  return error.message || "Error al guardar";
}
