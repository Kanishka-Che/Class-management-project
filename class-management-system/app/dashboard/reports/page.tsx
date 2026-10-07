"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type AttendanceRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  attendanceDate: string;
  checkInTime: string;
};

type PaymentRecord = {
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

type MonthlyAttendanceReport = {
  year: number;
  month: number;
  totalAttendance: number;
  attendances: AttendanceRecord[];
};

type DailyAttendanceReport = {
  date: string;
  totalAttendance: number;
  attendances: AttendanceRecord[];
};

type MonthlyPaymentReport = {
  year: number;
  month: number;
  totalPayments: number;
  totalCollected: number;
  payments: PaymentRecord[];
};

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

type ClassSummary = {
  classId: number;
  className: string;
  subject: string | null;
  teacherName: string | null;
  monthlyFee: number;
  year: number;
  totalStudents: number;
  totalAttendance: number;
  totalPayments: number;
  totalCollected: number;
};

type Student = {
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

type StudentReport = {
  student: {
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
  totalAttendance: number;
  attendances: AttendanceRecord[];
  totalPayments: number;
  totalPaid: number;
  payments: PaymentRecord[];
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

export default function ReportsPage() {
  const today = new Date();

  const [year, setYear] = useState(
    today.getFullYear().toString()
  );

  const [month, setMonth] = useState(
    (today.getMonth() + 1).toString()
  );

  const [dailyDate, setDailyDate] = useState(
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`
  );

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [attendanceReport, setAttendanceReport] =
    useState<MonthlyAttendanceReport | null>(null);

  const [dailyAttendanceReport, setDailyAttendanceReport] =
    useState<DailyAttendanceReport | null>(null);

  const [paymentReport, setPaymentReport] =
    useState<MonthlyPaymentReport | null>(null);

  const [classSummary, setClassSummary] =
    useState<ClassSummary | null>(null);

  const [studentReport, setStudentReport] =
    useState<StudentReport | null>(null);

  const [loading, setLoading] = useState(false);

  const [dailyLoading, setDailyLoading] =
    useState(false);

  const [classLoading, setClassLoading] =
    useState(false);

  const [studentLoading, setStudentLoading] =
    useState(false);

  const [error, setError] = useState("");

  // =========================================
  // Load Classes + Students
  // =========================================
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setError("");

        const [
          classesResponse,
          studentsResponse,
        ] = await Promise.all([
          api.get("/api/classes"),
          api.get("/api/students"),
        ]);

        setClasses(classesResponse.data);
        setStudents(studentsResponse.data);
      } catch (error) {
        console.error(
          "Load Initial Data Error:",
          error
        );

        setError(
          "Failed to load classes or students."
        );
      }
    };

    loadInitialData();
  }, []);

  // =========================================
  // Load Monthly Reports
  // =========================================
  const loadMonthlyReports = async () => {
    const yearNumber = Number(year);
    const monthNumber = Number(month);

    if (
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      setError("Please enter a valid year.");
      return;
    }

    if (
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      setError("Please select a valid month.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        attendanceResponse,
        paymentResponse,
      ] = await Promise.all([
        api.get(
          `/api/reports/attendance/monthly?year=${yearNumber}&month=${monthNumber}`
        ),

        api.get(
          `/api/reports/payments/monthly?year=${yearNumber}&month=${monthNumber}`
        ),
      ]);

      setAttendanceReport(
        attendanceResponse.data
      );

      setPaymentReport(
        paymentResponse.data
      );
    } catch (error: any) {
      console.error(
        "Load Reports Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to load reports.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // Load Daily Attendance Report
  // =========================================
  const loadDailyAttendanceReport = async () => {
    if (!dailyDate) {
      setError("Please select a date.");
      return;
    }

    try {
      setDailyLoading(true);
      setError("");
      setDailyAttendanceReport(null);

      const response = await api.get(
        `/api/reports/attendance/daily?date=${dailyDate}`
      );

      setDailyAttendanceReport(response.data);
    } catch (error: any) {
      console.error(
        "Load Daily Attendance Report Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to load daily attendance report.";

      setError(message);
      setDailyAttendanceReport(null);
    } finally {
      setDailyLoading(false);
    }
  };

  // =========================================
  // Load Class Summary
  // =========================================
  const loadClassSummary = async () => {
    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }

    const yearNumber = Number(year);

    if (
      yearNumber < 2000 ||
      yearNumber > 2100
    ) {
      setError("Please enter a valid year.");
      return;
    }

    try {
      setClassLoading(true);
      setError("");

      const response = await api.get(
        `/api/reports/class/${selectedClassId}/year/${yearNumber}`
      );

      setClassSummary(response.data);
    } catch (error: any) {
      console.error(
        "Load Class Summary Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to load class summary.";

      setError(message);
      setClassSummary(null);
    } finally {
      setClassLoading(false);
    }
  };

  // =========================================
  // Load Student Full Report
  // =========================================
  const loadStudentReport = async () => {
    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    try {
      setStudentLoading(true);
      setError("");
      setStudentReport(null);

      const response = await api.get(
        `/api/reports/student/${selectedStudentId}`
      );

      setStudentReport(response.data);
    } catch (error: any) {
      console.error(
        "Load Student Report Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to load student report.";

      setError(message);
      setStudentReport(null);
    } finally {
      setStudentLoading(false);
    }
  };

  // =========================================
  // Format Money
  // =========================================
  const formatMoney = (amount: number) => {
    return `LKR ${Number(amount).toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  // =========================================
  // Format Date
  // =========================================
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      "en-LK",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }
    );
  };

  // =========================================
  // Format Time
  // =========================================
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(
      "en-LK",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =========================================
  // Get Month Name
  // =========================================
  const getMonthName = (monthNumber: number) => {
    return (
      months.find(
        (item) => item.value === monthNumber
      )?.name || monthNumber.toString()
    );
  };

  return (
    <div>
      {/* =========================================
          Header
      ========================================= */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports
        </h1>

        <p className="mt-2 text-gray-600">
          View attendance, payment, class and
          student reports
        </p>
      </div>

      {/* =========================================
          Monthly Reports
      ========================================= */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Monthly Reports
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View attendance and payment reports by
          month.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Year
            </label>

            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setAttendanceReport(null);
                setPaymentReport(null);
                setClassSummary(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Month
            </label>

            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setAttendanceReport(null);
                setPaymentReport(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            >
              {months.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadMonthlyReports}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? "Loading..."
                : "Generate Monthly Report"}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          Error
      ========================================= */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* =========================================
          Monthly Report Results
      ========================================= */}
      {attendanceReport && paymentReport && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total Attendance"
              value={attendanceReport.totalAttendance.toString()}
            />

            <SummaryCard
              title="Total Payments"
              value={paymentReport.totalPayments.toString()}
            />

            <SummaryCard
              title="Total Collected"
              value={formatMoney(
                paymentReport.totalCollected
              )}
            />
          </div>

          {/* Attendance */}
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Monthly Attendance Report
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {getMonthName(Number(month))}{" "}
                {year}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                  <tr>
                    <th className="px-6 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4">
                      Student Code
                    </th>

                    <th className="px-6 py-4">
                      Student Name
                    </th>

                    <th className="px-6 py-4">
                      Class
                    </th>

                    <th className="px-6 py-4">
                      Check-In
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceReport.attendances
                    .length > 0 ? (
                    attendanceReport.attendances.map(
                      (record) => (
                        <tr
                          key={record.id}
                          className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            {record.attendanceDate}
                          </td>

                          <td className="px-6 py-4 font-medium text-gray-900">
                            {record.studentCode}
                          </td>

                          <td className="px-6 py-4">
                            {record.studentName}
                          </td>

                          <td className="px-6 py-4">
                            {record.className}
                          </td>

                          <td className="px-6 py-4">
                            {formatTime(
                              record.checkInTime
                            )}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments */}
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Monthly Payment Report
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {getMonthName(Number(month))}{" "}
                {year}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm text-gray-700">
               <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                  <tr>
                    <th className="px-6 py-4">
                      Student Code
                    </th>

                    <th className="px-6 py-4">
                      Student Name
                    </th>

                    <th className="px-6 py-4">
                      Class
                    </th>

                    <th className="px-6 py-4">
                      Amount
                    </th>

                    <th className="px-6 py-4">
                      Paid Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paymentReport.payments.length >
                  0 ? (
                    paymentReport.payments.map(
                      (payment) => (
                        <tr
                          key={payment.id}
                          className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {payment.studentCode}
                          </td>

                          <td className="px-6 py-4">
                            {payment.studentName}
                          </td>

                          <td className="px-6 py-4">
                            {payment.className}
                          </td>

                          <td className="px-6 py-4">
                            {formatMoney(
                              payment.amount
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {formatDate(
                              payment.paidAt
                            )}
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =========================================
          Daily Attendance Report
      ========================================= */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Daily Attendance Report
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View all attendance records for a selected date.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date
            </label>

            <input
              type="date"
              value={dailyDate}
              onChange={(e) => {
                setDailyDate(e.target.value);
                setDailyAttendanceReport(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadDailyAttendanceReport}
              disabled={dailyLoading || !dailyDate}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {dailyLoading
                ? "Loading..."
                : "Generate Daily Report"}
            </button>
          </div>
        </div>

        {dailyAttendanceReport && (
          <div className="mt-8">
            <div className="grid gap-4 md:grid-cols-2">
              <SummaryCard
                title="Report Date"
                value={dailyAttendanceReport.date}
              />

              <SummaryCard
                title="Total Attendance"
                value={dailyAttendanceReport.totalAttendance.toString()}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
              <div className="border-b bg-gray-50 p-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance Records
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                    <tr>
                      <th className="px-6 py-4">
                        Student Code
                      </th>

                      <th className="px-6 py-4">
                        Student Name
                      </th>

                      <th className="px-6 py-4">
                        Class
                      </th>

                      <th className="px-6 py-4">
                        Check-In
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dailyAttendanceReport.attendances.length >
                    0 ? (
                      dailyAttendanceReport.attendances.map(
                        (record) => (
                          <tr
                            key={record.id}
                            className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {record.studentCode}
                            </td>

                            <td className="px-6 py-4">
                              {record.studentName}
                            </td>

                            <td className="px-6 py-4">
                              {record.className}
                            </td>

                            <td className="px-6 py-4">
                              {formatTime(
                                record.checkInTime
                              )}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-gray-500"
                        >
                          No attendance records found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          Class Summary Report
      ========================================= */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Class Summary Report
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View yearly summary for a selected class.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Class
            </label>

            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(
                  e.target.value
                );

                setClassSummary(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            >
              <option value="">
                Select Class
              </option>

              {classes.map((classItem) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                >
                  {classItem.name}
                  {classItem.subject
                    ? ` - ${classItem.subject}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Year
            </label>

            <input
              type="number"
              value={year}
              min="2000"
              max="2100"
              onChange={(e) => {
                setYear(e.target.value);
                setClassSummary(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadClassSummary}
              disabled={
                classLoading ||
                !selectedClassId
              }
              className="w-full rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {classLoading
                ? "Loading..."
                : "Generate Class Report"}
            </button>
          </div>
        </div>

        {classSummary && (
          <div className="mt-8">
            <div className="rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {classSummary.className}
              </h3>

              <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <p>
                  Subject:{" "}
                  <strong>
                    {classSummary.subject || "-"}
                  </strong>
                </p>

                <p>
                  Teacher:{" "}
                  <strong>
                    {classSummary.teacherName ||
                      "-"}
                  </strong>
                </p>

                <p>
                  Monthly Fee:{" "}
                  <strong>
                    {formatMoney(
                      classSummary.monthlyFee
                    )}
                  </strong>
                </p>

                <p>
                  Academic Year:{" "}
                  <strong>
                    {classSummary.year}
                  </strong>
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Students"
                value={classSummary.totalStudents.toString()}
              />

              <SummaryCard
                title="Attendance"
                value={classSummary.totalAttendance.toString()}
              />

              <SummaryCard
                title="Payments"
                value={classSummary.totalPayments.toString()}
              />

              <SummaryCard
                title="Collected"
                value={formatMoney(
                  classSummary.totalCollected
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          Student Full Report
      ========================================= */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Student Full Report
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View complete attendance and payment
          history for a selected student.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Student
            </label>

            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(
                  e.target.value
                );

                setStudentReport(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            >
              <option value="">
                Select Student
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.studentCode} -{" "}
                  {student.firstName}{" "}
                  {student.lastName ?? ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadStudentReport}
              disabled={
                studentLoading ||
                !selectedStudentId
              }
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {studentLoading
                ? "Loading..."
                : "Generate Student Report"}
            </button>
          </div>
        </div>

        {studentReport && (
          <div className="mt-8">
            {/* Student Information */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {
                      studentReport.student
                        .firstName
                    }{" "}
                    {studentReport.student
                      .lastName ?? ""}
                  </h3>

                  <p className="mt-1 font-medium text-blue-600">
                    {
                      studentReport.student
                        .studentCode
                    }
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
                    studentReport.student
                      .isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {studentReport.student
                    .isActive
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <p>
                  Phone:{" "}
                  <strong>
                    {studentReport.student
                      .phone || "-"}
                  </strong>
                </p>

                <p>
                  School:{" "}
                  <strong>
                    {studentReport.student
                      .school || "-"}
                  </strong>
                </p>

                <p>
                  Parent Name:{" "}
                  <strong>
                    {studentReport.student
                      .parentName || "-"}
                  </strong>
                </p>

                <p>
                  Parent Phone:{" "}
                  <strong>
                    {studentReport.student
                      .parentPhone || "-"}
                  </strong>
                </p>
              </div>
            </div>

            {/* Student Summary */}
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Total Attendance"
                value={studentReport.totalAttendance.toString()}
              />

              <SummaryCard
                title="Total Payments"
                value={studentReport.totalPayments.toString()}
              />

              <SummaryCard
                title="Total Paid"
                value={formatMoney(
                  studentReport.totalPaid
                )}
              />
            </div>

            {/* Student Attendance History */}
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
              <div className="border-b bg-gray-50 p-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance History
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                    <tr>
                      <th className="px-6 py-4">
                        Date
                      </th>

                      <th className="px-6 py-4">
                        Class
                      </th>

                      <th className="px-6 py-4">
                        Check-In
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentReport.attendances
                      .length > 0 ? (
                      studentReport.attendances.map(
                        (record) => (
                          <tr
                            key={record.id}
                            className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              {
                                record.attendanceDate
                              }
                            </td>

                            <td className="px-6 py-4">
                              {record.className}
                            </td>

                            <td className="px-6 py-4">
                              {formatTime(
                                record.checkInTime
                              )}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-10 text-center text-gray-500"
                        >
                          No attendance records
                          found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student Payment History */}
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
              <div className="border-b bg-gray-50 p-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment History
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
                    <tr>
                      <th className="px-6 py-4">
                        Month
                      </th>

                      <th className="px-6 py-4">
                        Class
                      </th>

                      <th className="px-6 py-4">
                        Amount
                      </th>

                      <th className="px-6 py-4">
                        Paid Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentReport.payments.length >
                    0 ? (
                      studentReport.payments.map(
                        (payment) => (
                          <tr
                            key={payment.id}
                            className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              {getMonthName(
                                payment.month
                              )}{" "}
                              {payment.year}
                            </td>

                            <td className="px-6 py-4">
                              {payment.className}
                            </td>

                            <td className="px-6 py-4">
                              {formatMoney(
                                payment.amount
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {formatDate(
                                payment.paidAt
                              )}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-gray-500"
                        >
                          No payment records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}