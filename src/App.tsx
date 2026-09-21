import { Navigate, Route, Routes } from "react-router-dom";

// import AdminHome from "./pages/AdminHome";
// import AdminLogin from "./pages/AdminLogin";
// import FaceVerification from "./pages/FaceVerify";
// import Home from "./pages/Home";
// import { useAppStore } from "./store";

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EmployeeApp />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/home" element={<AdminHome />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
