import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import { TradePage } from "./pages/TradePage";
import { TradesPage } from "./pages/TradesPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ToolsPage } from "./pages/ToolsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<WatchlistPage />} />
            <Route path="/trade/:symbol" element={<TradePage />} />
            <Route path="/trades" element={<TradesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tools" element={<ToolsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}