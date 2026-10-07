"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

type Student = {
  id: number;
  studentCode: string;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  phone: string | null;
  parentPhone: string | null;
  school: string | null;
  isActive: boolean;
};

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  isActive: boolean;
};

type Enrollment = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  academicYear: number;
  joinedDate: string;
  isActive: boolean;
};

type User = {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
};

export default function StudentsPage() {
  const currentYear = new Date().getFullYear();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // "all" = show every active student
  const [selectedClassId, setSelectedClassId] =
    useState<string>("all");

  const [academicYear, setAcademicYear] =
    useState<number>(currentYear);

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(true);

  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // =========================================
  // Check user role + load classes
  // =========================================
  useEffect(() => {
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

    const loadClasses = async () => {
      try {
        setError("");

        const response =
          await api.get<ClassItem[]>("/api/classes");

        setClasses(response.data);
      } catch (error) {
        console.error("Classes API Error:", error);
        setError("Failed to load classes.");
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // =========================================
  // Load Students
  // =========================================
  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        setError("");

        // =====================================
        // ALL STUDENTS
        // =====================================
        if (selectedClassId === "all") {
          const response =
            await api.get<Student[]>("/api/students");

          if (cancelled) return;

          setStudents(response.data);
          setEnrollments([]);

          return;
        }

        // =====================================
        // STUDENTS BY CLASS + YEAR
        // =====================================
        const [
          enrollmentResponse,
          studentResponse,
        ] = await Promise.all([
          api.get<Enrollment[]>(
            `/api/enrollments/class/${selectedClassId}/year/${academicYear}`
          ),

          api.get<Student[]>("/api/students"),
        ]);

        if (cancelled) return;

        const activeStudents = studentResponse.data;

        const activeStudentIds = new Set(
          activeStudents.map(
            (student) => student.id
          )
        );

        const classEnrollments =
          enrollmentResponse.data.filter(
            (enrollment) =>
              enrollment.isActive &&
              activeStudentIds.has(
                enrollment.studentId
              )
          );

        setStudents(activeStudents);
        setEnrollments(classEnrollments);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Students API Error:",
          error
        );

        setError("Failed to load students.");

        setStudents([]);
        setEnrollments([]);
      } finally {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      }
    };

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [selectedClassId, academicYear]);

  // =========================================
  // Student Map
  // =========================================
  const studentMap = new Map(
    students.map((student) => [
      student.id,
      student,
    ])
  );

  // =========================================
  // Selected Class
  // =========================================
  const selectedClass =
    selectedClassId === "all"
      ? null
      : classes.find(
          (classItem) =>
            classItem.id ===
            Number(selectedClassId)
        );

  // =========================================
  // Total
  // =========================================
  const totalStudents =
    selectedClassId === "all"
      ? students.length
      : enrollments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Students
          </h1>

          <p className="mt-2 text-gray-700">
            Manage students and view them by class
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <Link
              href="/dashboard/students/inactive"
              className="rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50"
            >
              Inactive Students
            </Link>
          )}

          <Link
            href="/dashboard/students/add"
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            + Add Student
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-gray-950">
          Student Filter
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Class */}
          <div>
            <label
              htmlFor="class"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Class
            </label>

            <select
              id="class"
              value={selectedClassId}
              onChange={(event) =>
                setSelectedClassId(
                  event.target.value
                )
              }
              disabled={loadingClasses}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            >
              <option value="all">
                All Students
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

          {/* Academic Year */}
          <div>
            <label
              htmlFor="academicYear"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Academic Year
            </label>

            <input
              id="academicYear"
              type="number"
              min={2000}
              max={2100}
              value={academicYear}
              disabled={
                selectedClassId === "all"
              }
              onChange={(event) =>
                setAcademicYear(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
            />

            {selectedClassId === "all" && (
              <p className="mt-2 text-xs text-gray-500">
                Academic Year is used when
                viewing students by class.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        {/* Table Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              {selectedClassId === "all"
                ? "All Active Students"
                : selectedClass
                  ? `${selectedClass.name} Students`
                  : "Student List"}
            </h2>

            <p className="mt-1 text-sm text-gray-700">
              {selectedClassId === "all"
                ? "All active registered students"
                : `Academic Year: ${academicYear}`}
            </p>
          </div>

          {!loadingStudents && (
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-900">
              Total Students: {totalStudents}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
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

                <th className="px-6 py-4 text-center text-sm font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {/* Loading */}
              {loadingStudents ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : selectedClassId === "all" ? (
                /* =================================
                   ALL STUDENTS
                   ================================= */
                students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center font-medium text-gray-700"
                    >
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map(
                    (student, index) => (
                      <StudentRow
                        key={student.id}
                        student={student}
                        index={index}
                      />
                    )
                  )
                )
              ) : enrollments.length === 0 ? (
                /* =================================
                   NO ENROLLMENTS
                   ================================= */
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center font-medium text-gray-700"
                  >
                    No students enrolled in
                    this class for{" "}
                    {academicYear}.
                  </td>
                </tr>
              ) : (
                /* =================================
                   CLASS STUDENTS
                   ================================= */
                enrollments.map(
                  (enrollment, index) => {
                    const student =
                      studentMap.get(
                        enrollment.studentId
                      );

                    if (!student) {
                      return null;
                    }

                    return (
                      <StudentRow
                        key={enrollment.id}
                        student={student}
                        index={index}
                      />
                    );
                  }
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
// Student Table Row
// =========================================
function StudentRow({
  student,
  index,
}: {
  student: Student;
  index: number;
}) {
  return (
    <tr
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

      <td className="px-6 py-4">
        <span className="font-semibold text-gray-950">
          {student.firstName}{" "}
          {student.lastName ?? ""}
        </span>
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

      <td className="px-6 py-4 text-center">
        <Link
          href={`/dashboard/students/${student.id}`}
          className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View
        </Link>
      </td>
    </tr>
  );
}