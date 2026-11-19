import { useAuth } from "../context/AuthContext";
export default function Reports(){
  const {user}=useAuth();const base=import.meta.env.VITE_API_URL||"/api";
  const download=format=>window.open(`${base}/reports/export?format=${format}`,"_blank","noopener,noreferrer");
  return <><div className="page-heading"><div><small>REPORTS</small><h1>{user.role==="admin"?"Academic reports":"My reports"}</h1></div></div><div className="report-grid"><div className="panel"><h2>Excel workbook</h2><p>Structured academic records.</p><button className="primary" onClick={()=>download("xlsx")}>Download Excel</button></div><div className="panel"><h2>CSV export</h2><p>Filtered-compatible record export.</p><button className="primary" onClick={()=>download("csv")}>Download CSV</button></div><div className="panel"><h2>PDF report</h2><p>Printable academic summary.</p><button className="primary" onClick={()=>download("pdf")}>Download PDF</button></div></div></>
}
