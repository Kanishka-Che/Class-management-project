"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";

type BackupResponse = {
  message: string;
  fileName: string;
};

type BackupReportEntry = {
  fileName: string;
  createdAtUtc: string;
  sizeBytes: number;
  status: string;
  retentionDaysRemaining: number;
};

type BackupReport = {
  generatedAtUtc: string;
  retentionDays: number;
  backups: BackupReportEntry[];
};

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  isActive: boolean;
};

type AttendanceRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  attendanceDate: string;
  checkInTime: string;
  daysAttended?: number;
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

type MonthlyReports = {
  year: number;
  month: number;
  attendance: {
    totalStudents?: number;
    totalAttendance: number;
    attendances: AttendanceRecord[];
  };
  payments: {
    totalStudents?: number;
    totalPayments: number;
    totalCollected: number;
    payments: PaymentRecord[];
  };
};

export default function BackupPage() {
  const today = new Date();
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [backupReport, setBackupReport] = useState<BackupReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [year, setYear] = useState(today.getFullYear().toString());
  const [month, setMonth] = useState((today.getMonth() + 1).toString());
  const [classId, setClassId] = useState("");
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReports | null>(
    null,
  );
  const [loadingMonthlyReports, setLoadingMonthlyReports] = useState(false);

  useEffect(() => {
    let active = true;

    api.get<BackupReport>("/api/backup/report")
      .then((response) => {
        if (active) {
          setBackupReport(response.data);
        }
      })
      .catch((err: unknown) => {
        console.error("Load Backup Report Error:", err);
        if (active) {
          setError("Failed to load the backup report.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingReport(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    api.get<ClassItem[]>("/api/classes")
      .then((response) => {
        if (active) {
          setClasses(response.data);
        }
      })
      .catch((classesError: unknown) => {
        console.error("Load Classes for Backup Report Error:", classesError);
        if (active) {
          setError("Failed to load classes for the monthly report.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const formatFileSize = (sizeBytes: number) => {
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatAttendanceDate = (date: string) =>
    new Date(date).toLocaleDateString("en-LK", {
      month: "short",
      day: "2-digit",
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatMoney = (amount: number) =>
    `LKR ${Number(amount).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const loadMonthlyReports = async () => {
    const reportYear = Number(year);
    const reportMonth = Number(month);

    if (
      !Number.isInteger(reportYear) ||
      reportYear < 2000 ||
      reportYear > 2100 ||
      !Number.isInteger(reportMonth) ||
      reportMonth < 1 ||
      reportMonth > 12
    ) {
      setError("Choose a valid year and month for the monthly report.");
      return;
    }

    setLoadingMonthlyReports(true);
    setError("");

    const classQuery = classId ? `&classId=${Number(classId)}` : "";
    try {
      const [attendanceResponse, paymentResponse] = await Promise.all([
        api.get<MonthlyReports["attendance"]>(
          `/api/reports/attendance/monthly?year=${reportYear}&month=${reportMonth}${classQuery}`,
        ),
        api.get<MonthlyReports["payments"]>(
          `/api/reports/payments/monthly?year=${reportYear}&month=${reportMonth}${classQuery}`,
        ),
      ]);

      setMonthlyReports({
        year: reportYear,
        month: reportMonth,
        attendance: attendanceResponse.data,
        payments: paymentResponse.data,
      });
    } catch (reportError) {
      console.error("Load Monthly Backup Report Error:", reportError);
      setMonthlyReports(null);
      setError("Failed to load monthly attendance and payment report data.");
    } finally {
      setLoadingMonthlyReports(false);
    }
  };

  const monthlyAttendanceRows = (() => {
    if (!monthlyReports) {
      return [];
    }

    const groups = new Map<string, AttendanceRecord[]>();
    monthlyReports.attendance.attendances.forEach((record) => {
      const key = `${record.studentId}-${record.classId}`;
      const group = groups.get(key) ?? [];
      group.push(record);
      groups.set(key, group);
    });

    return Array.from(groups.entries()).map(([key, records]) => {
      const sorted = [...records].sort((a, b) =>
        a.attendanceDate.localeCompare(b.attendanceDate),
      );
      return {
        key,
        record: sorted[0],
        dates: sorted.map((record) => record.attendanceDate),
        times: sorted.map((record) => record.checkInTime),
        daysPresent: new Set(
          sorted.map((record) => record.attendanceDate),
        ).size,
      };
    });
  })();

  const monthlyStudentCount =
    monthlyReports?.attendance.totalStudents ??
    monthlyReports?.payments.totalStudents ??
    0;

  const handleBackup = async () => {
    if (creating) return;

    setCreating(true);
    setSuccess("");
    setFileName("");
    setError("");

    try {
      const response =
        await api.post<BackupResponse>("/api/backup");

      setSuccess(
        response.data.message ||
          "Database backup created successfully."
      );

      setFileName(response.data.fileName || "");
      try {
        const reportResponse = await api.get<BackupReport>(
          "/api/backup/report",
        );
        setBackupReport(reportResponse.data);
      } catch (reportError) {
        console.error("Refresh Backup Report Error:", reportError);
        setError("Backup succeeded, but the report could not be refreshed.");
      }
    } catch (err: unknown) {
      console.error("Backup API Error:", err);

      const responseData = axios.isAxiosError(err)
        ? err.response?.data
        : undefined;

      const message =
        typeof responseData === "string"
          ? responseData
          : typeof responseData === "object" &&
              responseData !== null &&
              "message" in responseData &&
              typeof responseData.message === "string"
            ? responseData.message
            : "Failed to create database backup.";

      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Database Backup
        </h1>

        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Manage and create backups of the class management
          database.
        </p>
      </div>

      <div className="backup-screen rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Backup Report
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Save backup details and the selected month&apos;s summary,
              attendance, and payment reports as a PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loadingReport || !backupReport || !monthlyReports}
            className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save Report as PDF
          </button>
        </div>
        {loadingReport ? (
          <p className="mt-4 text-sm text-slate-500">Loading backup report...</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-600">
              {backupReport?.backups.length ?? 0} backup file(s) found.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm text-slate-700">
                <thead className="bg-slate-50 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Backup File</th>
                    <th className="px-4 py-3">Created (UTC)</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {backupReport?.backups.length ? (
                    backupReport.backups.map((backup) => (
                      <tr
                        key={backup.fileName}
                        className="border-t border-slate-100"
                      >
                        <td className="break-all px-4 py-3 font-medium">
                          {backup.fileName}
                        </td>
                        <td className="px-4 py-3">
                          {formatDateTime(backup.createdAtUtc)}
                        </td>
                        <td className="px-4 py-3">
                          {formatFileSize(backup.sizeBytes)}
                        </td>
                        <td className="px-4 py-3">{backup.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No backup files found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-slate-900">
            Monthly Reports to Include
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Year
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setMonthlyReports(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Month
              <select
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setMonthlyReports(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {new Date(Date.UTC(2020, index, 1)).toLocaleDateString(
                      "en",
                      { month: "long", timeZone: "UTC" },
                    )}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Class
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setMonthlyReports(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.filter((item) => item.isActive).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={loadMonthlyReports}
              disabled={loadingMonthlyReports}
              className="self-end rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loadingMonthlyReports ? "Loading..." : "Load Monthly Data"}
            </button>
          </div>
          {monthlyReports && (
            <p className="mt-3 text-sm text-green-700">
              {new Date(
                Date.UTC(monthlyReports.year, monthlyReports.month - 1, 1),
              ).toLocaleDateString("en", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}{" "}
              report data loaded. It will be included in the PDF.
            </p>
          )}
        </div>
      </div>

      {backupReport && (
        <section className="backup-report-print">
          <h1>Class Management Database Backup Report</h1>
          <p>Generated: {formatDateTime(backupReport.generatedAtUtc)} (UTC)</p>
          <p>Retention period: {backupReport.retentionDays} days</p>
          <table>
            <thead>
              <tr>
                <th>Backup file</th>
                <th>Created (UTC)</th>
                <th>Size</th>
                <th>Status</th>
                <th>Days remaining</th>
              </tr>
            </thead>
            <tbody>
              {backupReport.backups.length > 0 ? (
                backupReport.backups.map((backup) => (
                  <tr key={backup.fileName}>
                    <td>{backup.fileName}</td>
                    <td>{formatDateTime(backup.createdAtUtc)}</td>
                    <td>{formatFileSize(backup.sizeBytes)}</td>
                    <td>{backup.status}</td>
                    <td>{backup.retentionDaysRemaining}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No backup files found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {monthlyReports && (
            <>
              <h2>Monthly Reports</h2>
              <p>
                Period:{" "}
                {new Date(
                  Date.UTC(monthlyReports.year, monthlyReports.month - 1, 1),
                ).toLocaleDateString("en", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
              <h3>Monthly Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>Total Students</th>
                    <th>Total Attendance</th>
                    <th>Total Payments</th>
                    <th>Total Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{monthlyStudentCount}</td>
                    <td>{monthlyReports.attendance.totalAttendance}</td>
                    <td>{monthlyReports.payments.totalPayments}</td>
                    <td>{formatMoney(monthlyReports.payments.totalCollected)}</td>
                  </tr>
                </tbody>
              </table>
              <h3>Monthly Attendance Report</h3>
              <table>
                <thead>
                  <tr>
                    <th>Student Code</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Date Marked</th>
                    <th>Days Present</th>
                    <th>Time Marked</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyAttendanceRows.length ? (
                    monthlyAttendanceRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.record.studentCode}</td>
                        <td>{row.record.studentName}</td>
                        <td>{row.record.className}</td>
                        <td>{row.dates.map(formatAttendanceDate).join(", ")}</td>
                        <td>{row.daysPresent}</td>
                        <td>{row.times.map(formatTime).join(", ")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No attendance records for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <h3>Monthly Payment Report</h3>
              <table>
                <thead>
                  <tr>
                    <th>Student Code</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReports.payments.payments.length ? (
                    monthlyReports.payments.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.studentCode}</td>
                        <td>{payment.studentName}</td>
                        <td>{payment.className}</td>
                        <td>
                          {new Date(
                            Date.UTC(payment.year, payment.month - 1, 1),
                          ).toLocaleDateString("en", {
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>{formatDateTime(payment.paidAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No payment records for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          <style jsx global>{`
            .backup-report-print {
              display: none;
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .backup-report-print,
              .backup-report-print * {
                visibility: visible !important;
              }
              .backup-report-print {
                display: block !important;
                position: absolute;
                inset: 0;
                padding: 24px;
                color: #111827;
                background: #fff;
                font-family: Arial, sans-serif;
              }
              .backup-report-print h1 {
                margin-bottom: 12px;
                font-size: 22px;
                font-weight: 700;
              }
              .backup-report-print h2 {
                margin-top: 24px;
                font-size: 18px;
                font-weight: 700;
              }
              .backup-report-print h3 {
                margin-top: 18px;
                font-size: 15px;
                font-weight: 700;
              }
              .backup-report-print p {
                margin: 4px 0;
              }
              .backup-report-print table {
                width: 100%;
                margin-top: 20px;
                border-collapse: collapse;
                font-size: 12px;
              }
              .backup-report-print th,
              .backup-report-print td {
                border: 1px solid #9ca3af;
                padding: 8px;
                text-align: left;
              }
              .backup-report-print th {
                background: #f3f4f6 !important;
                print-color-adjust: exact;
              }
            }
          `}</style>
        </section>
      )}

      {/* Automatic Backup */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Automatic Backup
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The database is automatically backed up once a week.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700">
            Enabled
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              Backup Schedule
            </p>

            <p className="mt-1 font-bold text-slate-900">
              Every Sunday at 11:00 PM (Sri Lanka time)
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              Backup Retention
            </p>

            <p className="mt-1 font-bold text-slate-900">
              90 Days
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            The backend application must be running at the
            scheduled time for the automatic backup to run.
          </p>
        </div>
      </div>

      {/* Manual Backup */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Manual Backup
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Create an additional database backup before system
          updates or whenever a manual backup is required.
        </p>

        <button
          type="button"
          onClick={handleBackup}
          disabled={creating}
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {creating ? "Creating Backup..." : "Backup Now"}
        </button>

        {success && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              ✓ {success}
            </p>

            {fileName && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Backup File
                </p>

                <p className="mt-1 break-all text-sm font-medium text-slate-900">
                  {fileName}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Information */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <h2 className="font-bold text-blue-900">
          Backup Information
        </h2>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          Backups contain the PostgreSQL database data used by
          the Class Management System. Keep backup files in a
          secure location and create a manual backup before
          important system or database updates.
        </p>
      </div>
    </div>
  );
}