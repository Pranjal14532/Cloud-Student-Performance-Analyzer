import { useState } from "react";
import { api } from "../services/api";
export default function ImportData(){
  const [file,setFile]=useState(null),[preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
  const previewRows=async()=>{if(!file)return;setBusy(true);try{const fd=new FormData();fd.append("file",file);setPreview((await api.post("/imports/preview",fd)).data)}finally{setBusy(false)}};
  const importRows=async()=>{if(!file)return;setBusy(true);try{const fd=new FormData();fd.append("file",file);setResult((await api.post("/imports/csv",fd)).data)}finally{setBusy(false)}};
  return <><div className="page-heading"><div><small>DATA</small><h1>CSV import</h1></div></div><div className="split"><div className="panel upload-panel"><h2>Upload marks</h2><input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files[0])}/><div className="actions"><button className="secondary" onClick={previewRows} disabled={!file||busy}>Preview rows</button><button className="primary" onClick={importRows} disabled={!file||busy}>Import valid rows</button></div></div><div className="panel"><h2>Required format</h2><code>roll_no,name,email,semester,subject,marks,max_marks</code></div></div>
  {preview&&<div className="panel"><h2>Preview</h2><p>{preview.accepted.length} accepted · {preview.rejected.length} rejected</p><div className="table-wrap"><table><thead><tr><th>Roll</th><th>Name</th><th>Subject</th><th>Marks</th></tr></thead><tbody>{preview.preview.map((r,i)=><tr key={i}><td>{r.rollNo}</td><td>{r.name}</td><td>{r.subject}</td><td>{r.marks}/{r.maxMarks}</td></tr>)}</tbody></table></div>{preview.rejected.length>0&&<div className="alert error">{preview.rejected.map((r,i)=><div key={i}>Row {r.row}: {r.reason}</div>)}</div>}</div>}
  {result&&<div className="panel"><h2>Import complete</h2><p>{result.imported} imported · {result.rejected.length} rejected</p></div>}</>
}
