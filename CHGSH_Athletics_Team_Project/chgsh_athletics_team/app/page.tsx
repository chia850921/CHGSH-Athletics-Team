"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";

type Profile = { id: string; display_name: string | null; role: "coach" | "athlete"; approved: boolean };
type Athlete = { id: string; user_id: string | null; name: string; events: string[] | null };
type RecordRow = {
  id: string; training_date: string; athlete_id: string; athlete_name?: string;
  event: string; content: string; sets: string | null; reps: string | null;
  result: string | null; rest: string | null; intensity: string | null;
  attendance: string; feedback: string | null; is_public: boolean;
};

const events = ["100公尺","200公尺","400公尺","400公尺跨欄","跳遠","鐵餅","鉛球","體能","重量訓練","復健"];
const initialForm = { training_date: new Date().toISOString().slice(0,10), athlete_id:"", event:"400公尺", content:"", sets:"", reps:"", result:"", rest:"", intensity:"中", attendance:"出席", feedback:"", is_public:false };

export default function Home() {
  const [sessionUser,setSessionUser] = useState<any>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [athletes,setAthletes] = useState<Athlete[]>([]);
  const [records,setRecords] = useState<RecordRow[]>([]);
  const [tab,setTab] = useState("dashboard");
  const [form,setForm] = useState(initialForm);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [authMode,setAuthMode] = useState<"login"|"signup">("login");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [displayName,setDisplayName] = useState("");

  const ready = !!supabase;
  const isCoach = profile?.role === "coach" && profile.approved;
  const ownAthlete = athletes.find(a=>a.user_id===sessionUser?.id);
  const visibleRecords = useMemo(()=>isCoach ? records : records.filter(r=>r.athlete_id===ownAthlete?.id || r.is_public),[records,isCoach,ownAthlete]);

  async function loadData(userId:string) {
    if(!supabase) return;
    const {data:p} = await supabase.from("profiles").select("*").eq("id",userId).single();
    setProfile(p as Profile|null);
    const {data:a} = await supabase.from("athletes").select("id,user_id,name,events").order("name");
    setAthletes((a||[]) as Athlete[]);
    const {data:r,error:e} = await supabase.from("training_records").select("*, athletes(name)").order("training_date",{ascending:false}).limit(500);
    if(e) setError(e.message);
    setRecords((r||[]).map((x:any)=>({...x,athlete_name:x.athletes?.name})) as RecordRow[]);
  }

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>{
      setSessionUser(data.session?.user||null);
      if(data.session?.user) loadData(data.session.user.id);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      setSessionUser(session?.user||null);
      if(session?.user) setTimeout(()=>loadData(session.user.id),0);
      else {setProfile(null);setRecords([]);setAthletes([]);}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function signIn(e:React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    if(!supabase) return;
    const result = authMode==="login"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{data:{display_name:displayName,role:"athlete"}}});
    if(result.error) setError(result.error.message);
    else if(authMode==="signup") setMessage("註冊申請已送出。請依 Supabase 郵件設定完成驗證，並等待教練建立／核准選手資料。");
  }

  async function signOut(){await supabase?.auth.signOut();}
  async function saveRecord(e:React.FormEvent){
    e.preventDefault();setError("");setMessage("");
    if(!supabase || !isCoach){setError("只有已核准教練可以新增正式紀錄。");return;}
    if(!form.athlete_id || !form.content){setError("請選擇選手並填寫訓練內容。");return;}
    const payload={...form,sets:form.sets||null,reps:form.reps||null,result:form.result||null,rest:form.rest||null,feedback:form.feedback||null,created_by:sessionUser.id};
    const {error:e2}=await supabase.from("training_records").insert(payload);
    if(e2)setError(e2.message);else{setMessage("訓練紀錄已儲存。");setForm({...initialForm,training_date:form.training_date});await loadData(sessionUser.id);}
  }
  async function togglePublic(row:RecordRow){
    if(!supabase||!isCoach)return;
    const {error:e}=await supabase.from("training_records").update({is_public:!row.is_public}).eq("id",row.id);
    if(e)setError(e.message);else await loadData(sessionUser.id);
  }
  function exportCsv(){
    const rows=visibleRecords.map(r=>({"日期":r.training_date,"選手":r.athlete_name||"","項目":r.event,"訓練內容":r.content,"組數":r.sets||"","趟數":r.reps||"","成績／秒數":r.result||"","休息":r.rest||"","強度":r.intensity||"","出席":r.attendance,"回饋":r.feedback||"","公開":r.is_public?"是":"否"}));
    const ws=XLSX.utils.json_to_sheet(rows);const csv=XLSX.utils.sheet_to_csv(ws);
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    download(blob,"CHGSH_training_records.csv");
  }
  function exportExcel(){
    const rows=visibleRecords.map(r=>({"日期":r.training_date,"選手":r.athlete_name||"","項目":r.event,"訓練內容":r.content,"組數":r.sets||"","趟數":r.reps||"","成績／秒數":r.result||"","休息":r.rest||"","強度":r.intensity||"","出席":r.attendance,"回饋":r.feedback||"","公開":r.is_public?"是":"否"}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"訓練紀錄");XLSX.writeFile(wb,"CHGSH_training_records.xlsx");
  }
  function exportPdf(){
    const doc=new jsPDF({orientation:"landscape"});
    doc.setFont("helvetica");doc.text("CHGSH Athletics Team - Training Records",14,14);
    autoTable(doc,{startY:22,head:[["Date","Athlete","Event","Training","Sets","Reps","Result","Attendance"]],body:visibleRecords.map(r=>[r.training_date,r.athlete_name||"",r.event,r.content,r.sets||"",r.reps||"",r.result||"",r.attendance]),styles:{fontSize:8}});
    doc.save("CHGSH_training_records.pdf");
  }
  function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

  if(!ready)return <main className="shell"><div className="login card"><h1>CHGSH Athletics Team</h1><div className="error">尚未設定 Supabase 環境變數。請依專案 README 完成設定。</div></div></main>;
  if(!sessionUser)return <main className="shell"><div className="login"><div className="top"><div><div className="brand">CHGSH ATHLETICS TEAM</div><div className="sub">TRAINING MANAGEMENT PLATFORM</div></div><span className="pill">TEAM PORTAL</span></div><div className="card section"><h2>{authMode==="login"?"登入系統":"選手註冊"}</h2><p className="muted">教練與選手使用個人帳號登入。</p><form onSubmit={signIn} className="formgrid">{authMode==="signup"&&<div className="field wide"><label>姓名</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} required/></div>}<div className="field wide"><label>電子郵件</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field wide"><label>密碼</label><input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></div><div className="wide actions"><button className="btn primary" type="submit">{authMode==="login"?"登入":"建立選手帳號"}</button><button type="button" className="btn" onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>{authMode==="login"?"首次使用？選手註冊":"返回登入"}</button></div></form>{error&&<p className="error">{error}</p>}{message&&<p className="success">{message}</p>}<p className="muted small">註冊不會自動取得教練權限，須由管理者核准。</p></div></div></main>;

  if(!profile || !profile.approved)return <main className="shell"><div className="top"><div><div className="brand">CHGSH ATHLETICS TEAM</div><div className="sub">ACCOUNT REVIEW</div></div><button className="btn" onClick={signOut}>登出</button></div><div className="card section"><h2>帳號等待核准</h2><p>你的帳號已登入，但尚未完成教練核准或選手資料綁定。請聯絡教練協助設定。</p></div></main>;

  return <main className="shell">
    <header className="top"><div><div className="brand">CHGSH ATHLETICS TEAM</div><div className="sub">TRAINING · PERFORMANCE · TEAM</div></div><div className="right"><span className="pill">{isCoach?"COACH":"ATHLETE"} · {profile.display_name||sessionUser.email}</span><button className="btn" onClick={signOut}>登出</button></div></header>
    <nav className="tabs">{[["dashboard","總覽"],["records","訓練紀錄"],...(isCoach?[["entry","新增紀錄"],["athletes","選手名單"]]:[])].map(([k,v])=><button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{v}</button>)}</nav>
    {error&&<p className="error">{error}</p>}{message&&<p className="success">{message}</p>}
    {tab==="dashboard"&&<><div className="grid"><div className="card"><div className="muted">可見訓練紀錄</div><div className="stat">{visibleRecords.length}</div></div><div className="card"><div className="muted">選手人數</div><div className="stat">{isCoach?athletes.length:1}</div></div><div className="card"><div className="muted">本週紀錄</div><div className="stat">{visibleRecords.filter(r=>r.training_date>=weekStart()).length}</div></div><div className="card"><div className="muted">系統身分</div><div className="stat" style={{fontSize:20}}>{isCoach?"教練":"選手"}</div></div></div><section className="card section"><h2>最近訓練紀錄</h2><RecordsTable rows={visibleRecords.slice(0,8)} isCoach={isCoach} onToggle={togglePublic}/></section></>}
    {tab==="entry"&&isCoach&&<section className="card"><h2>新增每日訓練紀錄</h2><form onSubmit={saveRecord} className="formgrid"><div className="field"><label>日期</label><input type="date" value={form.training_date} onChange={e=>setForm({...form,training_date:e.target.value})}/></div><div className="field"><label>選手</label><select value={form.athlete_id} onChange={e=>setForm({...form,athlete_id:e.target.value})} required><option value="">請選擇</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><div className="field"><label>訓練項目</label><select value={form.event} onChange={e=>setForm({...form,event:e.target.value})}>{events.map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>訓練強度</label><select value={form.intensity} onChange={e=>setForm({...form,intensity:e.target.value})}>{["低","中","高","測驗／比賽"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field wide"><label>訓練內容</label><input placeholder="例：400m × 6，控制配速" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} required/></div><div className="field"><label>組數</label><input value={form.sets} onChange={e=>setForm({...form,sets:e.target.value})} placeholder="例：2組"/></div><div className="field"><label>趟數／次數</label><input value={form.reps} onChange={e=>setForm({...form,reps:e.target.value})} placeholder="例：6趟"/></div><div className="field"><label>秒數／測驗成績</label><input value={form.result} onChange={e=>setForm({...form,result:e.target.value})} placeholder="例：70.5秒"/></div><div className="field"><label>休息時間</label><input value={form.rest} onChange={e=>setForm({...form,rest:e.target.value})} placeholder="例：2–3分鐘"/></div><div className="field"><label>出席</label><select value={form.attendance} onChange={e=>setForm({...form,attendance:e.target.value})}>{["出席","缺席","公假","傷病調整","自主訓練"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>公開給全隊查看</label><select value={String(form.is_public)} onChange={e=>setForm({...form,is_public:e.target.value==="true"})}><option value="false">否（僅教練及本人）</option><option value="true">是</option></select></div><div className="field wide"><label>教練觀察／選手回饋</label><textarea value={form.feedback} onChange={e=>setForm({...form,feedback:e.target.value})} placeholder="疲勞、技術觀察、完成情況；避免填寫不必要的敏感健康資訊"/></div><div className="wide actions"><button className="btn primary" type="submit">儲存訓練紀錄</button><button className="btn" type="button" onClick={()=>setForm(initialForm)}>清空</button></div></form></section>}
    {tab==="records"&&<section className="card"><div className="right" style={{justifyContent:"space-between",marginBottom:12}}><h2>訓練紀錄</h2><div className="right"><button className="btn" onClick={exportCsv}>CSV</button><button className="btn" onClick={exportExcel}>Excel</button><button className="btn dark" onClick={exportPdf}>PDF</button></div></div><RecordsTable rows={visibleRecords} isCoach={isCoach} onToggle={togglePublic}/></section>}
    {tab==="athletes"&&isCoach&&<section className="card"><h2>選手名單</h2><div className="tablewrap"><table><thead><tr><th>姓名</th><th>訓練項目</th><th>帳號綁定</th></tr></thead><tbody>{athletes.map(a=><tr key={a.id}><td>{a.name}</td><td>{(a.events||[]).join("、")||"未設定"}</td><td>{a.user_id?"已綁定":"尚未綁定"}</td></tr>)}</tbody></table></div><p className="muted small">新增或綁定選手帳號請依 README 的管理步驟操作，避免錯誤授權。</p></section>}
    <p className="muted small" style={{textAlign:"center",marginTop:24}}>CHGSH Athletics Team · 僅供授權隊員使用</p>
  </main>;
}

function weekStart(){const d=new Date();const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d.toISOString().slice(0,10)}
function RecordsTable({rows,isCoach,onToggle}:{rows:RecordRow[];isCoach:boolean;onToggle:(r:RecordRow)=>void}){
  if(!rows.length)return <div className="empty">目前沒有可顯示的紀錄</div>;
  return <div className="tablewrap"><table><thead><tr><th>日期</th><th>選手</th><th>項目</th><th>內容</th><th>成績</th><th>出席</th>{isCoach&&<th>公開</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.training_date}</td><td>{r.athlete_name||"—"}</td><td>{r.event}</td><td>{r.content}<div className="muted small">{[r.sets,r.reps,r.rest,r.intensity].filter(Boolean).join(" · ")}</div>{r.feedback&&<div className="muted small">{r.feedback}</div>}</td><td>{r.result||"—"}</td><td>{r.attendance}</td>{isCoach&&<td><button className="btn" onClick={()=>onToggle(r)}>{r.is_public?"取消公開":"設為公開"}</button></td>}</tr>)}</tbody></table></div>;
}