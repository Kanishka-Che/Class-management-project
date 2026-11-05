
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import api from "@/lib/api";

type FeeRecord = {
  id: number;
  classId: number;
  effectiveYear: number;
  effectiveMonth: number;
  amount: number;
};

type ClassItem = {
  id: number;
  name: string;
  monthlyFee: number;
};

const months = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export default function ClassFeesPage() {
  const params = useParams();
  const classId = Number(params.id);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [history, setHistory] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [year, setYear] = useState(
    new Date().getFullYear()
  );
  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const isPastMonth = (year: number, month: number) => {
  const now = new Date();

  const currentYear = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
    }).format(now)
  );

  const currentMonth = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      month: "numeric",
    }).format(now)
  );

  return (
    year < currentYear ||
    (year === currentYear && month < currentMonth)
  );
};

  const [amount, setAmount] = useState("");

  const loadData = async () => {
    try {
      setError("");

      const [classResponse, historyResponse] =
        await Promise.all([
          api.get(`/api/classes/${classId}`),
          api.get(`/api/class-monthly-fees/${classId}`),
        ]);

      setClassItem(classResponse.data);
      setHistory(historyResponse.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load class fee information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isInteger(classId) || classId <= 0) {
      setError("Invalid class ID.");
      setLoading(false);
      return;
    }

    loadData();
  }, [classId]);

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();


    const fee = Number(amount);

    if (
      amount.trim() === "" ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      setError("Enter a valid monthly fee.");
      return;
    }

    if (year < 2000 || year > 2100) {
      setError("Enter a year between 2000 and 2100.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/api/class-monthly-fees", {
        classId,
        effectiveYear: year,
        effectiveMonth: month,
        amount: fee,
      });

      setSuccess("Monthly fee saved successfully.");
      setAmount("");
      await loadData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data;

        setError(
          typeof message === "string"
            ? message
            : message?.title ||
              message?.message ||
              "Failed to save monthly fee."
        );
      } else {
        setError("Failed to save monthly fee.");
      }
    } finally {
      setSaving(false);
    }
  };

  
  const handleDelete = async (feeId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this fee change?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/api/class-monthly-fees/${feeId}`);

      await loadData();

      setSuccess("Fee change deleted successfully.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data;

        setError(
          typeof message === "string"
            ? message
            : message?.title ||
              message?.message ||
              "Failed to delete fee change."
        );
      } else {
        setError("Failed to delete fee change.");
      }
    }
  };


  if (loading) {
    return (
      <div className="p-6 text-gray-800">
        Loading fee information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/classes"
          className="text-sm font-semibold text-blue-700"
        >
          ← Back to Classes
        </Link>

        <h1 className="mt-3 text-3xl font-bold text-gray-950">
          Manage Monthly Fee
        </h1>

        <p className="mt-2 text-gray-700">
          {classItem?.name || `Class #${classId}`}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {success}
        </div>
      )}

      {classItem && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">
            Current Stored Monthly Fee
          </p>
          <p className="mt-1 text-2xl font-bold text-green-800">
            LKR {classItem.monthlyFee.toLocaleString("en-LK")}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Add Fee Change
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Select the month from which the new fee applies.
        </p>

        <form
          onSubmit={handleSave}
          className="mt-5 grid gap-4 md:grid-cols-3"
        >
          <div>
            <label className="mb-2 block font-semibold text-gray-800">
              Effective Year
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-950"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-800">
              Effective Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-950"
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-800">
              New Monthly Fee (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-950"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving || isPastMonth(year, month)}
              className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Fee Change"}
            </button>
            {isPastMonth(year, month) && (
  <p className="mt-2 text-sm font-semibold text-red-700">
    Fees for past months cannot be changed.
  </p>
)}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-xl font-bold text-gray-950">
            Fee History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white">
             <tr>
  <th className="px-5 py-3">Effective From</th>
  <th className="px-5 py-3">Monthly Fee</th>
  <th className="px-5 py-3 text-center">Actions</th>
</tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {history.map((record) => (
                <tr key={record.id}>
                  <td className="px-5 py-4 text-gray-900">
                    {months[record.effectiveMonth - 1]}{" "}
                    {record.effectiveYear}
                  </td>

                  <td className="px-5 py-4 font-bold text-green-800">
                    LKR{" "}
                    {record.amount.toLocaleString("en-LK", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  <td className="px-5 py-4 text-center">
  
<button
  type="button"
  onClick={() => handleDelete(record.id)}
  disabled={
    isPastMonth(record.effectiveYear, record.effectiveMonth) ||
    record.id === history[0]?.id
  }
  title={
    record.id === history[0]?.id
      ? "The initial fee cannot be deleted."
      : isPastMonth(record.effectiveYear, record.effectiveMonth)
      ? "Past month fees cannot be deleted."
      : "Delete this fee change"
  }
  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400"
>
  Delete
</button>

</td>
                </tr>
              ))}

              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-gray-600"
                  >
                    No fee history found for this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
