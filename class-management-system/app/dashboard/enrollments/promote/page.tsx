"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  teacherName: string | null;
  isActive: boolean;
};

export default function PromoteStudentsPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  // Form States
  const [fromClassId, setFromClassId] = useState("");
  const [fromYear, setFromYear] = useState(currentYear.toString());
  const [toClassId, setToClassId] = useState("");
  const [toYear, setToYear] = useState((currentYear + 1).toString());

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load Classes on Mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/classes");
        setClasses(response.data);
      } catch {
        setErrorMessage("Failed to load classes.");
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  // Handle Promote Submit
  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!fromClassId || !toClassId || !fromYear || !toYear) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (!window.confirm("Are you sure you want to promote/enroll these students to the target class and year in bulk?")) {
      return;
    }

    try {
      setPromoting(true);
      const response = await api.post("/api/enrollments/promote", {
        fromClassId: Number(fromClassId),
        fromAcademicYear: Number(fromYear),
        toClassId: Number(toClassId),
        toAcademicYear: Number(toYear),
      });

      setSuccessMessage(response.data.message || "Students promoted successfully!");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to promote students.";
      setErrorMessage(typeof msg === "string" ? msg : "Failed to promote students.");
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="font-medium text-gray-600">Loading promote panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Promote Students</h1>
          <p className="mt-1 text-sm text-gray-600">
            Transfer or enroll students from a previous class and academic year to a new year in bulk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {/* Promote Form Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handlePromote} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* FROM CLASS */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                From Class (Source)
              </label>
              <select
                value={fromClassId}
                onChange={(e) => setFromClassId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Source Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.subject ? `- ${c.subject}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* FROM YEAR */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                From Academic Year
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={fromYear}
                onChange={(e) => setFromYear(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* TO CLASS */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                To Class (Target)
              </label>
              <select
                value={toClassId}
                onChange={(e) => setToClassId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Target Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.subject ? `- ${c.subject}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* TO YEAR */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                To Academic Year
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={toYear}
                onChange={(e) => setToYear(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-medium text-green-700">
              ✓ {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={promoting}
              className="w-full rounded-lg bg-blue-700 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:bg-gray-400 sm:w-auto"
            >
              {promoting ? "Promoting Students..." : "Promote / Enroll Students"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}