"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
};

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

type AttendanceRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  attendanceDate: string;
  checkInTime: string;
};

type PaymentRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  year: number;
  month: number;
  amount: number;
  paidAt: string;
};

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [enrollment, setEnrollment] =
    useState<Enrollment | null>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [academicYear, setAcademicYear] = useState(
    currentYear.toString()
  );

  const [qrImage, setQrImage] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [error, setError] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [success, setSuccess] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  // =========================================
  // Load Enrollment
  // =========================================
const [attendanceHistory, setAttendanceHistory] = useState<
  AttendanceRecord[]
>([]);

const [attendanceLoading, setAttendanceLoading] =
  useState(false);

const [attendanceError, setAttendanceError] =
  useState("");


  const [paymentHistory, setPaymentHistory] = useState<
  PaymentRecord[]
>([]);

const [paymentLoading, setPaymentLoading] =
  useState(false);

const [paymentError, setPaymentError] =
  useState("");

  const loadEnrollment = async (
    studentId: string | number,
    year: string | number
  ) => {
    try {
      const response = await api.get(
        `/api/enrollments/student/${studentId}/year/${year}`
      );

      setEnrollment(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setEnrollment(null);
      } else {
        console.error("Enrollment Error:", error);
      }
    }
  };

  // =========================================
  // Load QR Code
  // =========================================
  const loadQrCode = async (
    studentId: string | number
  ) => {
    try {
      setQrLoading(true);
      setQrError("");

      const response = await api.get(
        `/api/qr/student/${studentId}`
      );

      const data = response.data;

      // Supports an endpoint that returns either:
      // "data:image/png;base64,..."
      // or { qrCode: "data:image/png;base64,..." }
      // or { qrImage: "data:image/png;base64,..." }
     if (typeof data === "string") {
  setQrImage(data);
} else if (data?.qrImageBase64) {
  setQrImage(data.qrImageBase64);
} else {
  setQrError("QR code could not be loaded.");
}
    } catch (error) {
      console.error("QR Code Error:", error);
      setQrImage("");
      setQrError("Failed to load QR code.");
    } finally {
      setQrLoading(false);
    }
  };

  // =========================================
// Load Attendance History
// =========================================
const loadAttendanceHistory = async (
  studentId: string | number
) => {
  try {
    setAttendanceLoading(true);
    setAttendanceError("");

    const response = await api.get(
      `/api/attendance/student/${studentId}`
    );

    setAttendanceHistory(response.data);
  } catch (error) {
    console.error(
      "Attendance History Error:",
      error
    );

    setAttendanceHistory([]);
    setAttendanceError(
      "Failed to load attendance history."
    );
  } finally {
    setAttendanceLoading(false);
  }
};


// =========================================
// Load Payment History
// =========================================
const loadPaymentHistory = async (
  studentId: string | number
) => {
  try {
    setPaymentLoading(true);
    setPaymentError("");

    const response = await api.get(
      `/api/payments/student/${studentId}`
    );

    setPaymentHistory(response.data);
  } catch (error) {
    console.error(
      "Payment History Error:",
      error
    );

    setPaymentHistory([]);

    setPaymentError(
      "Failed to load payment history."
    );
  } finally {
    setPaymentLoading(false);
  }
};

  // =========================================
  // Load Page
  // =========================================
  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        const storedUser = sessionStorage.getItem("user");

        if (storedUser) {
          const user = JSON.parse(storedUser);
          setIsAdmin(user.role === "Admin");
        }

        const [studentResponse, classesResponse] =
          await Promise.all([
            api.get(`/api/students/${params.id}`),
            api.get("/api/classes"),
          ]);

        setStudent(studentResponse.data);
        setClasses(classesResponse.data);

       await Promise.all([
  loadEnrollment(
    params.id as string,
    currentYear
  ),

  loadQrCode(
    params.id as string
  ),

  loadAttendanceHistory(
    params.id as string
  ),

  loadPaymentHistory(
    params.id as string
  ),
]);
      } catch (error) {
        console.error("Student Details Error:", error);

        setError(
          "Failed to load student details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [params.id, currentYear]);

  // =========================================
  // Academic Year Change
  // =========================================
  const handleYearChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const year = e.target.value;

    setAcademicYear(year);
    setEnrollmentError("");
    setSuccess("");

    if (
      year &&
      Number(year) >= 2000 &&
      Number(year) <= 2100
    ) {
      await loadEnrollment(
        params.id as string,
        year
      );
    } else {
      setEnrollment(null);
    }
  };

  // =========================================
  // Enroll Student
  // =========================================
  const handleEnroll = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!student) return;

    if (!selectedClassId) {
      setEnrollmentError(
        "Please select a class."
      );
      return;
    }

    const year = Number(academicYear);

    if (year < 2000 || year > 2100) {
      setEnrollmentError(
        "Please enter a valid academic year."
      );
      return;
    }

    try {
      setEnrolling(true);
      setEnrollmentError("");
      setSuccess("");

      await api.post("/api/enrollments", {
        studentId: student.id,
        classId: Number(selectedClassId),
        academicYear: year,
      });

      await loadEnrollment(
        student.id,
        year
      );

      setSelectedClassId("");

      setSuccess(
        "Student enrolled successfully."
      );
    } catch (error: any) {
      console.error(
        "Create Enrollment Error:",
        error
      );

      const message =
        typeof error.response?.data === "string"
          ? error.response.data
          : "Failed to enroll student.";

      setEnrollmentError(message);
    } finally {
      setEnrolling(false);
    }
  };

  // =========================================
  // Deactivate Student
  // =========================================
  const handleDeactivate = async () => {
    if (!student) return;

    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${student.firstName}?`
    );

    if (!confirmed) return;

    try {
      setDeactivating(true);
      setError("");

      await api.delete(
        `/api/students/${student.id}`
      );

      router.push("/dashboard/students");
    } catch (error) {
      console.error(
        "Deactivate Student Error:",
        error
      );

      setError(
        "Failed to deactivate student."
      );
    } finally {
      setDeactivating(false);
    }
  };

  // =========================================
  // Print QR Card
  // =========================================
  const handlePrintQr = () => {
    if (!student || !qrImage) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=500,height=700"
    );

    if (!printWindow) {
      setQrError(
        "Please allow pop-ups to print the QR card."
      );
      return;
    }

    const studentName = `${student.firstName} ${
      student.lastName ?? ""
    }`.trim();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.studentCode} - QR Card</title>

          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              background: #ffffff;
            }

            .card {
              width: 320px;
              margin: 0 auto;
              border: 2px solid #111827;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-sizing: border-box;
            }

            h2 {
              margin: 0 0 8px;
              font-size: 22px;
            }

            .code {
              margin: 0 0 18px;
              color: #4b5563;
              font-size: 15px;
            }

            img {
              width: 220px;
              height: 220px;
              object-fit: contain;
            }

            .name {
              margin-top: 18px;
              font-size: 18px;
              font-weight: bold;
            }

            .student-code {
              margin-top: 6px;
              font-size: 16px;
              color: #374151;
            }

            @media print {
              body {
                padding: 0;
              }

              .card {
                margin-top: 20px;
              }
            }
          </style>
        </head>

        <body>
          <div class="card">
            <h2>Student QR Card</h2>

            <p class="code">
              Scan for attendance
            </p>

            <img
              src="${qrImage}"
              alt="Student QR Code"
            />

            <div class="name">
              ${studentName}
            </div>

            <div class="student-code">
              ${student.studentCode}
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <p className="text-gray-600">
        Loading student...
      </p>
    );
  }

  if (error || !student) {
    return (
      <p className="text-red-600">
        {error || "Student not found."}
      </p>
    );
  }

  const studentFullName =
    `${student.firstName} ${
      student.lastName ?? ""
    }`.trim();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Student Details
          </h1>

          <p className="mt-2 text-gray-600">
            {student.studentCode}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              router.push(
                `/dashboard/students/${student.id}/edit`
              )
            }
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Edit Student
          </button>

          {isAdmin && (
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deactivating
                ? "Deactivating..."
                : "Deactivate"}
            </button>
          )}

          <button
            onClick={() =>
              router.push(
                "/dashboard/students"
              )
            }
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Student Information */}
      <div className="max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          Student Information
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Detail
            label="Student Code"
            value={student.studentCode}
          />

          <Detail
            label="Full Name"
            value={studentFullName}
          />

          <Detail
            label="Date of Birth"
            value={student.dateOfBirth}
          />

          <Detail
            label="Gender"
            value={student.gender}
          />

          <Detail
            label="Student Phone"
            value={student.phone}
          />

          <Detail
            label="Parent Name"
            value={student.parentName}
          />

          <Detail
            label="Parent Phone"
            value={student.parentPhone}
          />

          <Detail
            label="School"
            value={student.school}
          />

          <div className="md:col-span-2">
            <Detail
              label="Address"
              value={student.address}
            />
          </div>
        </div>
      </div>

      {/* QR Card */}
      <div className="mt-6 max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Student QR Card
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Use this QR code for student attendance.
            </p>
          </div>

          {qrImage && (
            <button
              type="button"
              onClick={handlePrintQr}
              className="rounded-lg bg-gray-900 px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Print QR Card
            </button>
          )}
        </div>

        <div className="mt-6">
          {qrLoading ? (
            <div className="flex h-64 max-w-sm items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-gray-500">
                Loading QR code...
              </p>
            </div>
          ) : qrError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
              {qrError}
            </div>
          ) : qrImage ? (
            <div className="max-w-sm rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-lg font-semibold text-gray-900">
                {studentFullName}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {student.studentCode}
              </p>

              <img
                src={qrImage}
                alt={`QR code for ${student.studentCode}`}
                className="mx-auto mt-5 h-56 w-56 object-contain"
              />

              <p className="mt-4 text-xs text-gray-500">
                Scan this code to mark attendance.
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              QR code is not available.
            </p>
          )}
        </div>
      </div>

      {/* Enrollment */}
      <div className="mt-6 max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Class Enrollment
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          View or assign the student&apos;s class for an academic year.
        </p>

        {/* Academic Year */}
        <div className="mt-6 max-w-xs">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Academic Year
          </label>

          <input
            type="number"
            min="2000"
            max="2100"
            value={academicYear}
            onChange={handleYearChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          />
        </div>

        {/* Current Enrollment */}
        {enrollment ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-medium text-green-700">
              Enrolled
            </p>

            <p className="mt-2 text-xl font-semibold text-gray-900">
              {enrollment.className}
            </p>

            <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
              <p>
                Academic Year:{" "}
                <strong>
                  {enrollment.academicYear}
                </strong>
              </p>

              <p>
                Student Code:{" "}
                <strong>
                  {enrollment.studentCode}
                </strong>
              </p>
            </div>
          </div>
        ) : (
          <>
            {isAdmin ? (
              <form
                onSubmit={handleEnroll}
                className="mt-6"
              >
                <div className="max-w-md">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select Class
                  </label>

                  <select
                    value={selectedClassId}
                    onChange={(e) =>
                      setSelectedClassId(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  >
                    <option value="">
                      Select a class
                    </option>

                    {classes.map(
                      (classItem) => (
                        <option
                          key={classItem.id}
                          value={classItem.id}
                        >
                          {classItem.name}
                          {classItem.subject
                            ? ` - ${classItem.subject}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {enrollmentError && (
                  <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {enrollmentError}
                  </div>
                )}

                {success && (
                  <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enrolling}
                  className="mt-5 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {enrolling
                    ? "Enrolling..."
                    : "Enroll Student"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-gray-600">
                No enrollment found for{" "}
                {academicYear}.
              </div>
            )}
          </>
        )}

        {enrollment && success && (
          <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}
      </div>
{/* Attendance History */}
<div className="mt-6 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm">
  <div className="border-b p-6">
    <h2 className="text-xl font-semibold text-gray-900">
      Attendance History
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      View this student&apos;s previous attendance records.
    </p>
  </div>

  {attendanceError && (
    <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
      {attendanceError}
    </div>
  )}

  <div className="overflow-x-auto">
    <table className="w-full min-w-[650px] text-left text-sm text-gray-700">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-4">
            Date
          </th>

          <th className="px-6 py-4">
            Class
          </th>

          <th className="px-6 py-4">
            Check-In Time
          </th>

          <th className="px-6 py-4">
            Status
          </th>
        </tr>
      </thead>

      <tbody>
        {attendanceLoading ? (
          <tr>
            <td
              colSpan={4}
              className="px-6 py-10 text-center text-gray-500"
            >
              Loading attendance history...
            </td>
          </tr>
        ) : attendanceHistory.length > 0 ? (
          attendanceHistory.map(
            (record) => (
              <tr
                key={record.id}
                className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
              >
                <td className="px-6 py-4">
                  {record.attendanceDate}
                </td>

                <td className="px-6 py-4">
                  {record.className}
                </td>

                <td className="px-6 py-4">
                  {new Date(
                    record.checkInTime
                  ).toLocaleTimeString(
                    "en-LK",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    Present
                  </span>
                </td>
              </tr>
            )
          )
        ) : (
          <tr>
            <td
              colSpan={4}
              className="px-6 py-10 text-center text-gray-500"
            >
              No attendance records found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Payment History */}
<div className="mt-6 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm">
  <div className="border-b p-6">
    <h2 className="text-xl font-semibold text-gray-900">
      Payment History
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      View this student&apos;s previous class fee payments.
    </p>
  </div>

  {paymentError && (
    <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
      {paymentError}
    </div>
  )}

  <div className="overflow-x-auto">
    <table className="w-full min-w-[650px] text-left text-sm text-gray-700">
      <thead className="bg-gray-50 text-sm font-semibold text-gray-700">
        <tr>
          <th className="px-6 py-4">
            Month
          </th>

          <th className="px-6 py-4">
            Class
          </th>

          <th className="px-6 py-4">
            Amount
          </th>

          <th className="px-6 py-4">
            Paid Date
          </th>

          <th className="px-6 py-4">
            Status
          </th>
        </tr>
      </thead>

      <tbody>
        {paymentLoading ? (
          <tr>
            <td
              colSpan={5}
              className="px-6 py-10 text-center text-gray-500"
            >
              Loading payment history...
            </td>
          </tr>
        ) : paymentHistory.length > 0 ? (
          paymentHistory.map((payment) => (
            <tr
              key={payment.id}
              className="border-t border-gray-100 text-gray-700 hover:bg-gray-50"
            >
              <td className="px-6 py-4 font-medium text-gray-900">
                {new Date(
                  payment.year,
                  payment.month - 1
                ).toLocaleString("en-LK", {
                  month: "long",
                  year: "numeric",
                })}
              </td>

              <td className="px-6 py-4">
                {payment.className}
              </td>

              <td className="px-6 py-4">
                LKR{" "}
                {Number(
                  payment.amount
                ).toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>

              <td className="px-6 py-4">
                {new Date(
                  payment.paidAt
                ).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </td>

              <td className="px-6 py-4">
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Paid
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={5}
              className="px-6 py-10 text-center text-gray-500"
            >
              No payment records found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
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
  value: string | null;
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