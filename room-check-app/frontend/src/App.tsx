import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/AuthProvider';
import { RequireAuth, AppLayout } from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import HomeRedirect from './pages/HomeRedirect';
import RoomsPage from './pages/inspector/RoomsPage';
import InspectionPage from './pages/inspector/InspectionPage';
import ActivityReviewPage from './pages/inspector/ActivityReviewPage';
import ReportPage from './pages/inspections/ReportPage';
import DashboardPage from './pages/manager/DashboardPage';
import ManagerRoomsPage from './pages/manager/RoomsPage';
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
              <Route path="/rooms/activity" element={<ActivityReviewPage />} />
              <Route path="/inspections/:id" element={<InspectionPage />} />
              <Route path="/inspections/:id/report" element={<ReportPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/rooms" element={<ManagerRoomsPage />} />
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
