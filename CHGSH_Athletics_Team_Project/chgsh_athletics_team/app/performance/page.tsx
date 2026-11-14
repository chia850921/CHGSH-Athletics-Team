
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PerformancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecords() {
    setLoading(true);
    setError("");

    if (!supabase) {
      setError("Supabase 尚未初始化");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("performance_results")
      .select("*")
      .limit(200);

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const columns = records.length > 0
    ? Object.keys(records[0])
    : [];

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1>成績分析</h1>
      <p>選手競賽成績與個人最佳紀錄</p>

      <button onClick={loadRecords}>
        重新整理
      </button>

      {loading && <p>資料載入中...</p>}

      {error && (
        <p style={{ color: "red" }}>
          載入失敗：{error}
        </p>
      )}

      {!loading && !error && records.length === 0 && (
        <p>目前尚無成績資料。</p>
      )}

      {!loading && records.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{ borderBottom: "1px solid #ccc", padding: 10, textAlign: "left" }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={record.id || index}>
                  {columns.map((column) => (
                    <td
                      key={column}
                      style={{ borderBottom: "1px solid #eee", padding: 10 }}
                    >
                      {typeof record[column] === "object"
                        ? JSON.stringify(record[column])
                        : String(record[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 20, color: "#777" }}>
        目前顯示最多 200 筆成績資料。
      </p>
    </main>
  );
}
