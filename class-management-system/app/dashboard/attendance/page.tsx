
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type SessionType = "Regular" | "Extra";

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
  sessionType: SessionType;
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

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  const [sessionType, setSessionType] =
    useState<SessionType>("Regular");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [academicYear, setAcademicYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedDate, setSelectedDate] = useState(getToday());

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [marking, setMarking] = useState(false);

  const [studentCode, setStudentCode] = useState("");
  const [searchedStudent, setSearchedStudent] =
    useState<Student | null>(null);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [markingCodeStudent, setMarkingCodeStudent] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
    setWarning("");
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const response = await api.get<ClassItem[]>("/api/classes");
        setClasses(response.data);
      } catch {
        setError("Failed to load classes.");
      } finally {
        setLoading(false);
      }
    };

    void loadClasses();
  }, []);

  const loadStudents = async (classId: string, year: string) => {
    if (!classId || !year) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);

      const response = await api.get<Enrollment[]>(
        `/api/enrollments/class/${classId}/year/${year}`
      );

      setStudents(response.data);
    } catch {
      setStudents([]);
      setError("Failed to load enrolled students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadAttendance = async (classId: string, date: string) => {
    if (!classId || !date) {
      setAttendances([]);
      return;
    }

    try {
      setLoadingAttendance(true);

      const response = await api.get<Attendance[]>(
        `/api/attendance/class/${classId}/date/${date}`
      );

      setAttendances(response.data);
    } catch {
      setAttendances([]);
      setError("Failed to load attendance records.");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSessionTypeChange = (type: SessionType) => {
    if (marking || markingCodeStudent || searchingStudent) return;

    setSessionType(type);
    setSelectedClassId("");
    setSelectedStudentId("");
    setStudentCode("");
    setSearchedStudent(null);
    setStudents([]);
    setAttendances([]);
    clearMessages();
  };

  const handleClassChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const classId = e.target.value;

    setSelectedClassId(classId);
    setSelectedStudentId("");
    setStudentCode("");
    setSearchedStudent(null);
    clearMessages();

    if (!classId) {
      setStudents([]);
      setAttendances([]);
      return;
    }

    await Promise.all([
      loadStudents(classId, academicYear),
      loadAttendance(classId, selectedDate),
    ]);
  };

  const handleAcademicYearChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const year = e.target.value;

    setAcademicYear(year);
    setSelectedStudentId("");
    setSearchedStudent(null);
    clearMessages();

    if (
      selectedClassId &&
      Number(year) >= 2000 &&
      Number(year) <= 2100
    ) {
      await loadStudents(selectedClassId, year);
    } else {
      setStudents([]);
    }
  };

  const handleDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const date = e.target.value;

    setSelectedDate(date);
    clearMessages();

    if (selectedClassId && date) {
      await loadAttendance(selectedClassId, date);
    } else {
      setAttendances([]);
    }
  };

  const handleAttendanceError = (err: unknown) => {
    const errorData = err as {
      response?: {
        status?: number;
        data?: string | { message?: string };
      };
    };

    const status = errorData.response?.status;
    const data = errorData.response?.data;

    const message =
      typeof data === "string"
        ? data
        : data?.message || "Failed to mark attendance.";

    if (
      status === 400 &&
      message.toLowerCase().includes("attendance already marked")
    ) {
      setWarning(
        "Attendance already marked for this student, class and date. " +
        "Regular and Extra cannot both be marked on the same day."
      );
    } else {
      setError(message);
    }
  };

  const handleMarkAttendance = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    clearMessages();

    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (selectedDate !== getToday()) {
      setError("Attendance can only be marked for today.");
      return;
    }

    try {
      setMarking(true);

      const response = await api.post("/api/attendance", {
        studentId: Number(selectedStudentId),
        classId: Number(selectedClassId),
        sessionType,
      });

      setSuccess(
        `${response.data.studentName} - ${sessionType} attendance marked successfully.`
      );

      setSelectedStudentId("");
    } catch (err: unknown) {
      handleAttendanceError(err);
    } finally {
      await loadAttendance(selectedClassId, selectedDate);
      setMarking(false);
    }
  };

  const handleStudentCodeSearch = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    clearMessages();
    setSearchedStudent(null);

    if (!selectedClassId) {
      setError("Please select a class first.");
      return;
    }

    const code = studentCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a student code.");
      return;
    }

    try {
      setSearchingStudent(true);

      const response = await api.get<Student>(
        `/api/students/code/${encodeURIComponent(code)}`
      );

      const student = response.data;

      const enrollment = students.find(
        (item) => item.studentId === student.id
      );

      if (!enrollment) {
        setWarning(
          `${student.studentCode} is not enrolled in this class for ${academicYear}.`
        );
        return;
      }

      setSearchedStudent(student);
    } catch (err: unknown) {
      const errorData = err as {
        response?: { status?: number };
      };

      if (errorData.response?.status === 404) {
        setError("Student not found.");
      } else {
        setError("Failed to search student.");
      }
    } finally {
      setSearchingStudent(false);
    }
  };

  const handleCodeStudentAttendance = async () => {
    if (!searchedStudent || !selectedClassId) return;

    clearMessages();

    if (selectedDate !== getToday()) {
      setError("Attendance can only be marked for today.");
      return;
    }

    try {
      setMarkingCodeStudent(true);

      const response = await api.post("/api/attendance", {
        studentId: searchedStudent.id,
        classId: Number(selectedClassId),
        sessionType,
      });

      setSuccess(
        `${response.data.studentName} - ${sessionType} attendance marked successfully.`
      );

      setStudentCode("");
      setSearchedStudent(null);
    } catch (err: unknown) {
      handleAttendanceError(err);
    } finally {
      await loadAttendance(selectedClassId, selectedDate);
      setMarkingCodeStudent(false);
    }
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "-";

    return new Date(dateTime).toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 " +
    "font-medium text-gray-950 outline-none focus:border-blue-600 " +
    "focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100";

  const regularCount = attendances.filter(
    (a) => a.sessionType !== "Extra"
  ).length;

  const extraCount = attendances.filter(
    (a) => a.sessionType === "Extra"
  ).length;

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
      {/* Header */}
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
          onClick={() => router.push("/dashboard/attendance/qr")}
          className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Scan QR
        </button>
      </div>

      {/* Session Type */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-950">
          Select Attendance Type
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {(["Regular", "Extra"] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={marking || markingCodeStudent || searchingStudent}
              onClick={() => handleSessionTypeChange(type)}
              className={`rounded-xl border-2 px-4 py-4 font-semibold transition disabled:opacity-50 ${
                sessionType === type
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {type} Class
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-gray-600">
          {sessionType === "Regular"
            ? "Regular attendance counts towards the monthly fee warning."
            : "Extra attendance does not increase the regular attendance count."}
        </p>

        <p className="mt-2 text-sm font-medium text-amber-700">
          Only one attendance is allowed per student, class and day.
        </p>
      </div>

      {/* Attendance Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Attendance Filters
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Select class, academic year and attendance date
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Class
            </label>

            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className={inputClass}
            >
              <option value="">Select Class</option>

              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.subject ? ` - ${item.subject}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Academic Year
            </label>

            <input
              type="number"
              min="2000"
              max="2100"
              value={academicYear}
              onChange={handleAcademicYearChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Attendance Date
            </label>

            <input
              type="date"
              value={selectedDate}
              max={getToday()}
              onChange={handleDateChange}
              className={inputClass}
            />
          </div>
        </div>

        {selectedClassId && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              Type: {sessionType}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Academic Year: {academicYear}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Date: {selectedDate}
            </span>

            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
              Enrolled Students: {students.length}
            </span>
          </div>
        )}
      </div>

      {/* Student Code Search */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Student Code Attendance
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Enter a student code to find the student and mark attendance
        </p>

        <form
          onSubmit={handleStudentCodeSearch}
          className="mt-5 flex flex-col gap-4 md:flex-row"
        >
          <input
            type="text"
            value={studentCode}
            onChange={(e) => {
              setStudentCode(e.target.value.toUpperCase());
              setSearchedStudent(null);
              clearMessages();
            }}
            placeholder="Example: STD-0003"
            disabled={!selectedClassId}
            className={`${inputClass} md:max-w-xl`}
          />

          <button
            type="submit"
            disabled={
              !selectedClassId ||
              !studentCode.trim() ||
              searchingStudent ||
              loadingStudents
            }
            className="min-w-[140px] rounded-lg bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:bg-gray-400"
          >
            {searchingStudent ? "Searching..." : "Search"}
          </button>
        </form>

        {searchedStudent && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                  Student Found
                </span>

                <h3 className="mt-3 text-lg font-bold text-gray-950">
                  {searchedStudent.studentCode}
                </h3>

                <p className="mt-1 font-medium text-gray-800">
                  {searchedStudent.firstName}{" "}
                  {searchedStudent.lastName ?? ""}
                </p>

                {searchedStudent.school && (
                  <p className="mt-1 text-sm text-gray-600">
                    School: {searchedStudent.school}
                  </p>
                )}

                <p className="mt-2 text-sm font-semibold text-blue-700">
                  Selected Type: {sessionType}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCodeStudentAttendance}
                disabled={
                  markingCodeStudent ||
                  marking ||
                  selectedDate !== getToday()
                }
                className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-gray-400"
              >
                {markingCodeStudent
                  ? "Marking..."
                  : `Mark ${sessionType}`}
              </button>
            </div>
          </div>
        )}

        {selectedDate !== getToday() && (
          <p className="mt-4 text-sm font-medium text-amber-700">
            Attendance can only be marked for today. Previous records
            can still be viewed.
          </p>
        )}
      </div>

      {/* Manual Attendance */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Manual Attendance
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Select an enrolled student to mark today&apos;s attendance
        </p>

        <form onSubmit={handleMarkAttendance} className="mt-5">
          <div className="flex flex-col gap-4 md:flex-row">
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                clearMessages();
              }}
              disabled={!selectedClassId || loadingStudents}
              className={`${inputClass} md:max-w-xl`}
            >
              <option value="">
                {loadingStudents
                  ? "Loading students..."
                  : "Select Student"}
              </option>

              {students.map((student) => (
                <option
                  key={student.studentId}
                  value={student.studentId}
                >
                  {student.studentCode} - {student.studentName}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={
                marking ||
                markingCodeStudent ||
                !selectedClassId ||
                !selectedStudentId ||
                selectedDate !== getToday()
              }
              className="min-w-[170px] rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              {marking ? "Marking..." : `Mark ${sessionType}`}
            </button>
          </div>
        </form>

        {selectedClassId &&
          !loadingStudents &&
          students.length === 0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                No students enrolled in this class for {academicYear}.
              </p>
            </div>
          )}
      </div>

      {/* Messages */}
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

      {/* Attendance List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Attendance List
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Attendance records for {selectedDate}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              Total Present: {attendances.length}
            </span>

            <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
              Regular: {regularCount}
            </span>

            <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
              Extra: {extraCount}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
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
                  Class Type
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
                    colSpan={6}
                    className="px-6 py-12 text-center font-medium text-gray-500"
                  >
                    Loading attendance...
                  </td>
                </tr>
              ) : attendances.length > 0 ? (
                attendances.map((attendance, index) => (
                  <tr
                    key={attendance.id}
                    className={`border-t border-gray-100 hover:bg-blue-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                        {attendance.studentCode}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-950">
                      {attendance.studentName}
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {attendance.className}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          attendance.sessionType === "Extra"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {attendance.sessionType ?? "Regular"}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-700">
                      {formatTime(attendance.checkInTime)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-bold text-green-700">
                        Present
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
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
                          No students have been marked present for{" "}
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
