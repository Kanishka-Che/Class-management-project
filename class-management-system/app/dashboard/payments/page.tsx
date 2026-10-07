"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  teacherName: string | null;
  monthlyFee: number;
  day: string | null;
  startTime: string | null;
  isActive: boolean;
};

type Payment = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  year: number;
  month: number;
  amount: number;
  paidAt: string;
};

type UnpaidStudent = {
  id: number;
  studentCode: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  parentName: string | null;
  parentPhone: string | null;
  school: string | null;
  isActive: boolean;
};

type PaymentSummary = {
  classId: number;
  year: number;
  month: number;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
};

type StudentRow = {
  studentId: number;
  studentCode: string;
  studentName: string;
  status: "PAID" | "UNPAID";
  amount: number | null;
  paidAt: string | null;
};

const months = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

export default function PaymentsPage() {
  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [selectedYear, setSelectedYear] =
    useState(currentYear.toString());

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth.toString());

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [unpaidStudents, setUnpaidStudents] =
    useState<UnpaidStudent[]>([]);

  const [summary, setSummary] =
    useState<PaymentSummary | null>(null);

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [loadingPayments, setLoadingPayments] =
    useState(false);

  const [payingStudentId, setPayingStudentId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // Load Classes
  // =========================================
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        setError("");

        const response = await api.get(
          "/api/classes"
        );

        setClasses(response.data);
      } catch (error) {
        console.error(
          "Load Classes Error:",
          error
        );

        setError(
          "Failed to load classes."
        );
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // =========================================
  // Load Payment Data
  // =========================================
  const loadPaymentData = async (
    classId: string,
    year: string,
    month: string
  ) => {
    if (!classId || !year || !month) {
      setPayments([]);
      setUnpaidStudents([]);
      setSummary(null);
      return;
    }

    const yearNumber = Number(year);
    const monthNumber = Number(month);

    if (
      yearNumber < 2000 ||
      yearNumber > 2100 ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return;
    }

    try {
      setLoadingPayments(true);
      setError("");

      const [
        paymentsResponse,
        unpaidResponse,
        summaryResponse,
      ] = await Promise.all([
        api.get(
          `/api/payments/class/${classId}/year/${year}/month/${month}`
        ),

        api.get(
          `/api/payments/class/${classId}/year/${year}/month/${month}/unpaid`
        ),

        api.get(
          `/api/payments/class/${classId}/year/${year}/month/${month}/summary`
        ),
      ]);

      setPayments(paymentsResponse.data);
      setUnpaidStudents(unpaidResponse.data);
      setSummary(summaryResponse.data);
    } catch (error: any) {
      console.error(
        "Load Payment Data Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : "Failed to load payment information.";

      setError(message);

      setPayments([]);
      setUnpaidStudents([]);
      setSummary(null);
    } finally {
      setLoadingPayments(false);
    }
  };

  // =========================================
  // Class Change
  // =========================================
  const handleClassChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const classId = e.target.value;

    setSelectedClassId(classId);
    setSuccess("");
    setError("");

    await loadPaymentData(
      classId,
      selectedYear,
      selectedMonth
    );
  };

  // =========================================
  // Year Change
  // =========================================
  const handleYearChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const year = e.target.value;

    setSelectedYear(year);
    setSuccess("");
    setError("");

    if (
      selectedClassId &&
      Number(year) >= 2000 &&
      Number(year) <= 2100
    ) {
      await loadPaymentData(
        selectedClassId,
        year,
        selectedMonth
      );
    }
  };

  // =========================================
  // Month Change
  // =========================================
  const handleMonthChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const month = e.target.value;

    setSelectedMonth(month);
    setSuccess("");
    setError("");

    if (selectedClassId) {
      await loadPaymentData(
        selectedClassId,
        selectedYear,
        month
      );
    }
  };

  // =========================================
  // Record Payment
  // =========================================
  const handlePayment = async (
    student: UnpaidStudent
  ) => {
    if (!selectedClassId) {
      setError(
        "Please select a class."
      );
      return;
    }

    const selectedClass =
      classes.find(
        (item) =>
          item.id ===
          Number(selectedClassId)
      );

    const monthName =
      months.find(
        (item) =>
          item.value ===
          Number(selectedMonth)
      )?.name ?? selectedMonth;

    const studentName =
      `${student.firstName} ${
        student.lastName ?? ""
      }`.trim();

    const confirmed =
      window.confirm(
        `Confirm payment?\n\n` +
          `Student: ${student.studentCode} - ${studentName}\n` +
          `Class: ${selectedClass?.name ?? ""}\n` +
          `Month: ${monthName} ${selectedYear}\n` +
          `Amount: LKR ${
            selectedClass?.monthlyFee?.toLocaleString() ??
            "0"
          }`
      );

    if (!confirmed) {
      return;
    }

    try {
      setPayingStudentId(student.id);
      setError("");
      setSuccess("");

      await api.post(
        "/api/payments",
        {
          studentId: student.id,
          classId: Number(
            selectedClassId
          ),
          year: Number(
            selectedYear
          ),
          month: Number(
            selectedMonth
          ),
        }
      );

      setSuccess(
        `Payment recorded successfully for ${studentName}.`
      );

      await loadPaymentData(
        selectedClassId,
        selectedYear,
        selectedMonth
      );
    } catch (error: any) {
      console.error(
        "Record Payment Error:",
        error
      );

      const message =
        typeof error.response?.data ===
        "string"
          ? error.response.data
          : error.response?.data
              ?.message ||
            "Failed to record payment.";

      setError(message);
    } finally {
      setPayingStudentId(null);
    }
  };

  // =========================================
  // Combined Student List
  // =========================================
  const studentRows: StudentRow[] = [
    ...payments.map(
      (payment) => ({
        studentId:
          payment.studentId,

        studentCode:
          payment.studentCode,

        studentName:
          payment.studentName,

        status:
          "PAID" as const,

        amount:
          payment.amount,

        paidAt:
          payment.paidAt,
      })
    ),

    ...unpaidStudents.map(
      (student) => ({
        studentId:
          student.id,

        studentCode:
          student.studentCode,

        studentName:
          `${student.firstName} ${
            student.lastName ?? ""
          }`.trim(),

        status:
          "UNPAID" as const,

        amount: null,
        paidAt: null,
      })
    ),
  ].sort((a, b) =>
    a.studentCode.localeCompare(
      b.studentCode
    )
  );

  // =========================================
  // Find Unpaid Student
  // =========================================
  const getUnpaidStudent = (
    studentId: number
  ) => {
    return unpaidStudents.find(
      (student) =>
        student.id === studentId
    );
  };

  // =========================================
  // Format Money
  // =========================================
  const formatMoney = (
    amount: number
  ) => {
    return `LKR ${Number(
      amount
    ).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================
  // Format Date
  // =========================================
  const formatDate = (
    date: string
  ) => {
    if (!date) return "-";

    return new Date(
      date
    ).toLocaleString("en-LK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================
  // Selected Class
  // =========================================
  const selectedClass =
    classes.find(
      (item) =>
        item.id ===
        Number(selectedClassId)
    );

  const selectedMonthName =
    months.find(
      (month) =>
        month.value ===
        Number(selectedMonth)
    )?.name;

  // =========================================
  // Loading
  // =========================================
  if (loadingClasses) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="font-medium text-gray-600">
          Loading payments...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =====================================
          Header
          ===================================== */}
      <div>
        <h1 className="text-3xl font-bold text-gray-950">
          Payments
        </h1>

        <p className="mt-2 text-gray-600">
          Manage monthly class fee payments
        </p>
      </div>

      {/* =====================================
          Payment Filters
          ===================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-950">
            Payment Filters
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select a class, academic year and month
            to manage payments
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Class
            </label>

            <select
              value={
                selectedClassId
              }
              onChange={
                handleClassChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                Select Class
              </option>

              {classes.map(
                (classItem) => (
                  <option
                    key={
                      classItem.id
                    }
                    value={
                      classItem.id
                    }
                  >
                    {
                      classItem.name
                    }

                    {classItem.subject
                      ? ` - ${classItem.subject}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Academic Year
            </label>

            <input
              type="number"
              min="2000"
              max="2100"
              value={
                selectedYear
              }
              onChange={
                handleYearChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Month */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Month
            </label>

            <select
              value={
                selectedMonth
              }
              onChange={
                handleMonthChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {months.map(
                (month) => (
                  <option
                    key={
                      month.value
                    }
                    value={
                      month.value
                    }
                  >
                    {month.name}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        {selectedClassId && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              Class:{" "}
              {selectedClass?.name}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Year:{" "}
              {selectedYear}
            </span>

            <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
              Month:{" "}
              {selectedMonthName}
            </span>

            {selectedClass && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                Monthly Fee:{" "}
                {formatMoney(
                  selectedClass.monthlyFee
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* =====================================
          Messages
          ===================================== */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-medium text-green-700">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =====================================
          Summary Cards
          ===================================== */}
      {selectedClassId &&
        summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Students"
              value={summary.totalStudents.toString()}
              description="Enrolled students"
              variant="default"
            />

            <SummaryCard
              title="Paid"
              value={summary.paidStudents.toString()}
              description="Payments completed"
              variant="success"
            />

            <SummaryCard
              title="Unpaid"
              value={summary.unpaidStudents.toString()}
              description="Payments pending"
              variant="danger"
            />

            <SummaryCard
              title="Total Collected"
              value={formatMoney(
                summary.totalCollected
              )}
              description={`${selectedMonthName} ${selectedYear}`}
              variant="primary"
            />
          </div>
        )}

      {/* =====================================
          Payments Table
          ===================================== */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Title */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Monthly Payment Status
            </h2>

            {selectedClassId ? (
              <p className="mt-1 text-sm text-gray-600">
                {selectedClass?.name}
                {" • "}
                {selectedMonthName}
                {" "}
                {selectedYear}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Select a class to view monthly payments
              </p>
            )}
          </div>

          {selectedClassId &&
            summary && (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700">
                  Paid:{" "}
                  {
                    summary.paidStudents
                  }
                </span>

                <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700">
                  Unpaid:{" "}
                  {
                    summary.unpaidStudents
                  }
                </span>
              </div>
            )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold">
                  Student Code
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Student Name
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Amount
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Paid At
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingPayments ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center font-medium text-gray-500"
                  >
                    Loading payment
                    information...
                  </td>
                </tr>
              ) : !selectedClassId ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center"
                  >
                    <p className="font-semibold text-gray-700">
                      Select a class to
                      view payments.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Choose a class,
                      academic year and
                      month above.
                    </p>
                  </td>
                </tr>
              ) : studentRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center"
                  >
                    <p className="font-semibold text-gray-700">
                      No enrolled
                      students found.
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      There are no
                      students enrolled
                      in this class for{" "}
                      {selectedYear}.
                    </p>
                  </td>
                </tr>
              ) : (
                studentRows.map(
                  (
                    student,
                    index
                  ) => (
                    <tr
                      key={
                        student.studentId
                      }
                      className={`border-t border-gray-100 transition hover:bg-blue-50 ${
                        index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50"
                      }`}
                    >
                      {/* Student Code */}
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                          {
                            student.studentCode
                          }
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="px-6 py-4 font-semibold text-gray-950">
                        {
                          student.studentName
                        }
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {student.status ===
                        "PAID" ? (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {student.amount !==
                        null
                          ? formatMoney(
                              student.amount
                            )
                          : "-"}
                      </td>

                      {/* Paid At */}
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {student.paidAt
                          ? formatDate(
                              student.paidAt
                            )
                          : "-"}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        {student.status ===
                        "UNPAID" ? (
                          <button
                            type="button"
                            disabled={
                              payingStudentId ===
                              student.studentId
                            }
                            onClick={() => {
                              const unpaidStudent =
                                getUnpaidStudent(
                                  student.studentId
                                );

                              if (
                                unpaidStudent
                              ) {
                                handlePayment(
                                  unpaidStudent
                                );
                              }
                            }}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                            {payingStudentId ===
                            student.studentId
                              ? "Processing..."
                              : "Pay Fee"}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                            ✓ Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================
// Summary Card
// =========================================
function SummaryCard({
  title,
  value,
  description,
  variant = "default",
}: {
  title: string;
  value: string;
  description: string;
  variant?:
    | "default"
    | "success"
    | "danger"
    | "primary";
}) {
  const styles = {
    default: {
      card: "border-gray-200",
      badge:
        "bg-gray-100 text-gray-700",
    },

    success: {
      card: "border-green-200",
      badge:
        "bg-green-100 text-green-700",
    },

    danger: {
      card: "border-red-200",
      badge:
        "bg-red-100 text-red-700",
    },

    primary: {
      card: "border-blue-200",
      badge:
        "bg-blue-100 text-blue-700",
    },
  };

  const selectedStyle =
    styles[variant];

  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-sm ${selectedStyle.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-600">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-950">
            {value}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedStyle.badge}`}
        >
          {variant === "success"
            ? "PAID"
            : variant === "danger"
              ? "DUE"
              : variant === "primary"
                ? "LKR"
                : "TOTAL"}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}