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

export default function AddStudentPage() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

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
    classId: "",
    academicYear: currentYear.toString(),
  });

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // Load active classes
  // =========================================
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);

        const response = await api.get<ClassItem[]>(
          "/api/classes"
        );

        setClasses(response.data);
      } catch (error) {
        console.error("Load Classes Error:", error);
        setError("Failed to load classes.");
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  // =========================================
  // Handle form changes
  // =========================================
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =========================================
  // Save Student + Enrollment
  // =========================================
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.classId) {
      setError("Please select a class.");
      return;
    }

    const academicYear = Number(form.academicYear);

    if (
      !Number.isInteger(academicYear) ||
      academicYear < 2000 ||
      academicYear > 2100
    ) {
      setError("Please enter a valid academic year.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/students/with-enrollment", {
        firstName: form.firstName.trim(),

        lastName:
          form.lastName.trim() || null,

        dateOfBirth:
          form.dateOfBirth || null,

        gender:
          form.gender || null,

        phone:
          form.phone.trim() || null,

        parentName:
          form.parentName.trim() || null,

        parentPhone:
          form.parentPhone.trim() || null,

        address:
          form.address.trim() || null,

        school:
          form.school.trim() || null,

        classId: Number(form.classId),

        academicYear,
      });

      router.push("/dashboard/students");
    } catch (error: any) {
      console.error(
        "Create Student With Enrollment Error:",
        error
      );

      const message = error.response?.data;

      if (typeof message === "string") {
        setError(message);
      } else {
        setError(
          "Failed to create student. Please check the entered details."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-950">
          Add Student
        </h1>

        <p className="mt-2 text-gray-700">
          Register a new student and enroll the student in a class
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Student Information */}
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Student Information
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Enter the student's personal information
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

        {/* Divider */}
        <div className="my-8 border-t border-gray-200" />

        {/* Class Enrollment */}
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Class Enrollment
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select the class for this student
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Class */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">
              Class *
            </label>

            <select
              name="classId"
              value={form.classId}
              onChange={handleChange}
              required
              disabled={loadingClasses}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            >
              <option value="">
                {loadingClasses
                  ? "Loading classes..."
                  : "Select Class"}
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
          <Input
            label="Academic Year *"
            name="academicYear"
            type="number"
            value={form.academicYear}
            onChange={handleChange}
            required
          />
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || loadingClasses}
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : "Save Student & Enroll"}
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================
// Reusable Input Component
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