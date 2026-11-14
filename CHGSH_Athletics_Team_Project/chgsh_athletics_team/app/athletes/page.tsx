
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Athlete = {
  id: string;
  name: string;
  gender: string | null;
  grade: string | null;
  event: string | null;
  personal_best: string | null;
  notes: string | null;
};

type TrainingRecord = {
  id: string;
  training_date: string;
  content: string;
  sets: string | null;
  distance: string | null;
  time: string | null;
  rest: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  gender: "",
  grade: "",
  event: "",
  personal_best: "",
  notes: "",
};

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [history, setHistory] = useState<TrainingRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");

  async function loadAthletes() {
    if (!supabase) {
      setMessage("系統尚未連線。");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("讀取失敗：" + error.message);
    } else {
      setAthletes(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function saveAthlete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) return;

    setSaving(true);
    setMessage("");

    const athleteData = {
      name: form.name.trim(),
      gender: form.gender,
      grade: form.grade,
      event: form.event,
      personal_best: form.personal_best,
      notes: form.notes,
    };

    const result = editingId
      ? await supabase.from("athletes").update(athleteData).eq("id", editingId)
      : await supabase.from("athletes").insert(athleteData);

    if (result.error) {
      setMessage("儲存失敗：" + result.error.message);
    } else {
      setMessage(editingId ? "選手資料修改成功！" : "選手新增成功！");
      setForm(emptyForm);
      setEditingId(null);
      await loadAthletes();
    }

    setSaving(false);
  }

  function editAthlete(athlete: Athlete) {
    setEditingId(athlete.id);
    setForm({
      name: athlete.name,
      gender: athlete.gender || "",
      grade: athlete.grade || "",
      event: athlete.event || "",
      personal_best: athlete.personal_best || "",
      notes: athlete.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAthlete(id: string) {
    if (!supabase) return;

    if (!window.confirm("確定要刪除這位選手的資料嗎？")) return;

    const { error } = await supabase.from("athletes").delete().eq("id", id);

    if (error) {
      setMessage("刪除失敗：" + error.message);
    } else {
      setMessage("選手資料已刪除。");
      if (selectedAthlete?.id === id) {
        setSelectedAthlete(null);
        setHistory([]);
      }
      await loadAthletes();
    }
  }

  async function viewHistory(athlete: Athlete) {
    if (!supabase) return;

    setSelectedAthlete(athlete);
    setHistory([]);
    setHistoryMessage("");
    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("training_records")
      .select("id, training_date, content, sets, distance, time, rest, notes")
      .eq("athlete_id", athlete.id)
      .order("training_date", { ascending: false });

    if (error) {
      setHistoryMessage("讀取訓練歷程失敗：" + error.message);
    } else {
      setHistory(data || []);
      if (!data || data.length === 0) {
        setHistoryMessage("這位選手目前還沒有訓練紀錄。");
      }
    }

    setHistoryLoading(false);
  }

  return (
    <main className="shell">
      <div className="card section">
        <h2>選手管理</h2>
        <p className="muted">田徑隊選手基本資料管理</p>

        <h3>{editingId ? "修改選手資料" : "新增選手"}</h3>

        <form onSubmit={saveAthlete} className="formgrid">
          <div className="field wide">
            <label>姓名 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="請輸入選手姓名"
              required
            />
          </div>

          <div className="field">
            <label>性別</label>
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="">請選擇</option>
              <option value="女">女</option>
              <option value="男">男</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div className="field">
            <label>年級</label>
            <select name="grade" value={form.grade} onChange={handleChange}>
              <option value="">請選擇</option>
              <option value="高一">高一</option>
              <option value="高二">高二</option>
              <option value="高三">高三</option>
            </select>
          </div>

          <div className="field wide">
            <label>比賽項目</label>
            <input
              name="event"
              value={form.event}
              onChange={handleChange}
              placeholder="例如：100m、400m、400H、跳遠"
            />
          </div>

          <div className="field wide">
            <label>個人最佳成績（PB）</label>
            <input
              name="personal_best"
              value={form.personal_best}
              onChange={handleChange}
              placeholder="例如：100m 13.20秒"
            />
          </div>

          <div className="field wide">
            <label>備註</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="其他選手資料"
              rows={3}
            />
          </div>

          <div className="wide">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "儲存中..." : editingId ? "儲存修改" : "新增選手"}
            </button>

            {editingId && (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                取消修改
              </button>
            )}
          </div>
        </form>

        {message && <p>{message}</p>}

        <hr />

        <h3>田徑隊選手名單（{athletes.length} 人）</h3>

        {loading ? (
          <p>載入中...</p>
        ) : athletes.length === 0 ? (
          <p className="muted">目前尚無選手資料，請從上方新增。</p>
        ) : (
          athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="field"
              style={{ marginBottom: "12px" }}
            >
              <strong>{athlete.name}</strong>
              <p>性別：{athlete.gender || "未設定"}</p>
              <p>年級：{athlete.grade || "未設定"}</p>
              <p>項目：{athlete.event || "未設定"}</p>
              <p>PB：{athlete.personal_best || "未設定"}</p>
              {athlete.notes && <p>備註：{athlete.notes}</p>}

              <button
                className="btn"
                type="button"
                onClick={() => viewHistory(athlete)}
              >
                查看訓練歷程
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => editAthlete(athlete)}
              >
                編輯
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => deleteAthlete(athlete.id)}
              >
                刪除
              </button>
            </div>
          ))
        )}

        <button className="btn" type="button" onClick={loadAthletes}>
          重新整理
        </button>

        {selectedAthlete && (
          <section className="card section">
            <h2>{selectedAthlete.name}｜個人訓練歷程</h2>

            <button
              className="btn"
              type="button"
              onClick={() => {
                setSelectedAthlete(null);
                setHistory([]);
                setHistoryMessage("");
              }}
            >
              關閉歷程
            </button>

            {historyLoading ? (
              <p>訓練紀錄載入中...</p>
            ) : historyMessage ? (
              <p className="muted">{historyMessage}</p>
            ) : (
              <>
                <p className="muted">累積訓練紀錄：{history.length} 筆</p>

                {history.map((record) => (
                  <div
                    key={record.id}
                    className="field"
                    style={{ marginBottom: "12px" }}
                  >
                    <strong>{record.training_date}</strong>
                    <p>訓練內容：{record.content}</p>
                    <p>組數：{record.sets || "未填寫"}</p>
                    <p>距離：{record.distance || "未填寫"}</p>
                    <p>時間：{record.time || "未填寫"}</p>
                    <p>休息：{record.rest || "未填寫"}</p>
                    {record.notes && <p>備註：{record.notes}</p>}
                  </div>
                ))}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
