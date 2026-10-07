
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

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

type User = {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check logged-in user role
    const storedUser = sessionStorage.getItem("user");

    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        setIsAdmin(user.role === "Admin");
      } catch (error) {
        console.error(
          "Failed to read logged-in user:",
          error
        );
      }
    }

    // Load active classes
    const loadClasses = async () => {
      try {
        setError("");

        const response = await api.get("/api/classes");
        setClasses(response.data);
      } catch (error) {
        console.error("Classes API Error:", error);
        setError("Failed to load classes.");
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 font-medium text-gray-800 shadow-sm">
        Loading classes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 font-medium text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Classes
          </h1>

          <p className="mt-2 text-gray-700">
            Manage classes and class information
          </p>

          <p className="mt-2 text-sm font-semibold text-blue-700">
            Total Active Classes: {classes.length}
          </p>
        </div>

        {/* Admin-only buttons */}
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/classes/inactive"
              className="rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50"
            >
              Inactive Classes
            </Link>

            <Link
              href="/dashboard/classes/add"
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              + Add Class
            </Link>
          </div>
        )}
      </div>

      {/* Classes Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-950">
            Class List
          </h2>

          <p className="mt-1 text-sm text-gray-700">
            All active registered classes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
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
                  Day
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Start Time
                </th>

                <th className="px-6 py-4 text-sm font-bold">
                  Monthly Fee
                </th>

                <th className="px-6 py-4 text-center text-sm font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {classes.map((classItem, index) => (
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

                  <td className="px-6 py-4 font-medium text-gray-800">
                    {classItem.day || "-"}
                  </td>

                  <td className="px-6 py-4 font-medium text-gray-900">
                    {classItem.startTime
                      ? classItem.startTime.substring(0, 5)
                      : "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-green-800">
                      LKR{" "}
                      {classItem.monthlyFee.toLocaleString(
                        "en-LK",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/dashboard/classes/${classItem.id}`}
                      className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {classes.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    No classes found.
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