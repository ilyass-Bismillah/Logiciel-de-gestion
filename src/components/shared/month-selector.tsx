"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMonthYearFR } from "@/lib/utils";

export function MonthSelector({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateTo = (nextYear: number, nextMonth: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(nextYear));
    params.set("month", String(nextMonth));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrev = () => {
    if (month === 1) navigateTo(year - 1, 12);
    else navigateTo(year, month - 1);
  };

  const handleNext = () => {
    if (month === 12) navigateTo(year + 1, 1);
    else navigateTo(year, month + 1);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={handlePrev}
        className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Mois précédent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2.5 text-xs font-semibold text-slate-800 sm:text-sm">
        <Calendar className="h-3.5 w-3.5 text-indigo-600" />
        <span className="min-w-[125px] text-center">
          {formatMonthYearFR(year, month)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Mois suivant"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
