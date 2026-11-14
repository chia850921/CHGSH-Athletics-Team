
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Athlete = {
  id: string;
  name: string;
};

type TrainingRecord = {
  id: string;
  athlete_id: string;
  training_date: string;
  content: string | null;
  sets: string | null;
  distance: string | null;
  time: string | null;
  rest: string | null;
  notes: string | null;
};

const emptyForm = {
  athlete_id: "",
  training_date: new Date().toLocaleDateString("en-CA"),
  content: "",
  sets: "",
  distance: "",
  time: "",
  rest: "",
  notes: "",
};

export default function TrainingPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterAthlete, setFilterAthlete] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAthletes() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("athletes")
      .select("id, name")
      .order("name");

    if (error) {
      setMessage("選手名單讀取失敗：" + error.message);
    } else {
      setAthletes(data || []);
      if (data?.length && !form.athlete_id) {
        setForm((old) => ({ ...old, athlete_id: data[0].id }));
      }
    }

    setLoading(false);
  }

  async function loadRecords() {
    if (!supabase) return;

    let query = supabase
      .from("training_records")
      .select("*")
      .order("training_date", { ascending: false });

    if (filterAthlete) {
      query = query.eq("athlete_id", filterAthlete);
    }

    if (startDate) {
      query = query.gte("training_date", startDate);
    }

    if (endDate) {
      query = query.lte("training_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      setMessage("紀錄讀取失敗：" + error.message);
    } else {
      setRecords(data || []);
    }
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [filterAthlete, startDate, endDate]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function saveRecord(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) return;

    setSaving(true);
    setMessage("");

    const recordData = {
      athlete_id: form.athlete_id,
      training_date: form.training_date,
      content: form.content,
      sets: form.sets,
      distance: form.distance,
      time: form.time,
      rest: form.rest,
      notes: form.notes,
    };

    const result = editingId
      ? await supabase
          .from("training_records")
          .update(recordData)
          .eq("id", editingId)
      : await supabase
          .from("training_records")
          .insert(recordData);

    if (result.error) {
      setMessage("儲存失敗：" + result.error.message);
    } else {
      setMessage(editingId ? "訓練紀錄修改成功！" : "訓練紀錄新增成功！");
      setEditingId(null);
      setForm({
        ...emptyForm,
        athlete_id: form.athlete_id,
        training_date: form.training_date,
      });
      await loadRecords();
    }

    setSaving(false);
  }

  function editRecord(record: TrainingRecord) {
    setEditingId(record.id);
    setForm({
      athlete_id: record.athlete_id,
      training_date: record.training_date,
      content: record.content || "",
      sets: record.sets || "",
      distance: record.distance || "",
      time: record.time || "",
      rest: record.rest || "",
      notes: record.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(id: string) {
    if (!supabase) return;

    if (!window.confirm("確定要刪除這筆訓練紀錄嗎？")) return;

    const { error } = await supabase
      .from("training_records")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("刪除失敗：" + error.message);
    } else {
      setMessage("訓練紀錄已刪除。");
      await loadRecords();

      if (editingId === id) {
        cancelEdit();
      }
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      athlete_id: form.athlete_id,
    });
  }

  return (
    <main className="shell">
      <div className="card section">
        <h2>每日訓練紀錄</h2>
        <p className="muted">選手個別訓練紀錄管理</p>

        {loading ? (
          <p>載入選手名單中...</p>
        ) : athletes.length === 0 ? (
          <p>目前沒有選手資料，請先建立選手名單。</p>
        ) : (
          <>
            <h3>{editingId ? "修改訓練紀錄" : "新增訓練紀錄"}</h3>

            <form onSubmit={saveRecord} className="formgrid">
              <div className="field wide">
                <label>選手</label>
                <select
                  name="athlete_id"
                  value={form.athlete_id}
                  onChange={handleChange}
                  required
                >
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field wide">
                <label>訓練日期</label>
                <input
                  type="date"
                  name="training_date"
                  value={form.training_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field wide">
                <label>訓練內容</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="例如：400m × 6"
                  rows={3}
                  required
                />
              </div>

              <div className="field">
                <label>組數</label>
                <input
                  name="sets"
                  value={form.sets}
                  onChange={handleChange}
                  placeholder="例如：6組"
                />
              </div>

              <div className="field">
                <label>距離</label>
                <input
                  name="distance"
                  value={form.distance}
                  onChange={handleChange}
                  placeholder="例如：400m"
                />
              </div>

              <div className="field">
                <label>秒數／配速</label>
                <input
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  placeholder="例如：75秒"
                />
              </div>

              <div className="field">
                <label>休息時間</label>
                <input
                  name="rest"
                  value={form.rest}
                  onChange={handleChange}
                  placeholder="例如：3分鐘"
                />
              </div>

              <div className="field wide">
                <label>教練備註</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="例如：注意節奏、後段維持動作"
                  rows={3}
                />
              </div>

              <div className="wide">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={saving || !form.athlete_id}
                >
                  {saving ? "儲存中..." : editingId ? "儲存修改" : "新增訓練紀錄"}
                </button>

                {editingId && (
                  <button className="btn" type="button" onClick={cancelEdit}>
                    取消修改
                  </button>
                )}
              </div>
            </form>

            {message && <p>{message}</p>}

            <hr />

            <h3>訓練紀錄查詢</h3>

            <div className="formgrid">
              <div className="field wide">
                <label>依選手篩選</label>
                <select
                  value={filterAthlete}
                  onChange={(e) => setFilterAthlete(e.target.value)}
                >
                  <option value="">全部選手</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label>結束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="wide">
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setFilterAthlete("");
                    setStartDate("");
                    setEndDate("");
                  }}
                >
                  清除篩選
                </button>
              </div>
            </div>

            <h3>訓練歷史（{records.length} 筆）</h3>

            {records.length === 0 ? (
              <p className="muted">目前沒有符合條件的訓練紀錄。</p>
            ) : (
              records.map((record) => (
                <div
                  key={record.id}
                  className="field"
                  style={{ marginBottom: "12px" }}
                >
                  <strong>
                    {athletes.find((a) => a.id === record.athlete_id)?.name || "未知選手"}
                    {" — "}
                    {record.training_date}
                  </strong>
                  <p>訓練內容：{record.content || "—"}</p>
                  <p>組數：{record.sets || "—"}</p>
                  <p>距離：{record.distance || "—"}</p>
                  <p>秒數／配速：{record.time || "—"}</p>
                  <p>休息：{record.rest || "—"}</p>
                  {record.notes && <p>備註：{record.notes}</p>}

                  <button
                    className="btn"
                    type="button"
                    onClick={() => editRecord(record)}
                  >
                    編輯
                  </button>

                  <button
                    className="btn"
                    type="button"
                    onClick={() => deleteRecord(record.id)}
                  >
                    刪除
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {message && <p className="error">{message}</p>}
      </div>
    </main>
  );
}
