import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/AuthProvider';
import { RequireAuth, AppLayout } from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import HomeRedirect from './pages/HomeRedirect';
import RoomsPage from './pages/inspector/RoomsPage';
import InspectionPage from './pages/inspector/InspectionPage';
import DashboardPage from './pages/manager/DashboardPage';
import AdminPage from './pages/admin/AdminPage';
import HseDashboardPage from './pages/hse/HseDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/inspections/:id" element={<InspectionPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/hse" element={<HseDashboardPage />} />
              <Route path="*" element={<HomeRedirect />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
