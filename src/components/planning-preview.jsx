"use client";

import React, { useCallback, useState } from "react";
import SupervisorPlanning from "./supervisor-planning/SupervisorPlanning";

const plants = [
  { id: "P1", code: "BWA", name: "Planta Bajío", shifts: ["Turno 1 (06:00 - 14:30)", "Turno 2 (14:00 - 22:30)"] },
  { id: "P2", code: "MTY", name: "Planta Monterrey" },
];

const systemUsers = [
  { id: "u1", empNo: "10234", name: "Ana López", systemRole: "INSPECTOR", plantId: ["P1"] },
  { id: "u2", empNo: "10391", name: "Carlos Méndez", systemRole: "INSPECTOR", plantId: "P1" },
  { id: "u3", empNo: "10477", name: "Diana Ruiz", systemRole: "INSPECTOR", plant_id: "BWA" },
  { id: "u4", empNo: "10512", name: "Ernesto Salas", systemRole: "INSPECTOR", plantId: ["P1", "P2"] },
  { id: "u5", empNo: "10620", name: "Fernanda Torres", systemRole: "INSPECTOR", plantId: ["P2"] },
  { id: "u6", empNo: "10701", name: "Gabriel Vega", systemRole: "INSPECTOR", plantId: ["P1"], status: "BAJA" },
];

const currentUser = { id: "sup-1", name: "Supervisor Demo", plantId: "P1,P2" };

export default function PlanningPreview() {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, key: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6" style={{ colorScheme: "light" }}>
      <div className="max-w-3xl mx-auto">
        <SupervisorPlanning
          currentUser={currentUser}
          plants={plants}
          systemUsers={systemUsers}
          showToast={showToast}
        />
      </div>
      <div aria-live="polite" className="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none">
        {toast && (
          <div
            key={toast.key}
            className={`px-3 py-2 rounded-lg text-xs font-semibold shadow-lg ${
              toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </main>
  );
}
