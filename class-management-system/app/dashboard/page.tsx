
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

type DashboardSummary = {
  year: number;
  month: number;
  totalStudents: number;
  totalClasses: number;
  todayAttendance: number;
  monthlyAttendance: number;
  paidStudents: number;
  unpaidStudents: number;
  totalIncome: number;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DashboardPage() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/api/dashboard/summary",
          {
            params: { year, month },
          }
        );

        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (error) {
        console.error("Dashboard API Error:", error);

        if (!cancelled) {
          setSummary(null);
          setError("Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const selectedMonthName = monthNames[month - 1];

  const cards = summary
    ? [
        {
          title: "Total Students",
          value: summary.totalStudents.toLocaleString(),
          accent: "bg-blue-50 text-blue-700",
        },
        {
          title: "Total Classes",
          value: summary.totalClasses.toLocaleString(),
          accent: "bg-violet-50 text-violet-700",
        },
        {
          title: "Today's Attendance",
          value: summary.todayAttendance.toLocaleString(),
          accent: "bg-emerald-50 text-emerald-700",
        },
        {
          title: "Monthly Attendance",
          value: summary.monthlyAttendance.toLocaleString(),
          accent: "bg-cyan-50 text-cyan-700",
        },
        {
          title: "Paid Students",
          value: summary.paidStudents.toLocaleString(),
          accent: "bg-teal-50 text-teal-700",
        },
        {
          title: "Unpaid Students",
          value: summary.unpaidStudents.toLocaleString(),
          accent: "bg-orange-50 text-orange-700",
        },
        {
          title: "Monthly Income",
          value: `LKR ${summary.totalIncome.toLocaleString()}`,
          accent: "bg-indigo-50 text-indigo-700",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Class Management System Overview
        </p>
      </div>

      {/* Month and year selector */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900">
          Select Month & Year
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-lg">
          <div>
            <label
              htmlFor="dashboard-month"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Month
            </label>

            <select
              id="dashboard-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dashboard-year"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Year
            </label>

            <select
              id="dashboard-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {Array.from(
                { length: 7 },
                (_, index) => now.getFullYear() - 5 + index
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium text-blue-700">
          Showing: {selectedMonthName} {year}
        </p>
      </div>

      {/* QR scanner quick access */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
              Quick Attendance
            </p>

            <h2 className="mt-2 text-xl font-bold sm:text-2xl">
              Scan Student QR
            </h2>

            <p className="mt-2 text-sm text-blue-100">
              Use your phone camera to mark student attendance.
            </p>
          </div>

          <Link
            href="/dashboard/attendance/qr"
            className="inline-flex min-h-14 items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-bold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Open QR Scanner
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          Loading dashboard...
        </div>
      ) : error || !summary ? (
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          {error || "Dashboard data unavailable."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6"
            >
              <div
                className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${card.accent}`}
              >
                {card.title}
              </div>

              <p className="mt-4 break-words text-xl font-bold text-slate-900 sm:text-3xl">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Quick Actions
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              name: "Attendance",
              href: "/dashboard/attendance",
            },
            {
              name: "Students",
              href: "/dashboard/students",
            },
            {
              name: "Payments",
              href: "/dashboard/payments",
            },
            {
              name: "Classes",
              href: "/dashboard/classes",
            },
            {
              name: "Reports",
              href: "/dashboard/reports",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-20 items-center justify-center rounded-xl bg-slate-100 p-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
