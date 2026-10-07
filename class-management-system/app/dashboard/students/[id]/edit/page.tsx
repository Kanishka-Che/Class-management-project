"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

type ClassItem = {
  id: number;
  name: string;
  subject: string | null;
  teacherName: string | null;
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

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  // =========================================
  // Student Form
  // =========================================
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    parentName: "",
    parentPhone: "",
    address: "",
    school: "",
  });

  // =========================================
  // Enrollment
  // =========================================
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [academicYear, setAcademicYear] = useState(
    currentYear.toString()
  );

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [enrollment, setEnrollment] =
    useState<Enrollment | null>(null);

  const [loadingEnrollment, setLoadingEnrollment] =
    useState(false);

  // =========================================
  // User
  // =========================================
  const [isAdmin, setIsAdmin] = useState(false);

  // =========================================
  // General State
  // =========================================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // Load Enrollment
  // =========================================
  const loadEnrollment = async (
    studentId: string | number,
    year: string | number
  ) => {
    try {
      setLoadingEnrollment(true);

      const response = await api.get<Enrollment>(
        `/api/enrollments/student/${studentId}/year/${year}`
      );

      const enrollmentData = response.data;

      setEnrollment(enrollmentData);

      setSelectedClassId(
        enrollmentData.classId.toString()
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        setEnrollment(null);
        setSelectedClassId("");
      } else {
        console.error(
          "Load Enrollment Error:",
          error
        );

        setEnrollment(null);
        setSelectedClassId("");
      }
    } finally {
      setLoadingEnrollment(false);
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

        // -------------------------------------
        // Logged-in User
        // -------------------------------------
        const storedUser =
          sessionStorage.getItem("user");

        if (storedUser) {
          try {
            const user: User =
              JSON.parse(storedUser);

            setIsAdmin(user.role === "Admin");
          } catch (error) {
            console.error(
              "Failed to read user:",
              error
            );
          }
        }

        // -------------------------------------
        // Student + Classes
        // -------------------------------------
        const [
          studentResponse,
          classesResponse,
        ] = await Promise.all([
          api.get(
            `/api/students/${params.id}`
          ),

          api.get<ClassItem[]>(
            "/api/classes"
          ),
        ]);

        const student =
          studentResponse.data;

        // -------------------------------------
        // Set Student Form
        // -------------------------------------
        setForm({
          firstName:
            student.firstName ?? "",

          lastName:
            student.lastName ?? "",

          dateOfBirth:
            student.dateOfBirth ?? "",

          gender:
            student.gender ?? "",

          phone:
            student.phone ?? "",

          parentName:
            student.parentName ?? "",

          parentPhone:
            student.parentPhone ?? "",

          address:
            student.address ?? "",

          school:
            student.school ?? "",
        });

        setClasses(classesResponse.data);

        // -------------------------------------
        // Load Current Year Enrollment
        // -------------------------------------
        await loadEnrollment(
          params.id as string,
          currentYear
        );
      } catch (error) {
        console.error(
          "Load Student Error:",
          error
        );

        setError(
          "Failed to load student."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [params.id, currentYear]);

  // =========================================
  // Student Form Change
  // =========================================
  const handleChange = (
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  // =========================================
  // Academic Year Change
  // =========================================
  const handleYearChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const year = e.target.value;

    setAcademicYear(year);
    setError("");

    const numericYear = Number(year);

    if (
      year &&
      Number.isInteger(numericYear) &&
      numericYear >= 2000 &&
      numericYear <= 2100
    ) {
      await loadEnrollment(
        params.id as string,
        year
      );
    } else {
      setEnrollment(null);
      setSelectedClassId("");
    }
  };

  // =========================================
  // Update Student
  // =========================================
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    // -----------------------------------------
    // Validate Student
    // -----------------------------------------
    if (!form.firstName.trim()) {
      setError(
        "First name is required."
      );

      return;
    }

    // -----------------------------------------
    // Validate Academic Year
    // -----------------------------------------
    const year =
      Number(academicYear);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      setError(
        "Please enter a valid academic year."
      );

      return;
    }

    // -----------------------------------------
    // Admin must select a class
    // -----------------------------------------
    if (
      isAdmin &&
      !selectedClassId
    ) {
      setError(
        `Please select a class for ${academicYear}.`
      );

      return;
    }

    try {
      setSaving(true);

      // =====================================
      // 1. Update Student Information
      // =====================================
      await api.put(
        `/api/students/${params.id}`,
        {
          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim() ||
            null,

          dateOfBirth:
            form.dateOfBirth ||
            null,

          gender:
            form.gender ||
            null,

          phone:
            form.phone.trim() ||
            null,

          parentName:
            form.parentName.trim() ||
            null,

          parentPhone:
            form.parentPhone.trim() ||
            null,

          address:
            form.address.trim() ||
            null,

          school:
            form.school.trim() ||
            null,
        }
      );

      // =====================================
      // 2. Enrollment - Admin Only
      // =====================================
      if (
        isAdmin &&
        selectedClassId
      ) {
        // -----------------------------------
        // Existing Enrollment
        // -----------------------------------
        if (enrollment) {
          const classChanged =
            Number(selectedClassId) !==
            enrollment.classId;

          if (classChanged) {
            await api.put(
              `/api/enrollments/student/${params.id}/year/${year}`,
              {
                studentId:
                  Number(params.id),

                classId:
                  Number(
                    selectedClassId
                  ),

                academicYear:
                  year,
              }
            );
          }
        }

        // -----------------------------------
        // No Enrollment
        // Create New Enrollment
        // -----------------------------------
        else {
          await api.post(
            "/api/enrollments",
            {
              studentId:
                Number(params.id),

              classId:
                Number(
                  selectedClassId
                ),

              academicYear:
                year,
            }
          );
        }
      }

      // =====================================
      // Success
      // =====================================
      router.push(
        `/dashboard/students/${params.id}`
      );
    } catch (error: any) {
      console.error(
        "Update Student Error:",
        error
      );

      const message =
        error.response?.data;

      if (typeof message === "string") {
        setError(message);
      } else {
        setError(
          "Failed to update student. Please check the details."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // Loading
  // =========================================
  if (loading) {
    return (
      <p className="text-gray-600">
        Loading student...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* =====================================
          Header
          ===================================== */}
      <div>
        <h1 className="text-3xl font-bold text-gray-950">
          Edit Student
        </h1>

        <p className="mt-2 text-gray-700">
          Update student information and class enrollment
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        {/* ===================================
            Error
            =================================== */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ===================================
            Student Information
            =================================== */}
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Student Information
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Update the student's personal information
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Input
            label="First Name *"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />

          <Input
            label="Last Name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
          />

          <Input
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
          />

          {/* Gender */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Gender
            </label>

            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>
            </select>
          </div>

          <Input
            label="Student Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="07XXXXXXXX"
          />

          <Input
            label="Parent Name"
            name="parentName"
            value={form.parentName}
            onChange={handleChange}
          />

          <Input
            label="Parent Phone"
            name="parentPhone"
            value={form.parentPhone}
            onChange={handleChange}
            placeholder="07XXXXXXXX"
          />

          <Input
            label="School"
            name="school"
            value={form.school}
            onChange={handleChange}
          />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Address
            </label>

            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* ===================================
            Divider
            =================================== */}
        <div className="my-8 border-t border-gray-200" />

        {/* ===================================
            Class Enrollment
            =================================== */}
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Class Enrollment
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            View or update the student's class for an academic year
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Academic Year */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Academic Year
            </label>

            <input
              type="number"
              min={2000}
              max={2100}
              value={academicYear}
              onChange={handleYearChange}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Class
              {isAdmin ? " *" : ""}
            </label>

            <select
              value={selectedClassId}
              onChange={(e) =>
                setSelectedClassId(
                  e.target.value
                )
              }
              disabled={
                !isAdmin ||
                loadingEnrollment ||
                saving
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">
                {loadingEnrollment
                  ? "Loading enrollment..."
                  : "Select Class"}
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
        </div>

        {/* ===================================
            Enrollment Status
            =================================== */}
        {!loadingEnrollment && (
          <div className="mt-5">
            {enrollment ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                    Enrolled
                  </span>

                  <span className="font-semibold text-gray-950">
                    {enrollment.className}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-700">
                  Current enrollment for{" "}
                  <strong>
                    {enrollment.academicYear}
                  </strong>
                </p>

                {isAdmin && (
                  <p className="mt-2 text-sm text-gray-600">
                    Select another class above and click
                    Update Student to change the class.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-semibold text-amber-900">
                  Not Enrolled
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  No class enrollment found for{" "}
                  {academicYear}.
                </p>

                {isAdmin && (
                  <p className="mt-2 text-sm text-amber-800">
                    Select a class above and click
                    Update Student to enroll this student.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            Class enrollment can only be changed by an
            Admin.
          </div>
        )}

        {/* ===================================
            Buttons
            =================================== */}
        <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              loadingEnrollment
            }
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Updating..."
              : "Update Student"}
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================
// Reusable Input
// =========================================
function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-900">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}