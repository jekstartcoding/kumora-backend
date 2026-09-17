// Fase 6.3 — AdminLayout: sidebar statis 3 resource utama + topbar (user info, logout).
// Bahasa visual Filament: sidebar gelap bersih, daftar resource, konten terang.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const NAV_ITEMS = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/quiz-options', label: 'Quiz Options' },
  { to: '/admin/quiz-mappings', label: 'Quiz Mappings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');

  // Ambil email user sekali untuk topbar.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-60 flex-col bg-gray-900 text-gray-100">
        <div className="px-5 py-5 text-lg font-semibold tracking-wide">
          Kumora<span className="ml-1 text-xs font-normal text-gray-400">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-gray-800 font-medium text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-800 p-4 text-xs text-gray-500">
          Kumora CMS v1
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
