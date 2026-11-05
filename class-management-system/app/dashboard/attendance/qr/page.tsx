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
type DailyCollection = {
  classId: number;
  date: string;
  totalCollection: number;
  paymentCount: number;
};

type DailyRevenueShare = {
  classId: number;
  date: string;
  classPercentage: number;
  teacherPercentage: number;
  isSaved?: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

type ScanResult = {
  message?: string;
  attendance: {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classId: number;
  className: string;
  attendanceDate: string;
  checkInTime: string;
  sessionType: "Regular" | "Extra";
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
    joinedDate?: string;
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
    unpaidMonths?: string[];
    paidMonths?: string[];
  };

 attendanceSummary?: {
  joinedDate: string;
  daysAttendedThisMonth: number;
  regularDaysAttendedThisMonth?: number;
};
};

export default function QrAttendancePage() {
  const router = useRouter();

  

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessionType, setSessionType] =
  useState<"Regular" | "Extra">("Regular");

  const [dailyCollection, setDailyCollection] =
  useState<DailyCollection | null>(null);

const [dailyShare, setDailyShare] =
  useState<DailyRevenueShare | null>(null);

const [classPercentage, setClassPercentage] = useState(20);

const [loadingDaily, setLoadingDaily] = useState(false);
const [savingShare, setSavingShare] = useState(false);

const [dailyError, setDailyError] = useState("");
const [shareSuccess, setShareSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [combinedSuccess, setCombinedSuccess] = useState("");

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const feePaymentRequired =
  scanResult !== null &&
  scanResult.attendance.sessionType === "Regular" &&
  !scanResult.payment.isPaid &&
  (scanResult.attendanceSummary?.regularDaysAttendedThisMonth ?? 0) >= 3;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const clearMessages = () => {
  setSuccess("");
  setWarning("");
  setError("");
  setPaymentSuccess("");
  setCombinedSuccess("");
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

  useEffect(() => {
  if (!selectedClassId) {
    setDailyCollection(null);
    setDailyShare(null);
    setClassPercentage(20);
    setDailyError("");
    return;
  }

  let cancelled = false;

  const loadDailyData = async () => {
    setLoadingDaily(true);
    setDailyError("");
    setDailyCollection(null);
    setDailyShare(null);

    try {
      const [collectionResponse, shareResponse] = await Promise.all([
        api.get<DailyCollection>(
          `/api/class-daily-collections/${selectedClassId}`
        ),
        api.get<DailyRevenueShare>(
          `/api/class-daily-revenue-shares/${selectedClassId}`
        ),
      ]);

      if (cancelled) return;

      setDailyCollection(collectionResponse.data);
      setDailyShare(shareResponse.data);
      setClassPercentage(
        Number(shareResponse.data.classPercentage)
      );
    } catch {
      if (!cancelled) {
        setDailyError("Failed to load today's collection.");
      }
    } finally {
      if (!cancelled) {
        setLoadingDaily(false);
      }
    }
  };

  loadDailyData();

  return () => {
    cancelled = true;
  };
}, [selectedClassId]);

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
    setCombinedSuccess("");

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
        },
      );

      setScanning(true);
    } catch {
      scannerRef.current = null;
      setScanning(false);

      setError(
        "Unable to start camera. Please allow camera permission and try again.",
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

  const handleGalleryQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Selected image could not be read."));
          }
        };

        reader.onerror = () => {
          reject(new Error("Selected image could not be read."));
        };

        reader.readAsDataURL(file);
      });

      const image = document.createElement("img");

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();

        image.onerror = () =>
          reject(
            new Error("Selected image could not be loaded after reading."),
          );

        image.src = imageDataUrl;
      });

      // Create canvas
      const canvas = document.createElement("canvas");

      canvas.width = image.naturalWidth || image.width;

      canvas.height = image.naturalHeight || image.height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Image processing is not supported.");
      }

      // Draw phone image onto canvas
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Convert canvas to PNG data URL
      const canvasImage = canvas.toDataURL("image/png");

      // Decode QR from processed image
      const qrReader = new BrowserQRCodeReader();

      const result = await qrReader.decodeFromImageUrl(canvasImage);

      const decodedText = result.getText();

      if (!decodedText?.trim()) {
        throw new Error("No QR code found in the image.");
      }

      // Existing attendance flow
      await handleQrScan(decodedText.trim());
    } catch (error: unknown) {
      console.error("Gallery QR Scan Error:", error);

      if (error instanceof Error) {
        setError(`Gallery QR Error: ${error.name} - ${error.message}`);
      } else {
        setError(`Gallery QR Error: ${String(error)}`);
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
    if (processingRef.current || !selectedClassId) {
      return;
    }

    processingRef.current = true;

    setProcessing(true);
    clearMessages();
    setScanResult(null);

    try {
     const response = await api.post("/api/attendance/qr", {
  qrToken: decodedText.trim(),
  classId: Number(selectedClassId),
  sessionType: sessionType,
});

      const result = response.data as ScanResult;

      setScanResult(result);

      const studentName = result.attendance?.studentName ?? "Student";

      const alreadyMarked =
  result.message?.toLowerCase().includes("already marked") ?? false;

if (alreadyMarked) {
  setWarning(
    `${studentName} - Attendance already marked for this class today!`
  );
} else {
  setSuccess(
  `${studentName} - ${result.attendance.sessionType} attendance recorded.`
);
}

      await stopScanner();
    } catch (err: any) {
      const status = err.response?.status;

      const responseData = err.response?.data;

      const message =
        typeof responseData === "string"
          ? responseData
          : responseData?.message || "Failed to mark attendance.";

      if (
        status === 400 &&
        message.toLowerCase().includes("attendance already marked")
      ) {
        setWarning(
          "Attendance has already been marked for this student today.",
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

  const handleRecordPayment = async () => {
    if (!scanResult || scanResult.payment.isPaid || recordingPayment) {
      return;
    }

    const { year, month, monthlyFee } = scanResult.payment;
    const feeMonthName = new Date(
      Date.UTC(year, month - 1, 1),
    ).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    if (
      !window.confirm(
        `Record fee payment for ${feeMonthName}?\n\n` +
          `Student: ${scanResult.student.firstName} ${scanResult.student.lastName ?? ""}\n` +
          `Class: ${scanResult.classDetails.name}\n` +
          `Amount: LKR ${Number(monthlyFee).toLocaleString()}`,
      )
    ) {
      return;
    }

    setRecordingPayment(true);
    setPaymentSuccess("");
    setError("");

    try {
      const response = await api.post("/api/payments", {
        studentId: scanResult.student.id,
        classId: scanResult.classDetails.id,
        year,
        month,
      });
      await refreshDailyCollection(scanResult.classDetails.id);

      setScanResult((current) => {
  if (!current) return current;

  const paidMonthValue = `${year}-${String(month).padStart(2, "0")}`;

  return {
    ...current,
    payment: {
      ...current.payment,
      isPaid: true,
      amountPaid: response.data.amount ?? monthlyFee,
      paidAt: response.data.paidAt ?? new Date().toISOString(),

      // Add current month to paid months
      paidMonths: [
        ...new Set([
          ...(current.payment.paidMonths ?? []),
          paidMonthValue,
        ]),
      ],

      // Remove current month from unpaid months, if present
      unpaidMonths: (current.payment.unpaidMonths ?? []).filter(
        (item) => item !== paidMonthValue
      ),
    },
  };
});
      if (success && !warning) {
  setSuccess("");
  setPaymentSuccess("");
  setCombinedSuccess(
    `${scanResult.student.firstName} - Attendance and ${feeMonthName} fee payment recorded successfully.`
  );
} else {
  setPaymentSuccess(`Payment recorded for ${feeMonthName}.`);
}
    } catch (err: any) {
      console.error("QR Fee Payment Error:", err);

      const responseData = err.response?.data;
      const message =
        typeof responseData === "string"
          ? responseData
          : responseData?.message || "Failed to record fee payment.";

      setError(message);
    } finally {
      setRecordingPayment(false);
    }
  };

  const handlePreviousMonthPayment = async (monthValue: string) => {
  if (!scanResult || recordingPayment) return;

  const [year, month] = monthValue.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    setError("Invalid payment month.");
    return;
  }

  const monthName = new Date(
    Date.UTC(year, month - 1, 1)
  ).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const confirmed = window.confirm(
    `Record previous fee payment?\n\n` +
    `Student: ${scanResult.student.firstName} ${scanResult.student.lastName ?? ""}\n` +
    `Class: ${scanResult.classDetails.name}\n` +
    `Month: ${monthName}\n` +
    `Amount: LKR ${Number(scanResult.payment.monthlyFee).toLocaleString()}`
  );

  if (!confirmed) return;

  setRecordingPayment(true);
  setPaymentSuccess("");
  setError("");

  try {
    await api.post("/api/payments", {
      studentId: scanResult.student.id,
      classId: scanResult.classDetails.id,
      year,
      month,
    });
    await refreshDailyCollection(scanResult.classDetails.id);

    setScanResult((current) =>
      current
        ? {
            ...current,
            payment: {
              ...current.payment,
              unpaidMonths:
                current.payment.unpaidMonths?.filter(
                  (item) => item !== monthValue
                ) ?? [],

                paidMonths: [
  ...new Set([
    ...(current.payment.paidMonths ?? []),
    monthValue,
  ]),
],
            },
          }
        : current
    );

    setPaymentSuccess(
      `${monthName} fee payment recorded successfully.`
    );
  } catch (err: any) {
    const responseData = err.response?.data;

    const message =
      typeof responseData === "string"
        ? responseData
        : responseData?.message || "Failed to record previous payment.";

    setError(message);
  } finally {
    setRecordingPayment(false);
  }
};

const refreshDailyCollection = async (classId: number) => {
  try {
    const response = await api.get<DailyCollection>(
      `/api/class-daily-collections/${classId}`
    );

    setDailyCollection((current) => {
      if (
        selectedClassId !== String(classId)
      ) {
        return current;
      }

      return response.data;
    });
  } catch {
    setDailyError("Failed to refresh daily collection.");
  }
};

const handleSaveDailyShare = async () => {
  if (
  !Number.isFinite(classPercentage) ||
  classPercentage < 0 ||
  classPercentage > 100 ||
  Math.round(classPercentage * 100) !== classPercentage * 100
) {
  setDailyError(
    "Percentage must be between 0 and 100 with maximum 2 decimal places."
  );
  return;
}

  setSavingShare(true);
  setDailyError("");
  setShareSuccess("");

  try {
    const response = await api.put<DailyRevenueShare>(
      `/api/class-daily-revenue-shares/${selectedClassId}`,
      {
        classPercentage,
      }
    );

    setDailyShare(response.data);
    setClassPercentage(
      Number(response.data.classPercentage)
    );
    setShareSuccess("Daily percentages saved successfully.");
  } catch {
    setDailyError("Failed to save daily percentages.");
  } finally {
    setSavingShare(false);
  }
};

const handleSessionTypeChange = async (
  type: "Regular" | "Extra"
) => {
  if (processing || scanning) return;

  setSessionType(type);
  setSelectedClassId("");
  setScanResult(null);
  clearMessages();
};

  // =========================================
  // Class Change
  // =========================================

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;

    if (scanning) {
      await stopScanner();
    }

    setSelectedClassId(classId);
    setScanResult(null);

    clearMessages();
  };

  if (loading) {
    return <p className="text-gray-600">Loading QR attendance...</p>;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Attendance</h1>

          <p className="mt-2 text-gray-600">
            Scan a student QR card to mark today&apos;s attendance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/attendance")}
          className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      <div className="mb-5 rounded-2xl bg-white p-6 shadow-sm">
  <h2 className="mb-4 text-lg font-bold text-gray-900">
    Select Attendance Type
  </h2>

  <div className="grid grid-cols-2 gap-3">
    {(["Regular", "Extra"] as const).map((type) => (
      <button
        key={type}
        type="button"
        disabled={scanning || processing}
        onClick={() => handleSessionTypeChange(type)}
        className={`rounded-xl border-2 px-4 py-4 font-semibold transition disabled:opacity-50 ${
          sessionType === type
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-300 bg-white text-gray-700"
        }`}
      >
        {type} Class
      </button>
    ))}
  </div>

  <p className="mt-3 text-sm text-gray-600">
    {sessionType === "Regular"
      ? "Regular attendance counts towards the fee warning."
      : "Extra attendance is saved without increasing the regular attendance count."}
  </p>
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
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
              {classItem.subject ? ` - ${classItem.subject}` : ""}
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
              Place the student QR card inside the camera area.
            </p>
          </div>

          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              disabled={!selectedClassId || processing}
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
            disabled={!selectedClassId || processing || scanning}
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
          <div id="qr-reader" className="overflow-hidden rounded-xl" />
        </div>

        
{/* Daily Collection and Revenue Sharing */}
{selectedClassId && (
  <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-gray-900">
      Today's Class Collection
    </h2>

    {loadingDaily ? (
      <p className="mt-4 text-sm text-gray-500">
        Loading daily collection...
      </p>
    ) : (
      <>
        {dailyError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {dailyError}
          </p>
        )}

        {shareSuccess && (
          <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {shareSuccess}
          </p>
        )}

        {dailyCollection && dailyShare && (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Date: {dailyCollection.date}
            </p>

            <div className="mt-4 rounded-xl bg-blue-600 p-5 text-white">
              <p className="text-sm text-blue-100">
                Total Collected Today
              </p>

              <p className="mt-2 text-3xl font-bold">
                LKR{" "}
                {Number(
                  dailyCollection.totalCollection
                ).toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              <p className="mt-2 text-sm text-blue-100">
                {dailyCollection.paymentCount} Payments
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">
                  Class / Institute Share
                </p>

                <p className="mt-2 text-2xl font-bold text-indigo-900">
                  LKR{" "}
                  {(
                    Number(dailyCollection.totalCollection) *
                    classPercentage /
                    100
                  ).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>

                <p className="mt-1 font-semibold text-indigo-700">
                  {classPercentage}%
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm font-medium text-green-700">
                  Teacher / Sir Share
                </p>

                <p className="mt-2 text-2xl font-bold text-green-900">
                  LKR{" "}
                  {(
                    Number(dailyCollection.totalCollection) *
                    (100 - classPercentage) /
                    100
                  ).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>

                <p className="mt-1 font-semibold text-green-700">
                  {Number((100 - classPercentage).toFixed(2))}%
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900">
                Daily Percentage Settings
              </h3>

              <label
                htmlFor="class-percentage"
                className="mt-4 block text-sm font-medium text-gray-700"
              >
                Class / Institute Percentage
              </label>

              <input
                id="class-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={classPercentage}
                onChange={(e) => {
                  setClassPercentage(Number(e.target.value));
                  setShareSuccess("");
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />

              <p className="mt-3 text-sm text-gray-600">
                Teacher Percentage:{" "}
                <strong>
                  {Number((100 - classPercentage).toFixed(2))}%
                </strong>
              </p>

              <button
                type="button"
                onClick={handleSaveDailyShare}
                disabled={savingShare || loadingDaily}
                className="mt-4 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingShare
                  ? "Saving..."
                  : "Save Today's Percentages"}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                These percentages apply only to the selected
                class and today's collection.
              </p>

              {dailyShare.updatedBy && (
                <p className="mt-2 text-xs text-gray-500">
                  Last saved by: {dailyShare.updatedBy}
                </p>
              )}
            </div>
          </>
        )}
      </>
    )}
  </div>
)}


        {processing && (
          <div className="mt-5 rounded-lg bg-blue-50 p-4 text-blue-700">
            Processing QR code...
          </div>
        )}

       {success && (
  <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
      ✓
    </span>

    <div>
      <p className="font-bold text-green-800">
        Attendance Marked Successfully!
      </p>

      <p className="mt-1 text-sm text-green-700">
        {success}
      </p>
    </div>
  </div>
)}

{combinedSuccess && (
  <div className="mt-5 flex items-start gap-3 rounded-xl border border-purple-300 bg-purple-50 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xl font-bold text-white">
      ✓✓
    </span>

    <div>
      <p className="font-bold text-purple-800">
        Attendance Marked + Fee Paid!
      </p>

      <p className="mt-1 text-sm text-purple-700">
        {combinedSuccess}
      </p>
    </div>
  </div>
)}

{paymentSuccess && (
  <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
      ✔
    </span>

    <div>
      <p className="font-bold text-blue-800">
        Fee Paid Successfully!
      </p>

      <p className="mt-1 text-sm text-blue-700">
        {paymentSuccess}
      </p>
    </div>
  </div>
)}

        {warning && (
          <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 font-semibold text-red-700">
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
{/* Main Student Summary Card */}
<div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
  <div className="bg-blue-600 px-5 py-5 text-white">
    <p className="text-sm font-medium text-blue-100">
      Student Information
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      {scanResult.student.firstName}{" "}
      {scanResult.student.lastName ?? ""}
    </h2>

    <p className="mt-1 text-sm text-blue-100">
      ID: {scanResult.student.studentCode}
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
    <div>
      <p className="text-sm text-gray-500">Class</p>
      <p className="font-bold text-gray-900">
        {scanResult.classDetails.name}
      </p>
    </div>

    <div>
      <p className="text-sm text-gray-500">Teacher</p>
      <p className="font-bold text-gray-900">
        {scanResult.classDetails.teacherName || "-"}
      </p>
    </div>

    <div>
      <p className="text-sm text-gray-500">Joined Date</p>
      <p className="font-bold text-gray-900">
        {scanResult.attendanceSummary?.joinedDate || "-"}
      </p>
    </div>

    <div>
  <p className="text-sm text-gray-500">
    Attendance This Month
  </p>

  <p className="font-bold text-gray-900">
    {scanResult.attendanceSummary?.daysAttendedThisMonth ?? 0} Days
  </p>

  <p className="mt-1 text-sm text-blue-700">
    Regular:{" "}
    {scanResult.attendanceSummary?.regularDaysAttendedThisMonth ?? 0}
  </p>

  <p className="text-sm text-orange-700">
    Extra:{" "}
    {Math.max(
      0,
      (scanResult.attendanceSummary?.daysAttendedThisMonth ?? 0) -
        (scanResult.attendanceSummary?.regularDaysAttendedThisMonth ?? 0)
    )}
  </p>
</div>
  </div>

  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-5">
    <div className="rounded-xl bg-green-50 p-4 text-center">
      <p className="text-sm font-medium text-green-700">
        Paid Months
      </p>

      <p className="mt-2 text-3xl font-bold text-green-700">
        {scanResult.payment.paidMonths?.length ?? 0}
      </p>
    </div>

    <div className="rounded-xl bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-700">
        Unpaid Months
      </p>

      <p className="mt-2 text-3xl font-bold text-red-700">
        {(scanResult.payment.unpaidMonths?.length ?? 0) +
          (scanResult.payment.isPaid ? 0 : 1)}
      </p>
    </div>
  </div>

  <div className="border-t border-gray-100 px-5 py-4">
    <h3 className="mb-3 font-bold text-gray-900">
      Monthly Payment History
    </h3>

    <div className="space-y-2">
      {[
        ...(scanResult.payment.paidMonths ?? []).map((month) => ({
          month,
          paid: true,
        })),
        ...(scanResult.payment.unpaidMonths ?? []).map((month) => ({
          month,
          paid: false,
        })),
        ...(!scanResult.payment.isPaid
          ? [{
              month: `${scanResult.payment.year}-${String(
                scanResult.payment.month
              ).padStart(2, "0")}`,
              paid: false,
            }]
          : []),
      ]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((item) => {
          const [year, month] = item.month.split("-").map(Number);

          const monthName = new Date(
            Date.UTC(year, month - 1, 1)
          ).toLocaleDateString("en", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });

          return (
            <div
              key={item.month}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
            >
              <span className="text-sm font-semibold text-gray-800">
                {monthName}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
  <span
    className={`rounded-full px-3 py-1 text-xs font-bold ${
      item.paid
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
    }`}
  >
    {item.paid ? "✓ Paid" : "Unpaid"}
  </span>

  {!item.paid && (
    <button
      type="button"
      onClick={() => {
        const isCurrentMonth =
          year === scanResult.payment.year &&
          month === scanResult.payment.month;

        if (isCurrentMonth) {
          handleRecordPayment();
        } else {
          handlePreviousMonthPayment(item.month);
        }
      }}
      disabled={recordingPayment}
      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {recordingPayment ? "Processing..." : "Record Payment"}
    </button>
  )}
</div>
            </div>
          );
        })}
    </div>
  </div>
</div>

            <details className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
  <summary className="cursor-pointer select-none bg-gray-50 px-5 py-4 text-lg font-bold text-gray-900 hover:bg-gray-100">
    More Details — Student & Class
  </summary>

  <div className="space-y-5 p-4">
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
                      scanResult.classDetails.monthlyFee,
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
              </div>
</details>

{feePaymentRequired && (
  <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
    <div className="flex items-start gap-3">
      <span className="text-3xl">🔴</span>

      <div>
        <h3 className="text-lg font-bold text-red-800">
          Class Fee Payment Required!
        </h3>

        <p className="mt-2 text-sm text-red-700">
  This student has attended{" "}
  <strong>
    {scanResult.attendanceSummary?.regularDaysAttendedThisMonth ?? 0}
  </strong>{" "}
  Regular classes this month, but the class fee has not been paid.
</p>

        <p className="mt-2 font-semibold text-red-800">
          Amount Due: LKR{" "}
          {Math.max(
            0,
            Number(scanResult.payment.monthlyFee) -
              Number(scanResult.payment.amountPaid)
          ).toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)}


            {/* Payment Status */}
            {/* <div
              className={`overflow-hidden rounded-2xl border ${
                scanResult.payment.isPaid
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            > */}
              <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Monthly Payment
                  </h3>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    Fee month:{" "}
                    {new Date(
                      Date.UTC(
                        scanResult.payment.year,
                        scanResult.payment.month - 1,
                        1,
                      ),
                    ).toLocaleDateString("en", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    scanResult.payment.isPaid
                      ? "bg-green-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {scanResult.payment.isPaid ? "✓ PAID" : "⚠ UNPAID"}
                </span>
              </div>

              <div className="px-5">
                <div className="flex items-center justify-between gap-5 border-b border-black/5 py-3.5">
                  <span className="text-sm font-medium text-gray-600">
                    Monthly Fee
                  </span>

                  <span className="text-sm font-bold text-gray-900">
                    LKR {Number(scanResult.payment.monthlyFee).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-5 py-3.5">
                  <span className="text-sm font-medium text-gray-600">
                    Amount Paid
                  </span>

                  <span className="text-sm font-bold text-gray-900">
                    LKR {Number(scanResult.payment.amountPaid).toLocaleString()}
                  </span>
                </div>

                {paymentSuccess && (
  <div className="my-4 flex items-start gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
      ✔
    </span>

    <div>
      <p className="font-bold text-blue-800">
        Fee Paid Successfully!
      </p>

      <p className="mt-1 text-sm text-blue-700">
        {paymentSuccess}
      </p>
    </div>
  </div>
)}

                {!scanResult.payment.isPaid && (
                  <button
                    type="button"
                    onClick={handleRecordPayment}
                    disabled={recordingPayment}
                    className="mb-4 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {recordingPayment ? "Recording Payment..." : "Record Fee Payment"}
                  </button>
                )}
              </div>
            {/* </div> */}



            {/* Attendance Details */}
          </div>
        )}

        {/* Scan Another Student */}

       {(success || warning || error || combinedSuccess || paymentSuccess) &&
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
