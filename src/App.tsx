import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import SetUsername from "./components/auth/SetUsername";
import Dashboard from "./components/dashboard/Dashboard";
import Tasks from "./components/tasks/Tasks";
import Notes from "./components/notes/Notes";
import StudyRoom from "./components/studyroom/StudyRoom";
import Alarm from "./components/alarm/Alarm";
import Friends from "./components/friends/Friends";
import Sidebar from "./components/layout/Sidebar";
import Journal from "./components/journal/Journal";
import HabitTracker from "./components/habits/HabitTracker";
import Exams from "./components/exams/Exams";
import Messaging from "./components/message/Messaging";
import Settings from "./components/settings/Settings";
import Flashcards from "./components/flashcards/Flashcards";
import SpotifyWidget from "./components/spotify/SpotifyWidget";
import Nova from "./components/nova/Nova";

function AppLayout() {
  const { user, username } = useAuth() as any;
  const location = useLocation();

  if (!user) return <Login />;
  if (!username) return <SetUsername />;

  const hideSidebar = ["/login", "/set-username"].includes(location.pathname);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg, #fef3c7 0%, #fde8e1 50%, #fce7f3 100%)", backgroundAttachment: "fixed" }}>
      {!hideSidebar && <Sidebar />}
      <div style={{ flex: 1, marginLeft: hideSidebar ? 0 : "240px", minHeight: "100vh", background: "transparent" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/studyroom" element={<StudyRoom />} />
          <Route path="/studyroom/:roomId" element={<StudyRoom />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/habits" element={<HabitTracker />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/messaging" element={<Messaging />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/alarm" element={<Alarm />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/nova" element={<Nova />} />
        </Routes>
      </div>
      <SpotifyWidget />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}