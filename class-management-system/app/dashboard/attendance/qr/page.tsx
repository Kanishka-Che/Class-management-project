"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { BrowserQRCodeReader } from "@zxing/browser";
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

type ScanResult = {
  attendance: {
    id: number;
    studentId: number;
    studentCode: string;
    studentName: string;
    classId: number;
    className: string;
    attendanceDate: string;
    checkInTime: string;
  };

  student: {
    id: number;
    studentCode: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    parentName: string | null;
    parentPhone: string | null;
    school: string | null;
  };

  classDetails: {
    id: number;
    name: string;
    subject: string | null;
    teacherName: string | null;
    monthlyFee: number;
    day: string | null;
    startTime: string | null;
  };

  payment: {
    year: number;
    month: number;
    isPaid: boolean;
    amountPaid: number;
    monthlyFee: number;
    paidAt: string | null;
  };
};

export default function QrAttendancePage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const [scanResult, setScanResult] =
    useState<ScanResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const clearMessages = () => {
    setSuccess("");
    setWarning("");
    setError("");
  };

  // =========================================
  // Load Classes
  // =========================================

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);

        const response = await api.get("/api/classes");

        setClasses(response.data);
      } catch {
        setError("Failed to load classes.");
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  // =========================================
  // Cleanup Camera
  // =========================================

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  // =========================================
  // Start Scanner
  // =========================================

  const startScanner = async () => {
    clearMessages();
    setScanResult(null);

    if (!selectedClassId) {
      setError("Please select a class first.");
      return;
    }

    try {
      const scanner = new Html5Qrcode("qr-reader");

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          await handleQrScan(decodedText);
        },
        () => {
          // Ignore normal scan failures
          // while camera is running.
        }
      );

      setScanning(true);
    } catch {
      scannerRef.current = null;
      setScanning(false);

      setError(
        "Unable to start camera. Please allow camera permission and try again."
      );
    }
  };

  // =========================================
  // Stop Scanner
  // =========================================

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }

      scanner.clear();
    } catch {
      // Scanner may already be stopped.
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  };

  // =========================================
// Scan QR From Gallery
// =========================================

// =========================================
// Scan QR From Gallery
// =========================================

const handleGalleryQr = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  clearMessages();
  setScanResult(null);

  if (!selectedClassId) {
    setError("Please select a class first.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setError("Please select a valid image.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setError("Image size must be less than 10 MB.");
    return;
  }

  if (processingRef.current) return;

  // let objectUrl = "";

  try {
    setProcessing(true);

    // Create temporary URL for selected phone image
    const imageDataUrl = await new Promise<string>(
  (resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(
          new Error(
            "Selected image could not be read."
          )
        );
      }
    };

    reader.onerror = () => {
      reject(
        new Error(
          "Selected image could not be read."
        )
      );
    };

    reader.readAsDataURL(file);
  }
);

const image = document.createElement("img");

await new Promise<void>((resolve, reject) => {
  image.onload = () => resolve();

  image.onerror = () =>
    reject(
      new Error(
        "Selected image could not be loaded after reading."
      )
    );

  image.src = imageDataUrl;
});

    // Create canvas
    const canvas = document.createElement("canvas");

    canvas.width =
      image.naturalWidth || image.width;

    canvas.height =
      image.naturalHeight || image.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Image processing is not supported."
      );
    }

    // Draw phone image onto canvas
    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert canvas to PNG data URL
    const canvasImage =
      canvas.toDataURL("image/png");

    // Decode QR from processed image
    const qrReader = new BrowserQRCodeReader();

    const result =
      await qrReader.decodeFromImageUrl(
        canvasImage
      );

    const decodedText = result.getText();

    if (!decodedText?.trim()) {
      throw new Error(
        "No QR code found in the image."
      );
    }

    // Existing attendance flow
    await handleQrScan(decodedText.trim());
  } catch (error: unknown) {
  console.error("Gallery QR Scan Error:", error);

  if (error instanceof Error) {
    setError(
      `Gallery QR Error: ${error.name} - ${error.message}`
    );
  } else {
    setError(
      `Gallery QR Error: ${String(error)}`
    );
  }
} finally {
  if (galleryInputRef.current) {
    galleryInputRef.current.value = "";
  }

  setProcessing(false);
}
};

  // =========================================
  // Handle QR Scan
  // =========================================

  const handleQrScan = async (decodedText: string) => {
    if (
      processingRef.current ||
      !selectedClassId
    ) {
      return;
    }

    processingRef.current = true;

    setProcessing(true);
    clearMessages();
    setScanResult(null);

    try {
      const response = await api.post(
        "/api/attendance/qr",
        {
          qrToken: decodedText.trim(),
          classId: Number(selectedClassId),
        }
      );

      const result = response.data as ScanResult;

      setScanResult(result);

      const studentName =
        result.attendance?.studentName ??
        "Student";

      setSuccess(
        `${studentName} - Attendance marked successfully.`
      );

      await stopScanner();
    } catch (err: any) {
      const status = err.response?.status;

      const responseData = err.response?.data;

      const message =
        typeof responseData === "string"
          ? responseData
          : responseData?.message ||
            "Failed to mark attendance.";

      if (
        status === 400 &&
        message
          .toLowerCase()
          .includes("attendance already marked")
      ) {
        setWarning(
          "Attendance has already been marked for this student today."
        );
      } else {
        setError(message);
      }

      await stopScanner();
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  };

  // =========================================
  // Class Change
  // =========================================

  const handleClassChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const classId = e.target.value;

    if (scanning) {
      await stopScanner();
    }

    setSelectedClassId(classId);
    setScanResult(null);

    clearMessages();
  };

  if (loading) {
    return (
      <p className="text-gray-600">
        Loading QR attendance...
      </p>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            QR Attendance
          </h1>

          <p className="mt-2 text-gray-600">
            Scan a student QR card to mark today&apos;s
            attendance.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard/attendance")
          }
          className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {/* Class Selection */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Class
        </label>

        <select
          value={selectedClassId}
          onChange={handleClassChange}
          disabled={processing}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 sm:max-w-xl disabled:bg-gray-100"
        >
          <option value="">Select Class</option>

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

      {/* Scanner */}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Camera Scanner
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Place the student QR card inside the
              camera area.
            </p>
          </div>

          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              disabled={
                !selectedClassId ||
                processing
              }
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Start Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopScanner}
              disabled={processing}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* Gallery QR Scanner */}

<div className="mt-4">
  <input
    ref={galleryInputRef}
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={handleGalleryQr}
    className="hidden"
  />

  <button
    type="button"
    onClick={() => galleryInputRef.current?.click()}
    disabled={
      !selectedClassId ||
      processing ||
      scanning
    }
    className="w-full rounded-lg border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 sm:w-auto"
  >
    Upload QR from Gallery
  </button>

  <p className="mt-2 text-sm text-gray-500">
    Select a student QR image from your phone.
  </p>

  {/* Hidden element required for gallery QR decoding */}
</div>

        {/* Camera Area */}

        <div className="mx-auto mt-6 max-w-lg">
          <div
            id="qr-reader"
            className="overflow-hidden rounded-xl"
          />
        </div>

        {processing && (
          <div className="mt-5 rounded-lg bg-blue-50 p-4 text-blue-700">
            Processing QR code...
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 font-medium text-green-700">
            ✓ {success}
          </div>
        )}

        {warning && (
          <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            ⚠ {warning}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* =====================================
            Scan Result Details
        ====================================== */}

        {scanResult && (
          <div className="mt-6 space-y-5">
         {/* Student Details */}
<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
  <div className="border-b border-gray-200 px-5 py-4">
    <h3 className="text-lg font-bold text-gray-900">
      Student Details
    </h3>
  </div>

  <div className="px-5">
    {[
      [
        "Name",
        `${scanResult.student.firstName} ${
          scanResult.student.lastName ?? ""
        }`.trim(),
      ],
      ["Student ID", scanResult.student.studentCode],
      ["Phone", scanResult.student.phone || "-"],
      ["Parent", scanResult.student.parentName || "-"],
      ["Parent Phone", scanResult.student.parentPhone || "-"],
      ["School", scanResult.student.school || "-"],
    ].map(([label, value]) => (
      <div
        key={label}
        className="flex items-start justify-between gap-5 border-b border-gray-100 py-3.5 last:border-b-0"
      >
        <span className="shrink-0 text-sm font-medium text-gray-500">
          {label}
        </span>

        <span className="break-words text-right text-sm font-semibold text-gray-900">
          {value}
        </span>
      </div>
    ))}
  </div>
</div>

            {/* Class Details */}
<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
  <div className="border-b border-gray-200 px-5 py-4">
    <h3 className="text-lg font-bold text-gray-900">
      Class Details
    </h3>
  </div>

  <div className="px-5">
    {[
      ["Class", scanResult.classDetails.name],
      ["Subject", scanResult.classDetails.subject || "-"],
      ["Teacher", scanResult.classDetails.teacherName || "-"],
      [
        "Monthly Fee",
        `LKR ${Number(
          scanResult.classDetails.monthlyFee
        ).toLocaleString()}`,
      ],
      ["Day", scanResult.classDetails.day || "-"],
      ["Start Time", scanResult.classDetails.startTime || "-"],
    ].map(([label, value]) => (
      <div
        key={label}
        className="flex items-start justify-between gap-5 border-b border-gray-100 py-3.5 last:border-b-0"
      >
        <span className="shrink-0 text-sm font-medium text-gray-500">
          {label}
        </span>

        <span className="break-words text-right text-sm font-semibold text-gray-900">
          {value}
        </span>
      </div>
    ))}
  </div>
</div>

           {/* Payment Status */}
<div
  className={`overflow-hidden rounded-2xl border ${
    scanResult.payment.isPaid
      ? "border-green-200 bg-green-50"
      : "border-amber-200 bg-amber-50"
  }`}
>
  <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
    <div>
      <h3 className="text-lg font-bold text-gray-900">
        Monthly Payment
      </h3>

      <p className="mt-1 text-sm font-medium text-gray-900">
        {scanResult.payment.year} / {scanResult.payment.month}
      </p>
    </div>

    <span
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${
        scanResult.payment.isPaid
          ? "bg-green-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      {scanResult.payment.isPaid
        ? "✓ PAID"
        : "⚠ UNPAID"}
    </span>
  </div>

  <div className="px-5">
    <div className="flex items-center justify-between gap-5 border-b border-black/5 py-3.5">
      <span className="text-sm font-medium text-gray-600">
        Monthly Fee
      </span>

      <span className="text-sm font-bold text-gray-900">
        LKR{" "}
        {Number(
          scanResult.payment.monthlyFee
        ).toLocaleString()}
      </span>
    </div>

    <div className="flex items-center justify-between gap-5 py-3.5">
      <span className="text-sm font-medium text-gray-600">
        Amount Paid
      </span>

      <span className="text-sm font-bold text-gray-900">
        LKR{" "}
        {Number(
          scanResult.payment.amountPaid
        ).toLocaleString()}
      </span>
    </div>
  </div>
</div>

           {/* Attendance Details */}
<div className="overflow-hidden rounded-2xl border border-green-200 bg-green-50">
  <div className="border-b border-green-200 px-5 py-4">
    <h3 className="text-lg font-bold text-green-800">
      ✓ Attendance Marked
    </h3>
  </div>

  <div className="px-5">
    <div className="flex items-center justify-between gap-5 border-b border-green-200 py-3.5">
      <span className="text-sm font-medium text-gray-600">
        Date
      </span>

      <span className="text-sm font-bold text-gray-900">
        {scanResult.attendance.attendanceDate}
      </span>
    </div>

    <div className="flex items-center justify-between gap-5 py-3.5">
      <span className="text-sm font-medium text-gray-600">
        Class
      </span>

      <span className="text-right text-sm font-bold text-gray-900">
        {scanResult.attendance.className}
      </span>
    </div>
  </div>
</div>
          </div>
        )}

        {/* Scan Another Student */}

        {(success || warning || error) &&
          !scanning &&
          selectedClassId && (
            <button
              type="button"
              onClick={startScanner}
              disabled={processing}
              className="mt-6 w-full rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60 sm:w-auto"
            >
              Scan Another Student
            </button>
          )}
      </div>
    </div>
  );
}