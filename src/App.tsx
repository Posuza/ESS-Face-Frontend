import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import AdminHome from "./pages/AdminHome";
import AdminLogin from "./pages/AdminLogin";
import ClientAuthLogin from "./pages/ClientAuthLogin/Login";
import MoLoadingPopup from "./components/client/MoLoadingPopup";
import PermissionErrorModal from "./components/registeration/auth/popup/PermissionErrorModal";
import {
  ClientAuthRequestError,
  clientAuthService,
} from "./services/clientAuth.service";
import FaceVerification from "./pages/FaceVerify";
import Home from "./pages/RegisterionHome";
import SuperAdminHome from "./pages/SuperAdminHome";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import { useAppStore } from "./store";
import { useClientAuthStore } from "./store/clientAuthStore";

function EmployeeApp() {
  const employee = useAppStore((state) => state.employee);
  const route = useAppStore((state) => state.employeeRoute);
  const setRoute = useAppStore((state) => state.setEmployeeRoute);

  if (route === "verify" && employee) {
    return <FaceVerification employee={employee} onBack={() => setRoute("register")} />;
  }

  return (
    <Home employee={employee} />
  );
}

function ClientAuthRoute() {
  const navigate = useNavigate();
  const returnSite = useAppStore((state) => state.returnSite);
  const returnToSource = useAppStore((state) => state.returnToSource);
  const captureReturnSite = useAppStore((state) => state.captureReturnSite);
  const clearReturnSite = useAppStore((state) => state.clearReturnSite);
  const setClientContext = useClientAuthStore((state) => state.setClientContext);
  const callbackRequest = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      publicKey: params.get("public_key")?.trim() || "",
      returnTo: params.get("return_to")?.trim() || "",
    };
  }, []);
  const [callbackStatus, setCallbackStatus] = useState<
    "checking" | "allowed" | "blocked"
  >(() => {
    return callbackRequest.publicKey ? "checking" : "blocked";
  });
  const [callbackFailure, setCallbackFailure] = useState<
    ClientAuthRequestError | null
  >(null);

  useEffect(() => {
    const { publicKey, returnTo } = callbackRequest;
    if (!publicKey) {
      setClientContext(null, null);
      clearReturnSite();
      return;
    }

    let active = true;
    clientAuthService
      .validateCallback(publicKey, returnTo || undefined)
      .then((result) => {
        if (active) {
          const approvedReturnTo = result.return_to;
          const url = new URL(window.location.href);
          url.searchParams.set("public_key", publicKey);
          url.searchParams.set("return_to", approvedReturnTo);
          window.history.replaceState(window.history.state, "", url.href);
          captureReturnSite();
          setClientContext(publicKey, approvedReturnTo);
          setCallbackStatus("allowed");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setClientContext(null, null);
        clearReturnSite();
        setCallbackFailure(
          error instanceof ClientAuthRequestError ? error : null,
        );
        setCallbackStatus("blocked");
      });

    return () => {
      active = false;
    };
  }, [callbackRequest, captureReturnSite, clearReturnSite, setClientContext]);

  if (callbackStatus === "checking") {
    return <MoLoadingPopup open message="กำลังตรวจสอบแอปพลิเคชัน..." />;
  }
  if (callbackStatus === "blocked") {
    const ipBlocked = callbackFailure?.status === 429;
    const safeRedirectUrl = ipBlocked ? null : callbackFailure?.safeRedirectUrl;
    const finishBlockedFlow = () => {
      if (safeRedirectUrl) {
        window.location.replace(safeRedirectUrl);
        return;
      }
      navigate("/", { replace: true });
    };
    return (
      <PermissionErrorModal
        open
        variant="error"
        title={ipBlocked ? "ระงับการเชื่อมต่อชั่วคราว" : "ไม่อนุญาตให้เชื่อมต่อ"}
        message={
          ipBlocked
            ? `พบการเชื่อมต่อที่ถูกปฏิเสธหลายครั้ง กรุณารอ ${callbackFailure?.retryAfterSeconds ?? 900} วินาทีแล้วลองใหม่`
            : safeRedirectUrl
              ? "ที่อยู่ callback ไม่ตรงกับแอปที่ลงทะเบียน\nระบบจะพากลับไปยังแอปที่ได้รับอนุญาต"
              : "แอปพลิเคชันหรือที่อยู่ callback ไม่ได้รับอนุญาต"
        }
        autoCloseMs={ipBlocked ? 0 : 4000}
        showCloseButton
        onClose={finishBlockedFlow}
      />
    );
  }

  return (
    <ClientAuthLogin
      onLoginSuccess={(_empCode, _displayName, ticket) => {
        if (returnSite) {
          if (ticket) {
            const callback = new URL(returnSite.url);
            callback.searchParams.set("ticket", ticket);
            clearReturnSite();
            setClientContext(null, null);
            window.location.replace(callback.toString());
            return;
          }
          returnToSource();
          return;
        }
        navigate("/", { replace: true });
      }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmployeeApp />} />
      <Route path="/registration/face" element={<EmployeeApp />} />
      <Route path="/client-auth/login" element={<ClientAuthRoute />} />
      <Route path="/client-auth" element={<Navigate to="/client-auth/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/home" element={<AdminHome />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      <Route path="/super-admin/home" element={<SuperAdminHome />} />
      <Route path="/super-admin" element={<Navigate to="/super-admin/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
