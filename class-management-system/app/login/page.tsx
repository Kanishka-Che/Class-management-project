"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // =========================================
  // Check if user is already logged in
  // =========================================
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (token) {
      router.replace("/dashboard");
      return;
    }

    setCheckingLogin(false);
  }, [router]);

  // =========================================
  // Login
  // =========================================
  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post(
        "/api/auth/login",
        {
          username,
          password,
        }
      );

      sessionStorage.setItem(
        "token",
        response.data.token
      );

      sessionStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      router.replace("/dashboard");
    } catch (err: unknown) {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message = err.response?.data?.message;

    if (status === 401) {
      setError(
        message ||
          "Invalid username or password. Please check your credentials and try again."
      );
    } else if (status === 400) {
      setError(
        message || "Please check your username and password."
      );
    } else if (status && status >= 500) {
      setError(
        "Unable to sign in right now. Please try again later."
      );
    } else if (!status) {
      setError(
        "Unable to connect to the server. Please try again later."
      );
    } else {
      setError(
        message || "Unable to sign in. Please try again."
      );
    }
  } else {
    setError("Unexpected login error. Please try again.");
  }
} finally {
      setLoading(false);
    }
  };

  // =========================================
  // Checking Login
  // =========================================
  if (checkingLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Class Management System
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to continue
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Enter your username"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Secure Class Management System
        </p>
      </div>
    </main>
  );
}