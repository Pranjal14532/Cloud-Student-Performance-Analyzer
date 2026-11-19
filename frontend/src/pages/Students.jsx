import { useEffect,useState } from "react";
import { api } from "../services/api";
export default function Students(){
  const [rows,setRows]=useState([]),[search,setSearch]=useState(""),[semester,setSemester]=useState(""),[form,setForm]=useState({rollNo:"",name:"",email:""}),[busy,setBusy]=useState(false);
  const load=()=>api.get("/students",{params:{search,semester}}).then(r=>setRows(r.data.rows));
  useEffect(load,[search,semester]);
  const add=async e=>{e.preventDefault();setBusy(true);try{await api.post("/students",form);setForm({rollNo:"",name:"",email:""});load()}finally{setBusy(false)}};
  const remove=async id=>{if(confirm("Delete this student and all linked marks?")){await api.delete(`/students/${id}`);load()}};
  return <><div className="page-heading"><div><small>PEOPLE</small><h1>Students</h1></div></div><div className="split">
    <form className="panel" onSubmit={add}><h2>Add student</h2><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Roll number<input value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} required/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><button className="primary" disabled={busy}>Create student</button></form>
    <div className="panel"><div className="filters"><input placeholder="Search name or roll number" value={search} onChange={e=>setSearch(e.target.value)}/><input placeholder="Filter semester" value={semester} onChange={e=>setSemester(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll number</th><th>Email</th><th>Marks</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.roll_no}</td><td>{r.email||"—"}</td><td>{r.marks_count}</td><td><button className="danger" onClick={()=>remove(r.id)}>Delete</button></td></tr>)}</tbody></table></div></div>
  </div></>
}
