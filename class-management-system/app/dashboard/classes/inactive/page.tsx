
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function InactiveClassesPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivatingId, setReactivatingId] =
    useState<number | null>(null);

  const [deletingId, setDeletingId] =
  useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load Inactive Classes
  const loadInactiveClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/classes/inactive"
      );

      setClasses(response.data);
    } catch (error: any) {
      console.error(
        "Load Inactive Classes Error:",
        error
      );

      if (error.response?.status === 403) {
        setError(
          "Only Admin users can view inactive classes."
        );
      } else {
        setError(
          "Failed to load inactive classes."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInactiveClasses();
  }, []);

  // Reactivate Class
  const handleReactivate = async (
    classItem: ClassItem
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to reactivate ${classItem.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setReactivatingId(classItem.id);
      setError("");
      setSuccess("");

      await api.patch(
        `/api/classes/${classItem.id}/activate`
      );

      setSuccess(
        `${classItem.name} reactivated successfully.`
      );

      setClasses((currentClasses) =>
        currentClasses.filter(
          (item) => item.id !== classItem.id
        )
      );
    } catch (error: any) {
      console.error(
        "Reactivate Class Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to reactivate class.";

      setError(message);
    } finally {
      setReactivatingId(null);
    }
  };

  // Permanently Delete Class
const handlePermanentDelete = async (
  classItem: ClassItem
) => {
  const confirmed = window.confirm(
    `WARNING!\n\nAre you sure you want to permanently delete "${classItem.name}"?\n\nThis will permanently delete the class and all related enrollments, attendance records, and payments.\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingId(classItem.id);
    setError("");
    setSuccess("");

    await api.delete(
      `/api/classes/${classItem.id}/permanent`
    );

    setSuccess(
      `${classItem.name} permanently deleted successfully.`
    );

    setClasses((currentClasses) =>
      currentClasses.filter(
        (item) => item.id !== classItem.id
      )
    );
  } catch (error: any) {
    console.error(
      "Permanent Delete Class Error:",
      error
    );

    const message =
      typeof error.response?.data === "string"
        ? error.response.data
        : error.response?.data?.message ||
          "Failed to permanently delete class.";

    setError(message);
  } finally {
    setDeletingId(null);
  }
};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Inactive Classes
          </h1>

          <p className="mt-2 text-gray-700">
            View and reactivate inactive classes
          </p>

          <p className="mt-2 text-sm font-semibold text-red-700">
            Total Inactive Classes: {classes.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard/classes")
          }
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          Back to Classes
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 font-medium text-green-800">
          ✓ {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Inactive Classes Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-950">
            Inactive Class List
          </h2>

          <p className="mt-1 text-sm text-gray-700">
            Classes that have been deactivated
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">
                  Class
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Subject
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Teacher
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Monthly Fee
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Day
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Start Time
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Status
                </th>

                <th className="px-6 py-4 text-center text-sm font-bold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    Loading inactive classes...
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    No inactive classes found.
                  </td>
                </tr>
              ) : (
                classes.map((classItem, index) => (
                  <tr
                    key={classItem.id}
                    className={`transition-colors hover:bg-blue-50 ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-900">
                        {classItem.name}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-950">
                      {classItem.subject || "-"}
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-900">
                      {classItem.teacherName || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-green-800">
                        LKR{" "}
                        {Number(
                          classItem.monthlyFee
                        ).toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-800">
                      {classItem.day || "-"}
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-900">
                      {classItem.startTime
                        ? classItem.startTime.substring(0, 5)
                        : "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                        Inactive
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
  <div className="flex items-center justify-center gap-2">
    <button
      type="button"
      disabled={
        reactivatingId === classItem.id ||
        deletingId === classItem.id
      }
      onClick={() =>
        handleReactivate(classItem)
      }
      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {reactivatingId === classItem.id
        ? "Reactivating..."
        : "Reactivate"}
    </button>

    <button
      type="button"
      disabled={
        deletingId === classItem.id ||
        reactivatingId === classItem.id
      }
      onClick={() =>
        handlePermanentDelete(classItem)
      }
      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {deletingId === classItem.id
        ? "Deleting..."
        : "Permanent Delete"}
    </button>
  </div>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}