import { useState } from "react";
import { useAuth } from "../context/AuthContext";
export default function Login(){
  const {login}=useAuth(); const [form,setForm]=useState({username:"",password:""}); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{await login(form.username,form.password)}catch(err){setError(err.response?.data?.message||"Unable to sign in")}finally{setBusy(false)}};
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand"><span>C</span><div>clearview<small>STUDENT INSIGHTS</small></div></div><small className="eyebrow">WELCOME BACK</small><h1>Good to see you.</h1><p>Sign in to view academic performance and insights.</p>{error&&<div className="alert error">{error}</div>}<label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></label><button className="primary" disabled={busy}>{busy?"Signing in...":"Sign in →"}</button></form></div>
}
