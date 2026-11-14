
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Athlete = {
  id: string;
  name: string;
};

type Performance = {
  id: string;
  athlete_id: string;
  record_date: string;
  record_type: string;
  event: string;
  result: number | string;
  wind?: number | null;
  competition_name?: string | null;
  notes?: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  border: "1px solid #ccc",
  borderRadius: 6,
  marginTop: 5,
  marginBottom: 12,
};

const events = ["100m", "200m", "400m", "800m", "1500m", "400H", "跳遠", "跳高", "鉛球", "鐵餅", "標槍"];

function isFieldEvent(event: string) {
  return ["跳", "鉛球", "鐵餅", "標槍"].some((word) =>
    event.includes(word)
  );
}

export default function PerformancePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [records, setRecords] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [athleteId, setAthleteId] = useState("");
  const [recordDate, setRecordDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [recordType, setRecordType] = useState("正式比賽");
  const [event, setEvent] = useState("100m");
  const [result, setResult] = useState("");
  const [wind, setWind] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [notes, setNotes] = useState("");

  async function loadRecords() {
    if (!supabase) {
      setError("Supabase 尚未初始化");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [athleteResponse, recordResponse] = await Promise.all([
      supabase.from("athletes").select("id, name").order("name"),
      supabase
        .from("performance_results")
        .select("*")
        .order("record_date", { ascending: false })
        .limit(500),
    ]);

    if (athleteResponse.error) {
      setError("選手資料讀取失敗：" + athleteResponse.error.message);
    } else {
      setAthletes(athleteResponse.data || []);
    }

    if (recordResponse.error) {
      setError("成績資料讀取失敗：" + recordResponse.error.message);
    } else {
      setRecords((recordResponse.data || []) as Performance[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);
    async function deleteRecord(id: string) {
    if (!supabase) {
      setError("Supabase 尚未初始化");
      return;
    }

    if (!window.confirm("確定要刪除這筆成績嗎？刪除後無法復原。")) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("performance_results")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("刪除失敗：" + deleteError.message);
      return;
    }

    setMessage("成績已刪除");
    await loadRecords();
  }

  async function saveRecord() {
    if (!supabase) {
      setError("Supabase 尚未初始化");
      return;
    }

    if (!athleteId || !recordDate || !event || !result.trim()) {
      setError("請填寫選手、日期、項目及成績");
      return;
    }

    const numericResult = Number(result);
    const numericWind = wind.trim() === "" ? null : Number(wind);

    if (!Number.isFinite(numericResult) || numericResult <= 0) {
      setError("成績必須是大於 0 的數字");
      return;
    }

    if (numericWind !== null && !Number.isFinite(numericWind)) {
      setError("風速格式不正確");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      athlete_id: athleteId,
      record_date: recordDate,
    result_date: recordDate,
      record_type: recordType,
      event,
      result: numericResult,
      wind: numericWind,
      competition_name: competitionName || null,
      notes: notes || null,
    
    };

    const { error: saveError } = await supabase
      .from("performance_results")
      .insert(payload);

    if (saveError) {
      setError("儲存失敗：" + saveError.message);
    } else {
      setMessage("成績新增成功！");
      setResult("");
      setWind("");
      setCompetitionName("");
      setNotes("");
      await loadRecords();
    }

    setSaving(false);
  }

  function getAthleteName(id: string) {
    return athletes.find((athlete) => athlete.id === id)?.name || "未知選手";
  }

  const personalBests = records.reduce((best, record) => {
    if (!record.athlete_id || !record.event || record.result == null) {
      return best;
    }

    const key = `${record.athlete_id}-${record.event}`;
    const value = Number(record.result);

    if (!Number.isFinite(value)) return best;

    const previous = best[key];

    if (
      !previous ||
      (isFieldEvent(record.event)
        ? value > previous.value
        : value < previous.value)
    ) {
      best[key] = {
        athlete: getAthleteName(record.athlete_id),
        event: record.event,
        value,
      };
    }

    return best;
  }, {} as Record<string, { athlete: string; event: string; value: number }>);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1>選手成績分析</h1>
      <p>正式比賽與平常測驗成績管理</p>

      <button onClick={loadRecords} style={{ padding: "8px 16px" }}>
        重新整理
      </button>

      <section style={{ marginTop: 25, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2>新增成績</h2>

        <label>選手</label>
        <select
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
          style={inputStyle}
        >
          <option value="">請選擇選手</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>

        <label>紀錄類型</label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
          style={inputStyle}
        >
          <option value="正式比賽">正式比賽</option>
          <option value="平常測驗">平常測驗</option>
        </select>

        <label>日期</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          style={inputStyle}
        />

        <label>比賽項目</label>
        <select
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          style={inputStyle}
        >
          {events.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <label>成績（秒／公尺）</label>
        <input
          type="number"
          step="0.01"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="例如：12.35 或 5.20"
          style={inputStyle}
        />

        <label>風速（m/s，沒有可留空）</label>
        <input
          type="number"
          step="0.1"
          value={wind}
          onChange={(e) => setWind(e.target.value)}
          placeholder="例如：+1.2"
          style={inputStyle}
        />

        <label>比賽名稱／測驗名稱</label>
        <input
          value={competitionName}
          onChange={(e) => setCompetitionName(e.target.value)}
          placeholder="例如：縣市中等學校運動會"
          style={inputStyle}
        />

        <label>備註</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="其他紀錄"
          style={{ ...inputStyle, minHeight: 70 }}
        />

        <button
          onClick={saveRecord}
          disabled={saving}
          style={{ padding: "10px 22px", cursor: "pointer" }}
        >
          {saving ? "儲存中..." : "儲存成績"}
        </button>

        {message && <p style={{ color: "green" }}>{message}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>選手個人最佳成績 PB</h2>

        {Object.keys(personalBests).length === 0 ? (
          <p>目前尚無成績資料。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: 10, borderBottom: "1px solid #ccc" }}>選手</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #ccc" }}>項目</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #ccc" }}>PB</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(personalBests).map(([key, item]) => (
                  <tr key={key}>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{item.athlete}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{item.event}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>歷史成績紀錄</h2>

        {loading ? (
          <p>資料載入中...</p>
        ) : records.length === 0 ? (
          <p>目前尚無成績資料。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["日期", "選手", "類型", "項目", "成績", "風速", "比賽名稱", "備註", "操作"].map((title) => (
                    <th key={title} style={{ padding: 10, borderBottom: "1px solid #ccc", textAlign: "left" }}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
  <tr key={record.id}>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.record_date || "—"}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{getAthleteName(record.athlete_id)}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.record_type || "—"}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.event}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.result}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.wind ?? "—"}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.competition_name || "—"}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{record.notes || "—"}</td>
    <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
      <button
        type="button"
        onClick={() => deleteRecord(record.id)}
        style={{ color: "#dc2626", cursor: "pointer" }}
      >
        刪除
      </button>
    </td>
  </tr>
))}
