
"use client";

import { useEffect, useState } from "react";
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

export default function WeeklyPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date())
  );
  const [filterAthlete, setFilterAthlete] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  async function loadData() {
    if (!supabase) {
      setMessage("資料庫尚未連線。");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: athleteData, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name")
      .order("name");

    if (athleteError) {
      setMessage("選手資料讀取失敗：" + athleteError.message);
      setLoading(false);
      return;
    }

    setAthletes(athleteData || []);

    let query = supabase
      .from("training_records")
      .select("*")
      .gte("training_date", formatDate(weekStart))
      .lte("training_date", formatDate(weekEnd))
      .order("training_date", { ascending: true });

    if (filterAthlete) {
      query = query.eq("athlete_id", filterAthlete);
    }

    const { data: recordData, error: recordError } = await query;

    if (recordError) {
      setMessage("訓練紀錄讀取失敗：" + recordError.message);
    } else {
      setRecords(recordData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [weekStart, filterAthlete]);

  function changeWeek(amount: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + amount * 7);
    setWeekStart(next);
  }

  const groupedRecords = records.reduce(
    (groups, record) => {
      if (!groups[record.training_date]) {
        groups[record.training_date] = [];
      }
      groups[record.training_date].push(record);
      return groups;
    },
    {} as Record<string, TrainingRecord[]>
  );

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return formatDate(date);
  });

  return (
    <main className="shell">
      <div className="card section">
        <h2>每週訓練總覽</h2>
        <p className="muted">查看全隊每週個別訓練紀錄</p>

        <div className="field">
          <label>選擇選手</label>
          <select
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
          >
            <option value="">全隊選手</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            margin: "20px 0",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            type="button"
            onClick={() => changeWeek(-1)}
          >
            上一週
          </button>

          <strong>
            {formatDate(weekStart)} ～ {formatDate(weekEnd)}
          </strong>

          <button
            className="btn"
            type="button"
            onClick={() => changeWeek(1)}
          >
            下一週
          </button>
        </div>

        <button
          className="btn"
          type="button"
          onClick={() => setWeekStart(getMonday(new Date()))}
        >
          回到本週
        </button>

        <hr />

        {loading ? (
          <p>載入訓練紀錄中...</p>
        ) : (
          <>
            <h3>本週共 {records.length} 筆訓練紀錄</h3>

            {weekDays.map((day, index) => {
              const dayRecords = groupedRecords[day] || [];
              const weekdayNames = [
                "星期一",
                "星期二",
                "星期三",
                "星期四",
                "星期五",
                "星期六",
                "星期日",
              ];

              return (
                <section key={day} style={{ marginBottom: "24px" }}>
                  <h3>
                    {day}（{weekdayNames[index]}）
                    <span className="muted">
                      {" "}・{dayRecords.length} 筆
                    </span>
                  </h3>

                  {dayRecords.length === 0 ? (
                    <p className="muted">尚無訓練紀錄</p>
                  ) : (
                    dayRecords.map((record) => {
                      const athlete = athletes.find(
                        (item) => item.id === record.athlete_id
                      );

                      return (
                        <div
                          key={record.id}
                          className="field"
                          style={{ marginBottom: "12px" }}
                        >
                          <strong>{athlete?.name || "未知選手"}</strong>
                          <p>訓練內容：{record.content || "—"}</p>
                          <p>組數：{record.sets || "—"}</p>
                          <p>距離：{record.distance || "—"}</p>
                          <p>秒數／配速：{record.time || "—"}</p>
                          <p>休息時間：{record.rest || "—"}</p>
                          {record.notes && (
                            <p>教練備註：{record.notes}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </section>
              );
            })}
          </>
        )}

        {message && <p className="error">{message}</p>}
      </div>
    </main>
  );
}
