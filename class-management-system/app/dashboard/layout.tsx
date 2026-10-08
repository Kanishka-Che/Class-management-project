
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  username: string;
  role: string;
};

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "home" },
  { name: "Students", href: "/dashboard/students", icon: "users" },
  { name: "Classes", href: "/dashboard/classes", icon: "book" },
  { name: "Attendance", href: "/dashboard/attendance", icon: "calendar" },
  { name: "Payments", href: "/dashboard/payments", icon: "wallet" },
  { name: "Reports", href: "/dashboard/reports", icon: "chart" },
];

function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1" />
      </>
    ),
    book: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h14v17H6a2 2 0 0 0-2 2z" />
        <path d="M4 5v17M8 7h8" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18m-12 5 2 2 4-4" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="M3 10h18M16 15h5M6 3h12" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V4M4 20h17M8 16v-4m5 4V7m5 9V4" />
      </>
    ),

   settings: (
  <>
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      fill="none"
    />
    <path
      d="M19.43 12.98a7.7 7.7 0 0 0 0-1.96l2.02-1.58-2-3.46-2.38.96a7.7 7.7 0 0 0-1.7-.98L15 3.5h-4l-.37 2.46c-.6.25-1.17.58-1.7.98l-2.38-.96-2 3.46 2.02 1.58a7.7 7.7 0 0 0 0 1.96l-2.02 1.58 2 3.46 2.38-.96c.53.4 1.1.73 1.7.98L11 20.5h2l.37-2.46a7.7 7.7 0 0 0 1.7-.98l2.38.96 2-3.46-2.02-1.58Z"
      fill="none"
    />
  </>
),
    scan: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
        <path d="M8 12h8M12 8v8" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    database: (
  <>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </>
),
    logout: (
      <>
        <path d="M10 17l5-5-5-5m5 5H3" />
        <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths.home}
    </svg>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const storedUser = sessionStorage.getItem("user");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to read user:", error);
      }
    }

    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.replace("/login");
  };

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-medium text-slate-700">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden bg-slate-900 p-4 text-white md:flex">
        <div className="mb-5 border-b border-slate-700 pb-4">
          <a
  href="https://zrio-labs-website.vercel.app/contactme"
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs font-bold uppercase tracking-widest text-blue-400 transition-colors hover:text-blue-300"
>
  ZrioLabs
</a>
          <h2 className="mt-2 text-lg font-bold leading-snug">
            Class Management
          </h2>
          <p className="mt-1 text-xs text-slate-400">
           System
          </p>
        </div>

        <nav className="flex-1 space-y-0.5">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.name}
            </Link>
          ))}

          <Link
            href="/dashboard/attendance/qr"
           className={`mt-3 flex items-center gap-2.5 rounded-lg border border-blue-500/40 px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive("/dashboard/attendance/qr")
                ? "bg-blue-600 text-white"
                : "bg-blue-600/15 text-blue-300 hover:bg-blue-600/25"
            }`}
          >
            <NavIcon name="scan" />
            Scan Student QR
          </Link>
        </nav>

            {user?.role === "Admin" && (
  <Link
    href="/dashboard/backup"
    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive("/dashboard/backup")
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`}
  >
    <NavIcon name="database" />
    Backup
  </Link>
)}

{/* {user?.role === "Admin" && (
  <Link
    href="/dashboard/users"
    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive("/dashboard/users")
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`}
  >
    <NavIcon name="users" />
    User Management
  </Link>
)} */}

<div className="mt-5 border-t border-slate-700 pt-4 text-center">
  <p className="text-[11px] text-slate-500">
    Powered by{" "}
    <a
      href="https://zrio-labs-website.vercel.app/contactme"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
    >
      ZRIOLabs
    </a>
  </p>
</div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex w-full items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-left font-semibold text-white hover:bg-red-700"
        >
          <NavIcon name="logout" />
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
       <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 md:px-8 md:py-3">
          <div className="md:hidden">
            <a
  href="https://zrio-labs-website.vercel.app/contactme"
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs font-bold tracking-widest text-blue-600 transition-colors hover:text-blue-500"
>
  ZrioLabs
</a>
            <p className="text-sm font-bold text-slate-900">
              Class Management
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">

  <Link
    href="/dashboard/settings"
    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  pathname.startsWith("/dashboard/settings")
    ? "bg-blue-50 text-blue-600"
    : "text-blue-500 hover:bg-blue-50 hover:text-blue-700"
}`}
  >
    <NavIcon name="settings" className="h-4 w-4" />
    Settings
  </Link>

  {user?.role === "Admin" && (
    <Link
      href="/dashboard/users"
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
  pathname.startsWith("/dashboard/users")
    ? "bg-blue-50 text-blue-600"
    : "text-blue-500 hover:bg-blue-50 hover:text-blue-700"
}`}
    >
      <NavIcon name="users" className="h-4 w-4" />
      User Management
    </Link>
  )}

</div>

          {user && (
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {user.username}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {user.role}
              </p>
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-28 sm:p-6 md:p-8">
          {children}
        </div>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden"
        >
          <div className="grid grid-cols-5 items-end gap-1 px-2 py-2">
            {[
              navigation[0],
              navigation[1],
              { name: "Scan", href: "/dashboard/attendance/qr", icon: "scan" },
              navigation[3],
            ].map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium ${
                  index === 2
                    ? "bg-blue-600 text-white"
                    : isActive(item.href)
                      ? "text-blue-600"
                      : "text-slate-500"
                }`}
              >
                <NavIcon name={item.icon} className="h-6 w-6" />
                {item.name}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-slate-500"
            >
              <NavIcon name="menu" className="h-6 w-6" />
              Menu
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/50"
            />

            <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest text-blue-600">
                    ZrioLabs
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">
                    Navigation
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xl text-slate-700"
                >
                  ×
                </button>
              </div>
              
<nav className="grid grid-cols-2 gap-2">
  {[
    ...navigation,
    { name: "Settings", href: "/dashboard/settings", icon: "settings" },
  ].map((item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setMobileMenuOpen(false)}
      className={`flex items-center gap-2 rounded-xl p-4 text-sm font-semibold ${
        isActive(item.href)
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-800"
      }`}
    >
      <NavIcon name={item.icon} />
      {item.name}
    </Link>
  ))}
</nav>
`


              {user?.role === "Admin" && (
  <Link
    href="/dashboard/backup"
    onClick={() => setMobileMenuOpen(false)}
    className={`flex items-center gap-2 rounded-xl p-4 text-sm font-semibold ${
      isActive("/dashboard/backup")
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-800"
    }`}
  >
    <NavIcon name="database" />
    Backup
  </Link>
)}

{user?.role === "Admin" && (
  <Link
    href="/dashboard/users"
    onClick={() => setMobileMenuOpen(false)}
    className={`flex items-center gap-2 rounded-xl p-4 text-sm mt-2 font-semibold ${
      isActive("/dashboard/users")
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-800"
    }`}
  >
    <NavIcon name="users" />
    User Management
  </Link>
)}

<div className="mt-5 border-t border-slate-700 pt-4 text-center">
  <p className="text-[11px] text-slate-500">
    Powered by{" "}
    <a
      href="https://zrio-labs-website.vercel.app/contactme"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-blue-400 transition-colors hover:text-blue-300"
    >
      ZrioLabs
    </a>
  </p>
</div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 p-4 font-semibold text-white"
              >
                <NavIcon name="logout" />
                Logout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
