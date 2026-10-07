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

type Attendance = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  attendanceDate: string;
  checkInTime: string;
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

export default function AttendancePage() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================
  // Data
  // =========================================
  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [students, setStudents] =
    useState<Enrollment[]>([]);

  const [attendances, setAttendances] =
    useState<Attendance[]>([]);

  // =========================================
  // Filters
  // =========================================
  const [
    selectedClassId,
    setSelectedClassId,
  ] = useState("");

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState("");

  const [
    academicYear,
    setAcademicYear,
  ] = useState(
    currentYear.toString()
  );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getToday());

  // =========================================
  // Loading
  // =========================================
  const [loading, setLoading] =
    useState(true);

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [
    loadingAttendance,
    setLoadingAttendance,
  ] = useState(false);

  const [marking, setMarking] =
    useState(false);

  // =========================================
  // Messages
  // =========================================
  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [warning, setWarning] =
    useState("");

  // =========================================
  // Student Code Search
  // =========================================
  const [
    studentCode,
    setStudentCode,
  ] = useState("");

  const [
    searchedStudent,
    setSearchedStudent,
  ] = useState<Student | null>(null);

  const [
    searchingStudent,
    setSearchingStudent,
  ] = useState(false);

  const [
    markingCodeStudent,
    setMarkingCodeStudent,
  ] = useState(false);

  // =========================================
  // Clear Messages
  // =========================================
  const clearMessages = () => {
    setError("");
    setSuccess("");
    setWarning("");
  };

  // =========================================
  // Load Classes
  // =========================================
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            "/api/classes"
          );

        setClasses(response.data);
      } catch {
        setError(
          "Failed to load classes."
        );
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  // =========================================
  // Load Enrolled Students
  // =========================================
  const loadStudents = async (
    classId: string,
    year: string
  ) => {
    if (!classId || !year) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);

      const response =
        await api.get(
          `/api/enrollments/class/${classId}/year/${year}`
        );

      setStudents(response.data);
    } catch {
      setStudents([]);

      setError(
        "Failed to load enrolled students."
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  // =========================================
  // Load Attendance
  // =========================================
  const loadAttendance = async (
    classId: string,
    date: string
  ) => {
    if (!classId || !date) {
      setAttendances([]);
      return;
    }

    try {
      setLoadingAttendance(true);

      const response =
        await api.get(
          `/api/attendance/class/${classId}/date/${date}`
        );

      setAttendances(response.data);
    } catch {
      setAttendances([]);

      setError(
        "Failed to load attendance records."
      );
    } finally {
      setLoadingAttendance(false);
    }
  };

  // =========================================
  // Class Change
  // =========================================
  const handleClassChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const classId =
      e.target.value;

    setSelectedClassId(classId);
    setSelectedStudentId("");
    setSearchedStudent(null);

    clearMessages();

    if (!classId) {
      setStudents([]);
      setAttendances([]);
      return;
    }

    await Promise.all([
      loadStudents(
        classId,
        academicYear
      ),

      loadAttendance(
        classId,
        selectedDate
      ),
    ]);
  };

  // =========================================
  // Academic Year Change
  // =========================================
  const handleAcademicYearChange =
    async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const year =
        e.target.value;

      setAcademicYear(year);
      setSelectedStudentId("");
      setSearchedStudent(null);

      clearMessages();

      if (
        selectedClassId &&
        Number(year) >= 2000 &&
        Number(year) <= 2100
      ) {
        await loadStudents(
          selectedClassId,
          year
        );
      } else {
        setStudents([]);
      }
    };

  // =========================================
  // Attendance Date Change
  // =========================================
  const handleDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const date =
      e.target.value;

    setSelectedDate(date);

    clearMessages();

    if (
      selectedClassId &&
      date
    ) {
      await loadAttendance(
        selectedClassId,
        date
      );
    } else {
      setAttendances([]);
    }
  };

  // =========================================
  // Mark Attendance - Dropdown
  // =========================================
  const handleMarkAttendance =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      clearMessages();

      if (!selectedClassId) {
        setError(
          "Please select a class."
        );
        return;
      }

      if (!selectedStudentId) {
        setError(
          "Please select a student."
        );
        return;
      }

      try {
        setMarking(true);

        const response =
          await api.post(
            "/api/attendance",
            {
              studentId: Number(
                selectedStudentId
              ),

              classId: Number(
                selectedClassId
              ),
            }
          );

        setSuccess(
          `Attendance marked successfully for ${response.data.studentName}.`
        );

        setSelectedStudentId(
          ""
        );

        await loadAttendance(
          selectedClassId,
          selectedDate
        );
      } catch (error: any) {
        handleAttendanceError(
          error
        );

        await loadAttendance(
          selectedClassId,
          selectedDate
        );
      } finally {
        setMarking(false);
      }
    };

  // =========================================
  // Search Student By Student Code
  // =========================================
  const handleStudentCodeSearch =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      clearMessages();
      setSearchedStudent(null);

      if (!selectedClassId) {
        setError(
          "Please select a class first."
        );
        return;
      }

      const code =
        studentCode
          .trim()
          .toUpperCase();

      if (!code) {
        setError(
          "Please enter a student code."
        );
        return;
      }

      try {
        setSearchingStudent(true);

        const response =
          await api.get(
            `/api/students/code/${encodeURIComponent(
              code
            )}`
          );

        const student: Student =
          response.data;

        const enrollment =
          students.find(
            (item) =>
              item.studentId ===
              student.id
          );

        if (!enrollment) {
          setWarning(
            `${student.studentCode} is not enrolled in the selected class for ${academicYear}.`
          );

          setSearchedStudent(
            null
          );

          return;
        }

        setSearchedStudent(
          student
        );
      } catch (error: any) {
        const status =
          error.response?.status;

        if (status === 404) {
          setError(
            "Student not found."
          );
        } else {
          setError(
            "Failed to search student."
          );
        }
      } finally {
        setSearchingStudent(
          false
        );
      }
    };

  // =========================================
  // Mark Attendance - Student Code
  // =========================================
  const handleCodeStudentAttendance =
    async () => {
      if (!searchedStudent) {
        return;
      }

      clearMessages();

      if (!selectedClassId) {
        setError(
          "Please select a class."
        );
        return;
      }

      try {
        setMarkingCodeStudent(
          true
        );

        const response =
          await api.post(
            "/api/attendance",
            {
              studentId:
                searchedStudent.id,

              classId: Number(
                selectedClassId
              ),
            }
          );

        setSuccess(
          `Attendance marked successfully for ${response.data.studentName}.`
        );

        setStudentCode("");
        setSearchedStudent(null);

        await loadAttendance(
          selectedClassId,
          selectedDate
        );
      } catch (error: any) {
        handleAttendanceError(
          error
        );

        await loadAttendance(
          selectedClassId,
          selectedDate
        );
      } finally {
        setMarkingCodeStudent(
          false
        );
      }
    };

  // =========================================
  // Attendance Error Handler
  // =========================================
  const handleAttendanceError = (
    error: any
  ) => {
    const status =
      error.response?.status;

    const responseData =
      error.response?.data;

    const message =
      typeof responseData ===
      "string"
        ? responseData
        : responseData?.message ||
          "Failed to mark attendance.";

    if (
      status === 400 &&
      message
        .toLowerCase()
        .includes(
          "attendance already marked"
        )
    ) {
      setWarning(
        "Attendance has already been marked for this student today."
      );
    } else {
      setError(message);
    }
  };

  // =========================================
  // Format Check-In Time
  // =========================================
  const formatTime = (
    dateTime: string
  ) => {
    if (!dateTime) {
      return "-";
    }

    return new Date(
      dateTime
    ).toLocaleTimeString(
      "en-LK",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =========================================
  // Loading Page
  // =========================================
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="font-medium text-gray-600">
          Loading attendance...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =====================================
          Header
          ===================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Attendance
          </h1>

          <p className="mt-2 text-gray-600">
            Mark and manage daily student attendance
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard/attendance/qr"
            )
          }
          className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          Scan QR
        </button>
      </div>

      {/* =====================================
          Attendance Filters
          ===================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-950">
            Attendance Filters
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select class, academic year and attendance date
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Class
            </label>

            <select
              value={
                selectedClassId
              }
              onChange={
                handleClassChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                Select Class
              </option>

              {classes.map(
                (classItem) => (
                  <option
                    key={
                      classItem.id
                    }
                    value={
                      classItem.id
                    }
                  >
                    {
                      classItem.name
                    }

                    {classItem.subject
                      ? ` - ${classItem.subject}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Academic Year
            </label>

            <input
              type="number"
              min="2000"
              max="2100"
              value={
                academicYear
              }
              onChange={
                handleAcademicYearChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Attendance Date
            </label>

            <input
              type="date"
              value={
                selectedDate
              }
              max={getToday()}
              onChange={
                handleDateChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Filter Summary */}
        {selectedClassId && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              Academic Year:{" "}
              {academicYear}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Date:{" "}
              {selectedDate}
            </span>

            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
              Enrolled Students:{" "}
              {students.length}
            </span>
          </div>
        )}
      </div>

      {/* =====================================
          Student Code Attendance
          ===================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Student Code Attendance
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Enter the student code to find the student and mark attendance
          </p>
        </div>

        <form
          onSubmit={
            handleStudentCodeSearch
          }
          className="mt-5 flex flex-col gap-4 md:flex-row"
        >
          <input
            type="text"
            value={
              studentCode
            }
            onChange={(e) => {
              setStudentCode(
                e.target.value.toUpperCase()
              );

              setSearchedStudent(
                null
              );

              clearMessages();
            }}
            placeholder="Example: STD-0003"
            disabled={
              !selectedClassId
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 md:max-w-xl"
          />

          <button
            type="submit"
            disabled={
              !selectedClassId ||
              !studentCode.trim() ||
              searchingStudent
            }
            className="min-w-[140px] rounded-lg bg-slate-800 px-6 py-3 font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {searchingStudent
              ? "Searching..."
              : "Search"}
          </button>
        </form>

        {/* Found Student */}
        {searchedStudent && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                  Student Found
                </span>

                <h3 className="mt-3 text-lg font-bold text-gray-950">
                  {
                    searchedStudent.studentCode
                  }
                </h3>

                <p className="mt-1 font-medium text-gray-800">
                  {
                    searchedStudent.firstName
                  }{" "}
                  {
                    searchedStudent.lastName ??
                    ""
                  }
                </p>

                {searchedStudent.school && (
                  <p className="mt-1 text-sm text-gray-600">
                    School:{" "}
                    {
                      searchedStudent.school
                    }
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={
                  handleCodeStudentAttendance
                }
                disabled={
                  markingCodeStudent ||
                  selectedDate !==
                    getToday()
                }
                className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {markingCodeStudent
                  ? "Marking..."
                  : "Mark Present"}
              </button>
            </div>
          </div>
        )}

        {selectedDate !==
          getToday() && (
          <p className="mt-4 text-sm font-medium text-amber-700">
            Attendance can only be
            marked for today. You can
            still view previous attendance
            records.
          </p>
        )}
      </div>

      {/* =====================================
          Manual Attendance
          ===================================== */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Manual Attendance
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select an enrolled student to mark today&apos;s attendance
          </p>
        </div>

        <form
          onSubmit={
            handleMarkAttendance
          }
          className="mt-5"
        >
          <div className="flex flex-col gap-4 md:flex-row">
            <select
              value={
                selectedStudentId
              }
              onChange={(e) => {
                setSelectedStudentId(
                  e.target.value
                );

                clearMessages();
              }}
              disabled={
                !selectedClassId ||
                loadingStudents
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 md:max-w-xl"
            >
              <option value="">
                {loadingStudents
                  ? "Loading students..."
                  : "Select Student"}
              </option>

              {students.map(
                (student) => (
                  <option
                    key={
                      student.studentId
                    }
                    value={
                      student.studentId
                    }
                  >
                    {
                      student.studentCode
                    }{" "}
                    -{" "}
                    {
                      student.studentName
                    }
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              disabled={
                marking ||
                !selectedClassId ||
                !selectedStudentId ||
                selectedDate !==
                  getToday()
              }
              className="min-w-[170px] rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {marking
                ? "Marking..."
                : "Mark Present"}
            </button>
          </div>
        </form>

        {selectedClassId &&
          !loadingStudents &&
          students.length ===
            0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                No students enrolled
                in this class for{" "}
                {academicYear}.
              </p>
            </div>
          )}
      </div>

      {/* =====================================
          Messages
          ===================================== */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-medium text-green-700">
          ✓ {success}
        </div>
      )}

      {warning && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 font-medium text-yellow-800">
          ⚠ {warning}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =====================================
          Attendance List
          ===================================== */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Attendance List
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Attendance records for{" "}
              {selectedDate}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              Total Present:{" "}
              {attendances.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold">
                  Student Code
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Student Name
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Class
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Check-In Time
                </th>

                <th className="px-6 py-4 text-sm font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingAttendance ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center font-medium text-gray-500"
                  >
                    Loading attendance...
                  </td>
                </tr>
              ) : attendances.length >
                0 ? (
                attendances.map(
                  (
                    attendance,
                    index
                  ) => (
                    <tr
                      key={
                        attendance.id
                      }
                      className={`border-t border-gray-100 transition hover:bg-blue-50 ${
                        index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                          {
                            attendance.studentCode
                          }
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-gray-950">
                        {
                          attendance.studentName
                        }
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        {
                          attendance.className
                        }
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatTime(
                          attendance.checkInTime
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700">
                          Present
                        </span>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center"
                  >
                    <div className="mx-auto max-w-md">
                      <p className="font-semibold text-gray-700">
                        {selectedClassId
                          ? "No attendance records found."
                          : "Select a class to view attendance."}
                      </p>

                      {selectedClassId && (
                        <p className="mt-1 text-sm text-gray-500">
                          No students
                          have been marked
                          present for{" "}
                          {selectedDate}.
                        </p>
                      )}
                    </div>
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