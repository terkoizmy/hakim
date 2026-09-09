import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AppShell from './components/AppShell';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import CourtroomPage from './pages/CourtroomPage';
import MemoPage from './pages/MemoPage';
import JournalPage from './pages/JournalPage';
import PostmortemPage from './pages/PostmortemPage';
import TickerDetailPage from './pages/TickerDetailPage';
import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'trial/:trialId', element: <CourtroomPage /> },
      { path: 'memo/:trialId', element: <MemoPage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'ticker/:ticker', element: <TickerDetailPage /> },
      { path: 'journal/:memoId/postmortem', element: <PostmortemPage /> },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
