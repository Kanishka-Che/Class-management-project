
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Student = {
  id: number;
  studentCode: string;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  parentName: string | null;
  parentPhone: string | null;
  address: string | null;
  school: string | null;
  qrToken: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function InactiveStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivatingId, setReactivatingId] =
    useState<number | null>(null);
  const [deletingId, setDeletingId] =
  useState<number | null>(null);  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load Inactive Students
  const loadInactiveStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/students/inactive"
      );

      setStudents(response.data);
    } catch (error: any) {
      console.error(
        "Load Inactive Students Error:",
        error
      );

      if (error.response?.status === 403) {
        setError(
          "Only Admin users can view inactive students."
        );
      } else {
        setError(
          "Failed to load inactive students."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInactiveStudents();
  }, []);

  // Reactivate Student
  const handleReactivate = async (
    student: Student
  ) => {
    const studentName = `${student.firstName} ${
      student.lastName ?? ""
    }`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to reactivate ${studentName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setReactivatingId(student.id);
      setError("");
      setSuccess("");

      await api.patch(
        `/api/students/${student.id}/activate`
      );

      setSuccess(
        `${studentName} reactivated successfully.`
      );

      setStudents((currentStudents) =>
        currentStudents.filter(
          (item) => item.id !== student.id
        )
      );
    } catch (error: any) {
      console.error(
        "Reactivate Student Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            "Failed to reactivate student.";

      setError(message);
    } finally {
      setReactivatingId(null);
    }
  };

  // Permanently Delete Student
const handlePermanentDelete = async (
  student: Student
) => {
  const studentName = `${student.firstName} ${
    student.lastName ?? ""
  }`.trim();

  const confirmed = window.confirm(
    `WARNING!\n\nAre you sure you want to permanently delete "${studentName}" (${student.studentCode})?\n\nThis will permanently delete the student and all related enrollments, attendance records, and payments.\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingId(student.id);
    setError("");
    setSuccess("");

    await api.delete(
      `/api/students/${student.id}/permanent`
    );

    setSuccess(
      `${studentName} permanently deleted successfully.`
    );

    setStudents((currentStudents) =>
      currentStudents.filter(
        (item) => item.id !== student.id
      )
    );
  } catch (error: any) {
    console.error(
      "Permanent Delete Student Error:",
      error
    );

    const message =
      typeof error.response?.data === "string"
        ? error.response.data
        : error.response?.data?.message ||
          "Failed to permanently delete student.";

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
            Inactive Students
          </h1>

          <p className="mt-2 text-gray-700">
            View and reactivate inactive students
          </p>

          <p className="mt-2 text-sm font-semibold text-red-700">
            Total Inactive Students: {students.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard/students")
          }
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
        >
          Back to Students
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 font-medium text-green-800">
          ✓ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Inactive Students Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-950">
            Inactive Student List
          </h2>

          <p className="mt-1 text-sm text-gray-700">
            Students who have been deactivated
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">
                  Student Code
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Name
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Gender
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Phone
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Parent Phone
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  School
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
                    Loading inactive students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    No inactive students found.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => {
                  const studentName =
                    `${student.firstName} ${
                      student.lastName ?? ""
                    }`.trim();

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors hover:bg-blue-50 ${
                        index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-900">
                          {student.studentCode}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-gray-950">
                        {studentName}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-800">
                        {student.gender || "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {student.phone || "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {student.parentPhone || "-"}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-800">
                        {student.school || "-"}
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
        reactivatingId === student.id ||
        deletingId === student.id
      }
      onClick={() =>
        handleReactivate(student)
      }
      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {reactivatingId === student.id
        ? "Reactivating..."
        : "Reactivate"}
    </button>

    <button
      type="button"
      disabled={
        deletingId === student.id ||
        reactivatingId === student.id
      }
      onClick={() =>
        handlePermanentDelete(student)
      }
      className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {deletingId === student.id
        ? "Deleting..."
        : "Permanent Delete"}
    </button>
  </div>
</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}