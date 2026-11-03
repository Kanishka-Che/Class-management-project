"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";
import { useRouter } from "next/navigation";

type AssignedClass = {
  classId: number;
  className: string;
};

type UserItem = {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedClasses: AssignedClass[];
};

type ClassItem = {
  id: number;
  name: string;
  subject?: string | null;
  teacherName?: string | null;
  isActive: boolean;
};

export default function UsersPage() {
  const router = useRouter();

  // =========================================
  // Main Data
  // =========================================

  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // Current User
  // =========================================

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // =========================================
  // Create User
  // =========================================

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");

  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  const [creating, setCreating] = useState(false);

  // =========================================
  // User Actions
  // =========================================

  const [processingId, setProcessingId] = useState<number | null>(null);

  // =========================================
  // Edit Class Access
  // =========================================

  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [editClassIds, setEditClassIds] = useState<number[]>([]);

  const [savingClasses, setSavingClasses] = useState(false);

  // =========================================
  // Check Admin
  // =========================================

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      router.replace("/login");
      return;
    }

    try {
      const loggedUser = JSON.parse(storedUser);

      if (loggedUser.role !== "Admin") {
        router.replace("/dashboard");
        return;
      }

      setCurrentUserId(loggedUser.id);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // =========================================
  // Load Users
  // =========================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/users");

      setUsers(response.data);
    } catch (err: unknown) {
      console.error("Users API Error:", err);

      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to access User Management.");
      } else {
        setError("Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // Load Active Classes
  // =========================================

  const loadClasses = async () => {
    try {
      const response = await api.get("/api/classes");

      setClasses(response.data);
    } catch (err) {
      console.error("Classes API Error:", err);

      setError("Failed to load classes.");
    }
  };

  useEffect(() => {
    loadUsers();
    loadClasses();
  }, []);

  // =========================================
  // Create Class Checkbox
  // =========================================

  const toggleCreateClass = (classId: number) => {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  // =========================================
  // Create User
  // =========================================

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (creating) return;

    setError("");
    setSuccess("");
    setError("");
    setSuccess("");

    if (role === "Staff" && selectedClassIds.length === 0) {
      setError("Please select at least one class for Staff.");
      return;
    }

    setCreating(true);

    try {
      await api.post("/api/auth/register", {
        username: username.trim(),
        password,
        role,

        classIds: role === "Staff" ? selectedClassIds : [],
      });

      setSuccess("User created successfully.");

      setUsername("");
      setPassword("");
      setRole("Staff");
      setSelectedClassIds([]);
      setShowCreateForm(false);

      await loadUsers();
    } catch (err: unknown) {
      console.error("Create User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        if (typeof data === "string") {
          setError(data);
        } else if (data?.message) {
          setError(data.message);
        } else {
          setError("Failed to create user.");
        }
      } else {
        setError("Failed to create user.");
      }
    } finally {
      setCreating(false);
    }
  };

  // =========================================
  // Start Editing Class Access
  // =========================================

  const startEditingClasses = (user: UserItem) => {
    setEditingUserId(user.id);

    setEditClassIds(user.assignedClasses?.map((item) => item.classId) ?? []);

    setError("");
    setSuccess("");
  };

  // =========================================
  // Edit Class Checkbox
  // =========================================

  const toggleEditClass = (classId: number) => {
    setEditClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  // =========================================
  // Save Class Access
  // =========================================

  const handleSaveClassAccess = async (user: UserItem) => {
    try {
      setSavingClasses(true);
      setError("");
      setSuccess("");

      await api.put(`/api/users/${user.id}/classes`, {
        classIds: editClassIds,
      });

      setSuccess(`${user.username}'s class access updated successfully.`);

      setEditingUserId(null);
      setEditClassIds([]);

      await loadUsers();
    } catch (err: unknown) {
      console.error("Update Class Access Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message || "Failed to update class access.",
        );
      } else {
        setError("Failed to update class access.");
      }
    } finally {
      setSavingClasses(false);
    }
  };

  // =========================================
  // Deactivate User
  // =========================================

  const handleDeactivate = async (user: UserItem) => {
    if (!window.confirm(`Deactivate user "${user.username}"?`)) {
      return;
    }

    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");

      await api.patch(`/api/users/${user.id}/deactivate`);

      setSuccess(`${user.username} deactivated successfully.`);

      await loadUsers();
    } catch (err: unknown) {
      console.error("Deactivate User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message || "Failed to deactivate user.",
        );
      } else {
        setError("Failed to deactivate user.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================
  // Activate User
  // =========================================

  const handleActivate = async (user: UserItem) => {
    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");

      await api.patch(`/api/users/${user.id}/activate`);

      setSuccess(`${user.username} activated successfully.`);

      await loadUsers();
    } catch (err: unknown) {
      console.error("Activate User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message || "Failed to activate user.",
        );
      } else {
        setError("Failed to activate user.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================
  // Permanently Delete User
  // =========================================

  const handlePermanentDelete = async (user: UserItem) => {
    const confirmed = window.confirm(
      `WARNING!\n\nAre you sure you want to permanently delete "${user.username}"?\n\nRole: ${user.role}\n\nThis account will be completely removed from the system.\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");

      await api.delete(`/api/users/${user.id}/permanent`);

      setSuccess(`${user.username} permanently deleted successfully.`);

      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== user.id),
      );

      if (editingUserId === user.id) {
        setEditingUserId(null);
        setEditClassIds([]);
      }
    } catch (err: unknown) {
      console.error("Permanent Delete User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message || "Failed to permanently delete user.",
        );
      } else {
        setError("Failed to permanently delete user.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================
  // Editing User
  // =========================================

  const editingUser =
    editingUserId !== null
      ? users.find((user) => user.id === editingUserId)
      : undefined;

  // =========================================
  // UI
  // =========================================

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* =====================================
          Header
      ===================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            User Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage Admin and Staff accounts and class access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);

            setError("");
            setSuccess("");

            if (showCreateForm) {
              setUsername("");
              setPassword("");
              setRole("Staff");
              setSelectedClassIds([]);
            }
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* =====================================
          Messages
      ===================================== */}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =====================================
          Create User
      ===================================== */}

      {showCreateForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Create User</h2>

          <p className="mt-1 text-sm text-slate-500">
            Create an Admin or Staff account.
          </p>

          <form
            onSubmit={handleCreateUser}
            className="mt-5 grid gap-5 md:grid-cols-3"
          >
            {/* Username */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={100}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>

            {/* Password */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                maxLength={100}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                placeholder="Minimum 6 characters"
              />
            </div>

            {/* Role */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Role
              </label>

              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;

                  setRole(newRole);

                  if (newRole === "Admin") {
                    setSelectedClassIds([]);
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="Staff">Staff</option>

                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* =================================
                Class Access
            ================================= */}

            {role === "Staff" && (
              <div className="md:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Class Access <span className="text-red-500">*</span>
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Select at least one class for this staff member.
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      {selectedClassIds.length} Selected
                    </span>
                  </div>

                  {classes.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No active classes available.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {classes.map((classItem) => {
                        const checked = selectedClassIds.includes(classItem.id);

                        return (
                          <label
                            key={classItem.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                              checked
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCreateClass(classItem.id)}
                              className="mt-1 h-4 w-4"
                            />

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {classItem.name}
                              </p>

                              {classItem.subject && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {classItem.subject}
                                </p>
                              )}

                              {classItem.teacherName && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Teacher: {classItem.teacherName}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================
          Users Table
      ===================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-900">System Users</h2>

          <p className="mt-1 text-sm text-slate-500">
            Total Users: {users.length}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center font-medium text-slate-500">
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-5 py-4">Username</th>

                  <th className="px-5 py-4">Role</th>

                  <th className="px-5 py-4">Class Access</th>

                  <th className="px-5 py-4">Status</th>

                  <th className="px-5 py-4">Created</th>

                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    {/* Username */}

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {user.username}

                      {currentUserId === user.id && (
                        <span className="ml-2 text-xs font-bold text-blue-600">
                          (You)
                        </span>
                      )}
                    </td>

                    {/* Role */}

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.role === "Admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Class Access */}

                    <td className="px-5 py-4">
                      {user.role === "Admin" ? (
                        <span className="text-sm font-semibold text-purple-600">
                          All Classes
                        </span>
                      ) : (
                        <div>
                          <div className="flex max-w-[320px] flex-wrap gap-1.5">
                            {user.assignedClasses?.length > 0 ? (
                              user.assignedClasses.map((classItem) => (
                                <span
                                  key={classItem.classId}
                                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {classItem.className}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">
                                No classes assigned
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => startEditingClasses(user)}
                            className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            Edit Class Access
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Created */}

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}

                    <td className="px-5 py-4 text-center">
                      {currentUserId === user.id ? (
                        <span className="text-sm font-medium text-slate-400">
                          Current Account
                        </span>
                      ) : user.isActive ? (
                        <button
                          type="button"
                          disabled={processingId === user.id}
                          onClick={() => handleDeactivate(user)}
                          className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          {processingId === user.id
                            ? "Processing..."
                            : "Deactivate"}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={processingId === user.id}
                            onClick={() => handleActivate(user)}
                            className="rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            {processingId === user.id
                              ? "Processing..."
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            disabled={processingId === user.id}
                            onClick={() => handlePermanentDelete(user)}
                            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                          >
                            {processingId === user.id
                              ? "Processing..."
                              : "Permanent Delete"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================
          Edit Staff Class Access
      ===================================== */}

      {editingUser && (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Edit Class Access
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Staff:{" "}
                <span className="font-bold text-slate-700">
                  {editingUser.username}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingUserId(null);
                setEditClassIds([]);
              }}
              className="w-fit rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Select accessible classes
              </p>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                {editClassIds.length} Selected
              </span>
            </div>

            {classes.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active classes available.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((classItem) => {
                  const checked = editClassIds.includes(classItem.id);

                  return (
                    <label
                      key={classItem.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEditClass(classItem.id)}
                        className="mt-1 h-4 w-4"
                      />

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {classItem.name}
                        </p>

                        {classItem.subject && (
                          <p className="mt-1 text-xs text-slate-500">
                            {classItem.subject}
                          </p>
                        )}

                        {classItem.teacherName && (
                          <p className="mt-1 text-xs text-slate-400">
                            Teacher: {classItem.teacherName}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={savingClasses}
              onClick={() => handleSaveClassAccess(editingUser)}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingClasses ? "Saving..." : "Save Class Access"}
            </button>

            <span className="text-sm text-slate-500">
              {editClassIds.length} class(es) selected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
