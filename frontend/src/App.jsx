import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./layouts/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Marks from "./pages/Marks";
import Users from "./pages/Users";
import ImportData from "./pages/ImportData";
import Reports from "./pages/Reports";
import StudentPerformance from "./pages/StudentPerformance";

function Protected({children,admin=false}) {
  const {user,loading}=useAuth();
  if(loading)return <div className="loading">Loading workspace...</div>;
  if(!user)return <Navigate to="/login" replace />;
  if(admin&&user.role!=="admin")return <Navigate to="/performance" replace />;
  return children;
}
export default function App(){
  const {user}=useAuth();
  return <Routes>
    <Route path="/login" element={user?<Navigate to="/"/>:<Login/>}/>
    <Route element={<Protected><Layout/></Protected>}>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/students" element={<Protected admin><Students/></Protected>}/>
      <Route path="/users" element={<Protected admin><Users/></Protected>}/>
      <Route path="/marks" element={<Marks/>}/>
      <Route path="/import" element={<Protected admin><ImportData/></Protected>}/>
      <Route path="/reports" element={<Reports/>}/>
      <Route path="/performance" element={<StudentPerformance/>}/>
      <Route path="/analytics" element={<Protected admin><Dashboard/></Protected>}/>      
      <Route path="/profile" element={<StudentPerformance/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
