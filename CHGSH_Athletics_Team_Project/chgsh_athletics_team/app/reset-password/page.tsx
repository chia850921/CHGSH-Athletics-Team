
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!supabase) {
      setError("系統尚未連線。");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("密碼修改成功！請返回登入頁面。");
      setPassword("");
    }
  }

  return (
    <main className="shell">
      <div className="login">
        <div className="card section">
          <h2>重設密碼</h2>
          <p className="muted">請輸入新的登入密碼。</p>

          <form onSubmit={updatePassword} className="formgrid">
            <div className="field wide">
              <label>新密碼（至少 8 個字元）</label>
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="wide">
              <button className="btn primary" type="submit">
                更新密碼
              </button>
            </div>
          </form>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
        </div>
      </div>
    </main>
  );
}
