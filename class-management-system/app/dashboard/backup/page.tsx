"use client";

import { useState } from "react";
import api from "@/lib/api";

type BackupResponse = {
  message: string;
  fileName: string;
};

export default function BackupPage() {
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

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
    } catch (err: any) {
      console.error("Backup API Error:", err);

      const responseData = err.response?.data;

      const message =
        typeof responseData === "string"
          ? responseData
          : responseData?.message ||
            "Failed to create database backup.";

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

      {/* Automatic Backup */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Automatic Backup
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The database is automatically backed up every day.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700">
            Enabled
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              Backup Time
            </p>

            <p className="mt-1 font-bold text-slate-900">
              Every day at 11:00 PM
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              Backup Retention
            </p>

            <p className="mt-1 font-bold text-slate-900">
              30 Days
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