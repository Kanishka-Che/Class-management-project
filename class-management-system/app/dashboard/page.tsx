"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// =========================================
// Types
// =========================================

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

type ClassSummary = {
  classId: number;
  className: string;
  subject: string | null;
  teacherName: string | null;
  monthlyFee: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  collectionRate: number;
};

type MonthlyClassSummaryResponse = {
  year: number;
  month: number;
  classes: ClassSummary[];
};

type MonthlyStudentDetail = {
  studentId: number;
  studentCode: string;
  studentName: string;
  phone: string | null;
  status: "Paid" | "Unpaid";
  amount: number;
  paidAt: string | null;
};

type MonthlyClassDetailsResponse = {
  year: number;
  month: number;
  classId: number;
  className: string;
  subject: string | null;
  teacherName: string | null;
  monthlyFee: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  collectionRate: number;
  students: MonthlyStudentDetail[];
};

type PaymentDetail = {
  paymentId: number;
  studentId: number;
  studentCode: string | null;
  studentName: string;
  classId: number;
  className: string;
  feeYear: number;
  feeMonth: number;
  amount: number;
  paidAt: string;
};

type DailyCollectionDetailsResponse = {
  date: string;
  classId?: number | null;
  totalCollected: number;
  paymentCount: number;
  payments: PaymentDetail[];
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

  // =========================================
  // Filters
  // =========================================

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [selectedClassId, setSelectedClassId] =
    useState<string>("");

  const [selectedDate, setSelectedDate] =
    useState<string>("");

  // =========================================
  // Data
  // =========================================

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [classSummary, setClassSummary] =
    useState<MonthlyClassSummaryResponse | null>(null);

  const [classDetails, setClassDetails] =
    useState<MonthlyClassDetailsResponse | null>(null);

  const [dayDetails, setDayDetails] =
    useState<DailyCollectionDetailsResponse | null>(null);

  // =========================================
  // Loading
  // =========================================

  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [classSummaryLoading, setClassSummaryLoading] =
    useState(true);

  const [classDetailsLoading, setClassDetailsLoading] =
    useState(false);

  const [dayDetailsLoading, setDayDetailsLoading] =
    useState(false);

  // =========================================
  // Errors
  // =========================================

  const [summaryError, setSummaryError] = useState("");
  const [classSummaryError, setClassSummaryError] =
    useState("");
  const [classDetailsError, setClassDetailsError] =
    useState("");
  const [dayDetailsError, setDayDetailsError] =
    useState("");

  const selectedMonthName = monthNames[month - 1];

  const isDateMode = selectedDate !== "";

  // =========================================
  // Load dashboard summary
  // =========================================

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError("");

      try {
        const response = await api.get(
          "/api/dashboard/summary",
          {
            params: {
              year,
              month,
            },
          }
        );

        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (error) {
        console.error("Dashboard Summary Error:", error);

        if (!cancelled) {
          setSummary(null);
          setSummaryError(
            "Failed to load dashboard summary."
          );
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // =========================================
  // Load monthly class summary
  // =========================================

  useEffect(() => {
    let cancelled = false;

    const loadClassSummary = async () => {
      setClassSummaryLoading(true);
      setClassSummaryError("");

      try {
        const response = await api.get(
          "/api/dashboard/monthly-class-summary",
          {
            params: {
              year,
              month,
            },
          }
        );

        if (!cancelled) {
          setClassSummary(response.data);
        }
      } catch (error) {
        console.error(
          "Monthly Class Summary Error:",
          error
        );

        if (!cancelled) {
          setClassSummary(null);
          setClassSummaryError(
            "Failed to load monthly class summary."
          );
        }
      } finally {
        if (!cancelled) {
          setClassSummaryLoading(false);
        }
      }
    };

    loadClassSummary();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // =========================================
  // Load selected class monthly details
  // Only in monthly mode
  // =========================================

  useEffect(() => {
    if (!selectedClassId || isDateMode) {
      setClassDetails(null);
      setClassDetailsError("");
      return;
    }

    let cancelled = false;

    const loadClassDetails = async () => {
      setClassDetailsLoading(true);
      setClassDetailsError("");

      try {
        const response = await api.get(
          "/api/dashboard/monthly-class-details",
          {
            params: {
              year,
              month,
              classId: Number(selectedClassId),
            },
          }
        );

        if (!cancelled) {
          setClassDetails(response.data);
        }
      } catch (error) {
        console.error(
          "Monthly Class Details Error:",
          error
        );

        if (!cancelled) {
          setClassDetails(null);
          setClassDetailsError(
            "Failed to load class payment details."
          );
        }
      } finally {
        if (!cancelled) {
          setClassDetailsLoading(false);
        }
      }
    };

    loadClassDetails();

    return () => {
      cancelled = true;
    };
  }, [
    year,
    month,
    selectedClassId,
    isDateMode,
  ]);

  // =========================================
  // Load selected date actual payments
  // =========================================

  useEffect(() => {
    if (!selectedDate) {
      setDayDetails(null);
      setDayDetailsError("");
      return;
    }

    let cancelled = false;

    const loadDayDetails = async () => {
      setDayDetailsLoading(true);
      setDayDetailsError("");

      try {
        const params: {
          date: string;
          classId?: number;
        } = {
          date: selectedDate,
        };

        if (selectedClassId) {
          params.classId = Number(selectedClassId);
        }

        const response = await api.get(
          "/api/dashboard/daily-collections/details",
          {
            params,
          }
        );

        if (!cancelled) {
          setDayDetails(response.data);
        }
      } catch (error) {
        console.error(
          "Daily Collection Details Error:",
          error
        );

        if (!cancelled) {
          setDayDetails(null);
          setDayDetailsError(
            "Failed to load payments for selected date."
          );
        }
      } finally {
        if (!cancelled) {
          setDayDetailsLoading(false);
        }
      }
    };

    loadDayDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedClassId]);

  // =========================================
  // Selected class
  // =========================================

  const selectedClass =
    classSummary?.classes.find(
      (item) =>
        item.classId === Number(selectedClassId)
    ) ?? null;

  // =========================================
  // Monthly classes for graph/table
  // =========================================

  const visibleClasses = selectedClassId
    ? classSummary?.classes.filter(
        (item) =>
          item.classId === Number(selectedClassId)
      ) ?? []
    : classSummary?.classes ?? [];

  // =========================================
  // Monthly totals
  // =========================================

  const monthlyTotals = visibleClasses.reduce(
    (totals, item) => {
      totals.students += item.totalStudents;
      totals.paid += item.paidStudents;
      totals.unpaid += item.unpaidStudents;
      totals.collected += item.totalCollected;

      return totals;
    },
    {
      students: 0,
      paid: 0,
      unpaid: 0,
      collected: 0,
    }
  );

  const monthlyCollectionRate =
    monthlyTotals.students > 0
      ? (monthlyTotals.paid /
          monthlyTotals.students) *
        100
      : 0;

  // =========================================
  // Graph max value
  // =========================================

  const graphMax = Math.max(
    1,
    ...visibleClasses.map((item) =>
      Math.max(
        item.paidStudents,
        item.unpaidStudents
      )
    )
  );

  // =========================================
  // Formatters
  // =========================================

  const formatDate = (date: string) => {
    const [dateYear, dateMonth, dateDay] = date
      .split("-")
      .map(Number);

    return new Date(
      dateYear,
      dateMonth - 1,
      dateDay
    ).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaidDate = (paidAt: string | null) => {
    if (!paidAt) {
      return "-";
    }

    return new Date(paidAt).toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Colombo",
      }
    );
  };

  const formatPaidTime = (paidAt: string) => {
    return new Date(paidAt).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Colombo",
      }
    );
  };

  // =========================================
  // Summary cards
  // =========================================

  const cards = summary
    ? [
        {
          title: "Total Students",
          value:
            summary.totalStudents.toLocaleString(),
          accent:
            "bg-blue-50 text-blue-700",
        },
        {
          title: "Total Classes",
          value:
            summary.totalClasses.toLocaleString(),
          accent:
            "bg-violet-50 text-violet-700",
        },
        {
          title: "Today's Attendance",
          value:
            summary.todayAttendance.toLocaleString(),
          accent:
            "bg-emerald-50 text-emerald-700",
        },
        {
          title: "Monthly Attendance",
          value:
            summary.monthlyAttendance.toLocaleString(),
          accent:
            "bg-cyan-50 text-cyan-700",
        },
        {
          title: `${selectedMonthName} Paid Students`,
          value:
            summary.paidStudents.toLocaleString(),
          accent:
            "bg-teal-50 text-teal-700",
        },
        {
          title: `${selectedMonthName} Unpaid Students`,
          value:
            summary.unpaidStudents.toLocaleString(),
          accent:
            "bg-orange-50 text-orange-700",
        },
        {
          title: `${selectedMonthName} Fee Income`,
          value: `LKR ${summary.totalIncome.toLocaleString()}`,
          accent:
            "bg-indigo-50 text-indigo-700",
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* =========================================
          Header
      ========================================= */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Class Management System Overview
        </p>
      </div>

      {/* =========================================
          Filters
      ========================================= */}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Dashboard Filters
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Use month/year for fee reports. Select
              a date to view actual payments received
              on that day.
            </p>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="self-start rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Clear Date
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Month */}

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
              onChange={(e) =>
                setMonth(Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {monthNames.map((name, index) => (
                <option
                  key={name}
                  value={index + 1}
                >
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}

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
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              {Array.from(
                { length: 9 },
                (_, index) =>
                  now.getFullYear() - 6 + index
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}

          <div>
            <label
              htmlFor="dashboard-class"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Class
            </label>

            <select
              id="dashboard-class"
              value={selectedClassId}
              onChange={(e) =>
                setSelectedClassId(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="">
                All Classes
              </option>

              {classSummary?.classes.map(
                (item) => (
                  <option
                    key={item.classId}
                    value={item.classId}
                  >
                    {item.className}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Date */}

          <div>
            <label
              htmlFor="dashboard-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Date{" "}
              <span className="font-normal text-slate-400">
                (Optional)
              </span>
            </label>

            <input
              id="dashboard-date"
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-800">
            {isDateMode
              ? `Showing actual payments received on ${formatDate(
                  selectedDate
                )}${
                  selectedClass
                    ? ` • ${selectedClass.className}`
                    : " • All Classes"
                }`
              : `Showing ${selectedMonthName} ${year} fee report${
                  selectedClass
                    ? ` • ${selectedClass.className}`
                    : " • All Classes"
                }`}
          </p>
        </div>
      </div>

      {/* =========================================
          General summary cards
      ========================================= */}

      {!isDateMode && (
        <>
          {summaryLoading ? (
            <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
              Loading dashboard...
            </div>
          ) : summaryError || !summary ? (
            <div className="rounded-2xl bg-red-50 p-6 text-red-700">
              {summaryError ||
                "Dashboard data unavailable."}
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
        </>
      )}

      {/* =========================================
          MONTHLY MODE
      ========================================= */}

      {!isDateMode && (
        <>
          {/* Monthly Fee Overview */}

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Monthly Fee Report
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {selectedMonthName} {year} Fee Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Only fees belonging to{" "}
                {selectedMonthName} {year} are included.
                Payment date does not change the fee
                month.
              </p>
            </div>

            {classSummaryLoading ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                Loading monthly fee data...
              </div>
            ) : classSummaryError ||
              !classSummary ? (
              <div className="mt-6 rounded-xl bg-red-50 p-5 text-sm text-red-700">
                {classSummaryError ||
                  "Monthly class data unavailable."}
              </div>
            ) : (
              <>
                {/* Monthly totals */}

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-700">
                      Students
                    </p>
                    <p className="mt-2 text-2xl font-bold text-blue-900">
                      {monthlyTotals.students}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-700">
                      Paid
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-900">
                      {monthlyTotals.paid}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="text-xs font-medium text-orange-700">
                      Unpaid
                    </p>
                    <p className="mt-2 text-2xl font-bold text-orange-900">
                      {monthlyTotals.unpaid}
                    </p>
                  </div>

                  <div className="rounded-xl bg-indigo-50 p-4">
                    <p className="text-xs font-medium text-indigo-700">
                      Fee Income
                    </p>
                    <p className="mt-2 text-xl font-bold text-indigo-900">
                      LKR{" "}
                      {monthlyTotals.collected.toLocaleString()}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-violet-50 p-4 lg:col-span-1">
                    <p className="text-xs font-medium text-violet-700">
                      Collection Rate
                    </p>
                    <p className="mt-2 text-2xl font-bold text-violet-900">
                      {monthlyCollectionRate.toFixed(
                        1
                      )}
                      %
                    </p>
                  </div>
                </div>

               {/* =========================================
    Monthly Bar Chart
========================================= */}

<div className="mt-8">
  <div className="mb-5">
    <h3 className="font-bold text-slate-900">
      Paid vs Unpaid Students by Class
    </h3>

    <p className="mt-1 text-xs text-slate-500">
      {selectedMonthName} {year} monthly fee status
    </p>
  </div>

  {visibleClasses.length === 0 ? (
    <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
      No class data available.
    </div>
  ) : (
    <div className="h-[380px] w-full rounded-xl border border-slate-200 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={visibleClasses}
          margin={{
            top: 20,
            right: 20,
            left: 0,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="className"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />

          <Tooltip
            formatter={(value) => [
              Number(value).toLocaleString(),
              "Students",
            ]}
          />

          <Legend />

          <Bar
            dataKey="paidStudents"
            name="Paid Students"
            fill="#10b981"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="unpaidStudents"
            name="Unpaid Students"
            fill="#f59e0b"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )}
</div>

                {/* =========================================
                    Class Summary Table
                ========================================= */}

                <div className="mt-8">
                  <h3 className="font-bold text-slate-900">
                    Class Summary
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Payment status for the selected fee
                    month.
                  </p>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[850px] text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                            Class
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Fee
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                            Students
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                            Paid
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                            Unpaid
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Income
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Rate
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {visibleClasses.map(
                          (item) => (
                            <tr
                              key={item.classId}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4">
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.className}
                                </p>

                                {item.subject && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.subject}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-sm text-slate-700">
                                LKR{" "}
                                {item.monthlyFee.toLocaleString()}
                              </td>

                              <td className="px-4 py-4 text-center text-sm text-slate-700">
                                {item.totalStudents}
                              </td>

                              <td className="px-4 py-4 text-center text-sm font-semibold text-emerald-700">
                                {item.paidStudents}
                              </td>

                              <td className="px-4 py-4 text-center text-sm font-semibold text-orange-700">
                                {item.unpaidStudents}
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                                LKR{" "}
                                {item.totalCollected.toLocaleString()}
                              </td>

                              <td className="px-4 py-4 text-right text-sm text-slate-700">
                                {item.collectionRate.toFixed(
                                  1
                                )}
                                %
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedClassId(
                                      String(
                                        item.classId
                                      )
                                    )
                                  }
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  View Students
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* =========================================
              Selected Class Student Details
          ========================================= */}

          {selectedClassId && (
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
              {classDetailsLoading ? (
                <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                  Loading student payment details...
                </div>
              ) : classDetailsError ? (
                <div className="rounded-xl bg-red-50 p-5 text-sm text-red-700">
                  {classDetailsError}
                </div>
              ) : classDetails ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Class Fee Details
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      {classDetails.className}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMonthName} {year} Fee
                      Status
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Monthly Fee
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        LKR{" "}
                        {classDetails.monthlyFee.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs text-blue-700">
                        Students
                      </p>
                      <p className="mt-1 text-xl font-bold text-blue-900">
                        {classDetails.totalStudents}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-700">
                        Paid
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-900">
                        {classDetails.paidStudents}
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-xs text-orange-700">
                        Unpaid
                      </p>
                      <p className="mt-1 text-xl font-bold text-orange-900">
                        {classDetails.unpaidStudents}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-indigo-50 p-4 lg:col-span-1">
                      <p className="text-xs text-indigo-700">
                        Collected
                      </p>
                      <p className="mt-1 font-bold text-indigo-900">
                        LKR{" "}
                        {classDetails.totalCollected.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                            Student
                          </th>

                          <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                            Student Code
                          </th>

                          <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                            Phone
                          </th>

                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                            Status
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                            Paid Date
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {classDetails.students.map(
                          (student) => (
                            <tr
                              key={student.studentId}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                                {student.studentName}
                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">
                                {student.studentCode ||
                                  "-"}
                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">
                                {student.phone || "-"}
                              </td>

                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    student.status ===
                                    "Paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-orange-50 text-orange-700"
                                  }`}
                                >
                                  {student.status}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                                {student.status ===
                                "Paid"
                                  ? `LKR ${student.amount.toLocaleString()}`
                                  : "-"}
                              </td>

                              <td className="px-4 py-4 text-right text-sm text-slate-600">
                                {formatPaidDate(
                                  student.paidAt
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* =========================================
          DATE MODE
      ========================================= */}

      {isDateMode && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Actual Cash Collection
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {formatDate(selectedDate)}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Actual payments received on this date,
              regardless of which fee month they belong
              to.
              {selectedClass &&
                ` Showing ${selectedClass.className} only.`}
            </p>
          </div>

          {dayDetailsLoading ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
              Loading payments...
            </div>
          ) : dayDetailsError ? (
            <div className="mt-6 rounded-xl bg-red-50 p-5 text-sm text-red-700">
              {dayDetailsError}
            </div>
          ) : dayDetails ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-700">
                    Payments
                  </p>

                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    {dayDetails.paymentCount}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-700">
                    Total Collected
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-900">
                    LKR{" "}
                    {dayDetails.totalCollected.toLocaleString()}
                  </p>
                </div>
              </div>

              {dayDetails.payments.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No payments were received on this
                  date
                  {selectedClass
                    ? ` for ${selectedClass.className}`
                    : ""}
                  .
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[950px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                          Student
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                          Student Code
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                          Class
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                          Fee Month
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                          Paid Time
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {dayDetails.payments.map(
                        (payment) => (
                          <tr
                            key={payment.paymentId}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {payment.studentName}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {payment.studentCode ||
                                "-"}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {payment.className}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {monthNames[
                                payment.feeMonth - 1
                              ] ||
                                payment.feeMonth}{" "}
                              {payment.feeYear}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatPaidTime(
                                payment.paidAt
                              )}
                            </td>

                            <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                              LKR{" "}
                              {payment.amount.toLocaleString()}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>

                    <tfoot className="bg-slate-100">
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-sm font-bold text-slate-900"
                        >
                          Total
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                          LKR{" "}
                          {dayDetails.totalCollected.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* =========================================
          Quick Actions
      ========================================= */}

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
              name: "Promote Students",
              href: "/dashboard/enrollments/promote",
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
              className="flex min-h-20 items-center justify-center rounded-xl bg-slate-100 p-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}