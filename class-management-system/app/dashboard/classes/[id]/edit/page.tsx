"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    teacherName: "",
    monthlyFee: "",
    day: "",
    startTime: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClass = async () => {
      try {
        const response = await api.get(`/api/classes/${params.id}`);
        const data = response.data;

        setForm({
          name: data.name ?? "",
          subject: data.subject ?? "",
          teacherName: data.teacherName ?? "",
          monthlyFee: String(data.monthlyFee ?? ""),
          day: data.day ?? "",
          startTime: data.startTime
            ? data.startTime.substring(0, 5)
            : "",
        });
      } catch (error) {
        console.error("Load Class Error:", error);
        setError("Failed to load class.");
      } finally {
        setLoading(false);
      }
    };

    loadClass();
  }, [params.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await api.put(`/api/classes/${params.id}`, {
        name: form.name,
        subject: form.subject || null,
        teacherName: form.teacherName || null,
        monthlyFee: Number(form.monthlyFee),
        day: form.day || null,
        startTime: form.startTime
          ? `${form.startTime}:00`
          : null,
      });

      router.push(`/dashboard/classes/${params.id}`);
    } catch (error) {
      console.error("Update Class Error:", error);
      setError("Failed to update class.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600">Loading class...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Edit Class
        </h1>

        <p className="mt-2 text-gray-600">
          Update class information
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-2xl bg-white p-8 shadow-sm"
      >
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label="Class Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Subject"
            name="subject"
            value={form.subject}
            onChange={handleChange}
          />

          <Input
            label="Teacher Name"
            name="teacherName"
            value={form.teacherName}
            onChange={handleChange}
          />

          <Input
            label="Monthly Fee (LKR)"
            name="monthlyFee"
            type="number"
            value={form.monthlyFee}
            onChange={handleChange}
            required
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Day
            </label>

            <select
              name="day"
              value={form.day}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            >
              <option value="">Select Day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <Input
            label="Start Time"
            name="startTime"
            type="time"
            value={form.startTime}
            onChange={handleChange}
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/classes/${params.id}`)
            }
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Update Class"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={type === "number" ? "0" : undefined}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
      />
    </div>
  );
}