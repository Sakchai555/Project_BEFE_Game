import { Route, Routes } from 'react-router-dom';
import Storefront from './pages/Storefront';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/admin.html" element={<AdminPage />} />
      <Route path="*" element={<Storefront />} />
    </Routes>
  );
}
