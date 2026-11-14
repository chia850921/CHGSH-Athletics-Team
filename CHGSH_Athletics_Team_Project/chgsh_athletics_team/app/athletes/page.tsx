"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Athlete = {
  id: string;
  display_name: string;
  role: string;
  approved: boolean;
};

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAthletes() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, approved")
      .eq("role", "athlete")
      .order("display_name");

    if (error) {
      setMessage(error.message);
    } else {
      setAthletes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  return (
    <main className="shell">
      <div className="card section">
        <h2>選手管理</h2>
        <p className="muted">田徑隊選手帳號與權限管理</p>

        {loading ? (
          <p>載入中...</p>
        ) : (
          <div>
            {athletes.map((athlete) => (
              <div key={athlete.id} className="field">
                <strong>{athlete.display_name || "未設定姓名"}</strong>
                <p>角色：{athlete.role}</p>
                <p>狀態：{athlete.approved ? "已核准" : "待核准"}</p>
              </div>
            ))}
          </div>
        )}

        {message && <p className="error">{message}</p>}

        <button className="btn" onClick={loadAthletes}>
          重新整理
        </button>
      </div>
    </main>
  );
}
