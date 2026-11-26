"use client";

import * as React from "react";
import { formatMAD } from "@/lib/utils";
import type { DailyCashRegister, ExpenseReceipt } from "@/types/database";

interface DayPoint {
  day: number;
  dateStr: string;
  revenue: number;
  cash: number;
  card: number;
  delivery: number;
  expense: number;
}

export function RevenueExpenseChart({
  year,
  month,
  daysInMonth,
  cashRegisters,
  expenses,
}: {
  year: number;
  month: number;
  daysInMonth: number;
  cashRegisters: DailyCashRegister[];
  expenses: ExpenseReceipt[];
}) {
  const [hoveredDay, setHoveredDay] = React.useState<DayPoint | null>(null);

  const points: DayPoint[] = React.useMemo(() => {
    const mm = String(month).padStart(2, "0");
    const cashMap = new Map<string, DailyCashRegister>();
    for (const r of cashRegisters) {
      cashMap.set(r.register_date, r);
    }

    const expMap = new Map<string, number>();
    for (const e of expenses) {
      expMap.set(
        e.expense_date,
        (expMap.get(e.expense_date) ?? 0) + Number(e.amount_ttc)
      );
    }

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dd = String(day).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;
      const reg = cashMap.get(dateStr);
      const expense = expMap.get(dateStr) ?? 0;

      return {
        day,
        dateStr,
        revenue: reg ? Number(reg.total_revenue) : 0,
        cash: reg ? Number(reg.cash_sales) : 0,
        card: reg ? Number(reg.card_sales) : 0,
        delivery: reg ? Number(reg.delivery_other_sales) : 0,
        expense,
      };
    });
  }, [year, month, daysInMonth, cashRegisters, expenses]);

  const maxVal = React.useMemo(() => {
    const peak = Math.max(
      ...points.map((p) => Math.max(p.revenue, p.expense)),
      1000
    );
    return Math.ceil(peak / 5000) * 5000;
  }, [points]);

  const activePoint =
    hoveredDay ??
    [...points].reverse().find((p) => p.revenue > 0 || p.expense > 0) ??
    points[0];

  return (
    <div className="space-y-4">
      {/* Barre d'inspection dynamique */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-900">
            Journée du{" "}
            {activePoint
              ? `${String(activePoint.day).padStart(2, "0")}/${String(
                  month
                ).padStart(2, "0")}/${year}`
              : "—"}
          </span>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Recettes Caisse
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
              Achats / Dépenses
            </span>
          </div>
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-3 tabular-nums">
            <span className="font-semibold text-emerald-700">
              CA : {formatMAD(activePoint.revenue, false)}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">
              Esp. {formatMAD(activePoint.cash, false)} / TPE{" "}
              {formatMAD(activePoint.card, false)}
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-rose-600">
              Dép. : {formatMAD(activePoint.expense, false)}
            </span>
          </div>
        )}
      </div>

      {/* Graphique en barres responsive */}
      <div className="relative pt-2">
        <div className="flex h-52 items-end gap-1 sm:gap-1.5 border-b border-slate-200 pb-1">
          {points.map((pt) => {
            const revPct = Math.min(100, (pt.revenue / maxVal) * 100);
            const expPct = Math.min(100, (pt.expense / maxVal) * 100);
            const isSelected = activePoint?.day === pt.day;

            return (
              <button
                key={pt.day}
                type="button"
                onMouseEnter={() => setHoveredDay(pt)}
                onFocus={() => setHoveredDay(pt)}
                onClick={() => setHoveredDay(pt)}
                className={`group relative flex h-full flex-1 flex-col justify-end rounded-t-md px-[1px] transition-colors ${
                  isSelected ? "bg-indigo-50/70" : "hover:bg-slate-100/70"
                }`}
                aria-label={`Jour ${pt.day}: Recettes ${pt.revenue} MAD, Dépenses ${pt.expense} MAD`}
              >
                <div className="flex h-full w-full items-end justify-center gap-[2px]">
                  <div
                    style={{
                      height: pt.revenue > 0 ? `${Math.max(4, revPct)}%` : "2px",
                    }}
                    className={`w-1/2 rounded-t-xs transition-all ${
                      pt.revenue > 0
                        ? "bg-emerald-500 group-hover:bg-emerald-600"
                        : "bg-slate-200"
                    }`}
                  />
                  <div
                    style={{
                      height: pt.expense > 0 ? `${Math.max(4, expPct)}%` : "2px",
                    }}
                    className={`w-1/2 rounded-t-xs transition-all ${
                      pt.expense > 0
                        ? "bg-rose-400 group-hover:bg-rose-500"
                        : "bg-slate-100"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Axe des jours */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>01</span>
          <span>08</span>
          <span>15</span>
          <span>22</span>
          <span>{String(daysInMonth).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Légende mobile */}
      <div className="flex items-center justify-center gap-4 text-xs sm:hidden">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Recettes Caisse
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />
          Achats / Dépenses
        </span>
      </div>
    </div>
  );
}
