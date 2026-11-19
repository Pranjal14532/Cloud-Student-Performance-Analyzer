import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function Layout(){
  const {user,logout}=useAuth();
  const admin=user?.role==="admin";
  const adminLinks=[["/","Overview"],["/students","Students"],["/users","User management"],["/marks","Marks"],["/import","Import data"],["/analytics","Analytics"],["/reports","Reports"]];
  const studentLinks=[["/","Dashboard"],["/performance","My performance"],["/marks","Subject & marks"],["/reports","My reports"],["/profile","Profile"]];
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>C</span><div>clearview<small>STUDENT INSIGHTS</small></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{(admin?adminLinks:studentLinks).map(([to,label])=><NavLink key={to} end={to==="/"} to={to}><span>{label}</span></NavLink>)}</nav>
      <button className="logout" onClick={logout}>Sign out</button>
    </aside>
    <main><header className="topbar"><div><small>ACADEMIC ANALYTICS</small><strong>{admin?"Administrator workspace":"Student workspace"}</strong></div><div className="user-chip">{user?.username}<small>{user?.role}</small></div></header><section className="content"><Outlet/></section></main>
  </div>
}
