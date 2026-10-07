"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";
import { useRouter } from "next/navigation";

type UserItem = {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Staff");

  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<number | null>(null);

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

      if (
        axios.isAxiosError(err) &&
        err.response?.status === 403
      ) {
        setError(
          "You do not have permission to access User Management."
        );
      } else {
        setError("Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================================
  // Create User
  // =========================================
  const handleCreateUser = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (creating) return;

    setError("");
    setSuccess("");
    setCreating(true);

    try {
      await api.post("/api/auth/register", {
        username: username.trim(),
        password,
        role,
      });

      setSuccess("User created successfully.");

      setUsername("");
      setPassword("");
      setRole("Staff");
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
  // Deactivate User
  // =========================================
  const handleDeactivate = async (user: UserItem) => {
    if (
      !window.confirm(
        `Deactivate user "${user.username}"?`
      )
    ) {
      return;
    }

    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");

      await api.patch(
        `/api/users/${user.id}/deactivate`
      );

      setSuccess(
        `${user.username} deactivated successfully.`
      );

      await loadUsers();
    } catch (err: unknown) {
      console.error("Deactivate User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message ||
                "Failed to deactivate user."
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

      await api.patch(
        `/api/users/${user.id}/activate`
      );

      setSuccess(
        `${user.username} activated successfully.`
      );

      await loadUsers();
    } catch (err: unknown) {
      console.error("Activate User Error:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setError(
          typeof data === "string"
            ? data
            : data?.message ||
                "Failed to activate user."
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
    `WARNING!\n\nAre you sure you want to permanently delete "${user.username}"?\n\nRole: ${user.role}\n\nThis account will be completely removed from the system.\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setProcessingId(user.id);
    setError("");
    setSuccess("");

    await api.delete(
      `/api/users/${user.id}/permanent`
    );

    setSuccess(
      `${user.username} permanently deleted successfully.`
    );

    setUsers((currentUsers) =>
      currentUsers.filter(
        (item) => item.id !== user.id
      )
    );
  } catch (err: unknown) {
    console.error(
      "Permanent Delete User Error:",
      err
    );

    if (axios.isAxiosError(err)) {
      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : data?.message ||
              "Failed to permanently delete user."
      );
    } else {
      setError(
        "Failed to permanently delete user."
      );
    }
  } finally {
    setProcessingId(null);
  }
};

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            User Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage Admin and Staff accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setError("");
            setSuccess("");
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Messages */}
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

      {/* Create User */}
      {showCreateForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Create User
          </h2>

          <form
            onSubmit={handleCreateUser}
            className="mt-5 grid gap-5 md:grid-cols-3"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                minLength={3}
                maxLength={100}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                minLength={6}
                maxLength={100}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Role
              </label>

              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating
                  ? "Creating..."
                  : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-900">
            System Users
          </h2>

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
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-5 py-4">
                    Username
                  </th>

                  <th className="px-5 py-4">
                    Role
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Created
                  </th>

                  <th className="px-5 py-4 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {user.username}

                      {currentUserId === user.id && (
                        <span className="ml-2 text-xs font-bold text-blue-600">
                          (You)
                        </span>
                      )}
                    </td>

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

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {currentUserId === user.id ? (
                        <span className="text-sm font-medium text-slate-400">
                          Current Account
                        </span>
                      ) : user.isActive ? (
                        <button
                          type="button"
                          disabled={
                            processingId === user.id
                          }
                          onClick={() =>
                            handleDeactivate(user)
                          }
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
      disabled={
        processingId === user.id
      }
      onClick={() =>
        handleActivate(user)
      }
      className="rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-200 disabled:opacity-50"
    >
      {processingId === user.id
        ? "Processing..."
        : "Activate"}
    </button>

    <button
      type="button"
      disabled={
        processingId === user.id
      }
      onClick={() =>
        handlePermanentDelete(user)
      }
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
                      colSpan={5}
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
    </div>
  );
}