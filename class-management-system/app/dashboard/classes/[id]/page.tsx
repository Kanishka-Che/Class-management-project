"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  teacherName: string | null;
  monthlyFee?: number;
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

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [classItem, setClassItem] =
    useState<ClassItem | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [deactivating, setDeactivating] =
    useState(false);

  useEffect(() => {
    // =========================================
    // Check Logged-in User Role
    // =========================================
    const storedUser =
      sessionStorage.getItem("user");

    if (storedUser) {
      try {
        const user: User =
          JSON.parse(storedUser);

        setIsAdmin(
          user.role === "Admin"
        );
      } catch (error) {
        console.error(
          "Failed to read logged-in user:",
          error
        );
      }
    }

    // =========================================
    // Load Class Details
    // =========================================
    const loadClass = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/api/classes/${params.id}`
        );

        console.log(
          "Class Details:",
          response.data
        );

        setClassItem(response.data);
      } catch (error) {
        console.error(
          "Class Details Error:",
          error
        );

        setError(
          "Failed to load class details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadClass();
    }
  }, [params.id]);

  // =========================================
  // Deactivate Class
  // =========================================
  const handleDeactivate = async () => {
    if (!classItem) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to deactivate ${classItem.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeactivating(true);
      setError("");

      await api.delete(
        `/api/classes/${classItem.id}`
      );

      router.push(
        "/dashboard/classes"
      );
    } catch (error) {
      console.error(
        "Deactivate Class Error:",
        error
      );

      setError(
        "Failed to deactivate class."
      );
    } finally {
      setDeactivating(false);
    }
  };

  // =========================================
  // Loading
  // =========================================
  if (loading) {
    return (
      <p className="text-gray-600">
        Loading class...
      </p>
    );
  }

  // =========================================
  // Error
  // =========================================
  if (error || !classItem) {
    return (
      <p className="text-red-600">
        {error || "Class not found."}
      </p>
    );
  }

  // =========================================
  // Monthly Fee
  // =========================================
  const monthlyFee =
    typeof classItem.monthlyFee === "number"
      ? `LKR ${classItem.monthlyFee.toLocaleString()}`
      : "-";

  return (
    <div>
      {/* =========================================
          Header
      ========================================= */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Class Details
          </h1>

          <p className="mt-2 text-gray-600">
            {classItem.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Edit - Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/dashboard/classes/${classItem.id}/edit`
                )
              }
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
            >
              Edit Class
            </button>
          )}

          {/* Deactivate - Admin Only + Active Class */}
          {isAdmin &&
            classItem.isActive && (
              <button
                type="button"
                onClick={
                  handleDeactivate
                }
                disabled={
                  deactivating
                }
                className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deactivating
                  ? "Deactivating..."
                  : "Deactivate"}
              </button>
            )}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/classes"
              )
            }
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* =========================================
          Error Message
      ========================================= */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* =========================================
          Class Information
      ========================================= */}
      <div className="max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <Detail
            label="Class Name"
            value={classItem.name}
          />

          <Detail
            label="Subject"
            value={classItem.subject}
          />

          <Detail
            label="Teacher"
            value={classItem.teacherName}
          />

          <Detail
            label="Day"
            value={classItem.day}
          />

          <Detail
            label="Start Time"
            value={
              classItem.startTime
                ? classItem.startTime.substring(
                    0,
                    5
                  )
                : null
            }
          />

          <Detail
            label="Monthly Fee"
            value={monthlyFee}
          />

          <Detail
            label="Status"
            value={
              classItem.isActive
                ? "Active"
                : "Inactive"
            }
          />
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}