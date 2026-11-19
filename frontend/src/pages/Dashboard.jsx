import { useEffect,useState } from "react";
import { api } from "../services/api";
import { BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,PieChart,Pie,Cell } from "recharts";
export default function Dashboard(){
  const [data,setData]=useState(null);useEffect(()=>{api.get("/dashboard").then(r=>setData(r.data)).catch(()=>setData(null))},[]);
  if(!data)return <div className="panel">Loading dashboard...</div>;
  const cards=[["Total students",data.counts.students],["Total subjects",data.counts.subjects],["Marks records",data.counts.marks],["Class average",`${data.counts.overallAverage}%`],["Highest",data.highest?.name||"—"],["Needs attention",data.counts.attentionCount]];
  return <><div className="page-heading"><div><small>OVERVIEW</small><h1>Performance overview</h1></div></div>
    <div className="kpi-grid">{cards.map(([label,value])=><div className="kpi" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="chart-grid">
      <div className="panel"><h2>Subject averages</h2><ResponsiveContainer width="100%" height={260}><BarChart data={data.subjectAverages}><XAxis dataKey="subject"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="average" fill="#8274e8" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="panel"><h2>Semester trend</h2><ResponsiveContainer width="100%" height={260}><LineChart data={data.semesterAverages}><XAxis dataKey="semester"/><YAxis domain={[0,100]}/><Tooltip/><Line type="monotone" dataKey="average" stroke="#68b89e" strokeWidth={3}/></LineChart></ResponsiveContainer></div>
      <div className="panel"><h2>Top 5 students</h2><ResponsiveContainer width="100%" height={260}><BarChart layout="vertical" data={data.topStudents}><XAxis type="number" domain={[0,100]}/><YAxis type="category" dataKey="name" width={90}/><Tooltip/><Bar dataKey="average" fill="#68b89e" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>
      <div className="panel"><h2>Score distribution</h2><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={data.distribution} dataKey="count" nameKey="label" outerRadius={90}>{data.distribution.map((_,i)=><Cell key={i} fill={["#8274e8","#68b89e","#f4b75d","#e77979"][i%4]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
    </div>
    <div className="panel"><h2>Recent marks entries</h2><div className="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Semester</th><th>Score</th><th>Percent</th></tr></thead><tbody>{data.recent.map(r=><tr key={r.id}><td>{r.name}<small>{r.roll_no}</small></td><td>{r.subject}</td><td>{r.semester}</td><td>{r.marks}/{r.max_marks}</td><td>{r.percentage}%</td></tr>)}</tbody></table></div></div>
  </>
}
