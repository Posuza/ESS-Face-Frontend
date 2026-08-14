// src/App.tsx
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStore } from "./store/store";
import LogoutPopUp, {
  type LogoutStatus,
} from "./components/auth/popup/LogoutPopUp";
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
import Mo from "./pages/Mo/Mo";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CheckInOut = lazy(() => import("./pages/Attendance/CheckInOut"));
const FaceVerify = lazy(() => import("./pages/Attendance/FaceVerify"));
const JobAssigner = lazy(() => import("./pages/Job_assigner"));

type Route =
  | "login"
  | "home"
  | "dashboard"
  | "checkInOut"
  | "faceVerify"
  | "mo"
  | "jobAssigner";
type PunchType = "in" | "out";

export default function App() {
  // Restore session on refresh — if emp_code exists in sessionStorage, skip login
  const savedRoute = sessionStorage.getItem("app_route") as Route | null;
  const isLoggedIn = !!sessionStorage.getItem("emp_code");
  const initialRoute: Route = savedRoute && isLoggedIn ? savedRoute : "login";
  const [stack, setStack] = useState<Route[]>([initialRoute]);
  const route = stack[stack.length - 1];

  // Persist current route to sessionStorage so refresh keeps the same page
  useEffect(() => {
    if (route !== "login") {
      sessionStorage.setItem("app_route", route);
    }
  }, [route]);

  // ── Session timeout: 1 minute (for testing) ────────────────────────────
  // const SESSION_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute
  const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

  const checkSession = useCallback(() => {
    const loginTime = sessionStorage.getItem("login_time");
    if (loginTime && Date.now() - Number(loginTime) > SESSION_TIMEOUT_MS) {
      sessionStorage.clear();
      window.location.reload();
      return false;
    }
    return true;
  }, [SESSION_TIMEOUT_MS]);

  // Check session on mount and on every route change
  useEffect(() => {
    checkSession();
  }, [route, checkSession]);

  // Extend session on user interaction (click, keydown, scroll)
  // — resets the 2-hour timer so active users don't get kicked out
  useEffect(() => {
    const handleActivity = () => {
      if (!checkSession()) return;
      sessionStorage.setItem("login_time", String(Date.now()));
    };
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [checkSession]);

  const [lastInAt, setLastInAt] = useState<string | null>(null);
  const [lastOutAt, setLastOutAt] = useState<string | null>(null);

  const [punchType, setPunchType] = useState<PunchType>("in");

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState<LogoutStatus>("attempt");
  const logoutPromiseRef = useRef<Promise<boolean> | null>(null);

  // ===== Navigation helpers =====
  const reset = (r: Route) => {
    setStack([r]);
    if (r === "login") sessionStorage.removeItem("app_route");
  };

  const push = (r: Route) =>
    setStack((s) => (s[s.length - 1] === r ? s : [...s, r]));

  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  async function onLogout() {
    setLogoutStatus("attempt");
    setShowLogoutPopup(true);

    // Start logout in background — popup waits
    const code = sessionStorage.getItem("emp_code");
    const p = useStore.getState().logout(code || "");
    logoutPromiseRef.current = p;

    const ok = await p;
    if (ok) {
      // Small delay so user sees the attempt state briefly
      setTimeout(() => setLogoutStatus("success"), 600);
    } else {
      setLogoutStatus("fail");
    }
  }

  const onLogoutPopupClose = useCallback(async () => {
    setShowLogoutPopup(false);
    reset("login");
  }, []);

  const onLogoutRetry = useCallback(() => {
    setLogoutStatus("attempt");
    // Re-run logout
    const code = sessionStorage.getItem("emp_code");
    const p = useStore.getState().logout(code || "");
    logoutPromiseRef.current = p;
    p.then((ok) => {
      if (ok) {
        setTimeout(() => setLogoutStatus("success"), 600);
      } else {
        setLogoutStatus("fail");
      }
    });
  }, []);

  function goFaceVerify(type: PunchType) {
    setPunchType(type);
    push("faceVerify");
  }

  // onConfirm = บันทึกอย่างเดียว (ไม่ navigate)
  async function onFaceConfirm(_photoDataUrl: string, type: PunchType) {
    const nowIso = new Date().toISOString();
    if (type === "in") setLastInAt(nowIso);
    else setLastOutAt(nowIso);

    // TODO: เรียก backend จริง (await fetch/axios/google script)
    return;
  }

  // ให้ FaceVerify เรียกตอนกด OK ใน SuccessModal เพื่อไปหน้า CheckInOut
  function goCheckInOutFromFaceVerify() {
    setStack((s) => {
      const prev = s[s.length - 2];
      if (prev === "checkInOut") return s.slice(0, -1); // pop faceVerify
      return [...s.slice(0, -1), "checkInOut"]; // replace top
    });
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          กำลังโหลด...
        </div>
      }
    >
      <>
        {route === "login" && <Login onLoginSuccess={() => reset("home")} />}

        {route === "home" && (
          <Home
            onLogout={onLogout}
            onGoCheckInOut={() => push("checkInOut")}
            onGoLeaveOnline={() => alert("TODO: ไปหน้า ลาออนไลน์")}
            onGoMo={() => push("mo")}
            onGoJobAssigner={() => push("jobAssigner")}
          />
        )}

        {route === "checkInOut" && (
          <CheckInOut
            lastInAt={lastInAt}
            lastOutAt={lastOutAt}
            onBack={back}
            onCheckIn={() => goFaceVerify("in")}
            onCheckOut={() => goFaceVerify("out")}
            onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
          />
        )}

        {route === "faceVerify" && (
          <FaceVerify
            punchType={punchType}
            onBack={back}
            onConfirm={onFaceConfirm}
            onGoCheckInOut={goCheckInOutFromFaceVerify}
            onViewHistory={() => alert("TODO: เปิดหน้าประวัติย้อนหลัง 1 เดือน")}
          />
        )}
        {route === "mo" && <Mo onBackHome={() => reset("home")} />}
        {route === "jobAssigner" && (
          <JobAssigner onBackHome={() => reset("home")} />
        )}
        {route === "dashboard" && <Dashboard onLogout={onLogout} />}

        {/* Logout popup overlay */}
        <LogoutPopUp
          open={showLogoutPopup}
          status={logoutStatus}
          onClose={onLogoutPopupClose}
          onRetry={onLogoutRetry}
        />
      </>
    </Suspense>
  );
}
