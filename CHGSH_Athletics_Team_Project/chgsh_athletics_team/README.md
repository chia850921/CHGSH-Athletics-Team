# CHGSH Athletics Team

田徑隊訓練紀錄與成績管理網站（Next.js + Supabase）。

## 目前包含
- Email / password 註冊與登入
- 新註冊帳號一律是待核准選手，不能自行取得教練權限
- 教練新增每日訓練紀錄
- 選手查看自己的紀錄及教練公開的紀錄
- 教練切換訓練紀錄是否公開
- CSV / Excel / PDF 匯出
- Supabase Row Level Security (RLS) 權限政策
- 復健紀錄獨立資料表，僅核准教練可讀寫

## 免費部署需要自行建立的帳號
1. Supabase：建立專案（選擇免費方案）。
2. Vercel：用 GitHub 帳號登入，匯入本專案部署。
3. GitHub：建立私人 repository，上傳本專案。

服務商免費方案可能有休眠、用量、檔案或功能限制，正式使用前請查看當時方案條款。不要把 Supabase service_role key 放到前端或提交到 GitHub。

## 本機測試
需要 Node.js 20 或更新版本。

```bash
npm install
cp .env.example .env.local
```

將 Supabase 專案的 Project URL 與 anon/public key 填入 `.env.local`，再執行：

```bash
npm run dev
```

開啟 http://localhost:3000

## Supabase 設定
1. 在 Supabase 建立新 project。
2. 進入 SQL Editor，執行 `supabase/schema.sql` 全部內容。
3. 到 Project Settings → API，複製 Project URL 與 anon/public key。
4. 把兩個值填入 `.env.local`（部署到 Vercel 時也要設定相同 Environment Variables）。
5. Authentication → URL Configuration 設定 Site URL 與 Redirect URLs。
6. 建議先關閉公開註冊以外的非必要登入方式；啟用 Email confirmation，並設定寄件郵件服務。
7. 先用你的電子郵件註冊一個帳號。到 Authentication → Users 找到該帳號 UUID。
8. 在 SQL Editor 執行以下語句，將該帳號設為教練（請替換 UUID）：

```sql
update public.profiles
set role='coach', approved=true
where id='YOUR_AUTH_USER_UUID';
```

9. 以教練帳號重新登入，教練可管理選手名單。初次建議先在 SQL Editor 建立名單：

```sql
insert into public.athletes(name, events) values
('京', array['100公尺','200公尺']),
('溱', array['依醫療／復健許可安排']),
('綺', array['400公尺','200公尺']),
('妍', array['400公尺跨欄','400公尺']),
('宣', array['400公尺跨欄']),
('彤', array['跳遠','4×400接力']),
('妘', array['跳遠']),
('安', array['鐵餅']),
('謝', array['鉛球']);
```

## 選手帳號綁定
選手完成註冊後，管理者需核對身分，再將帳號綁定到正確選手資料。可在 Supabase SQL Editor 執行（兩個 UUID 都要核對）：

```sql
update public.athletes
set user_id='ATHLETE_PROFILE_UUID'
where id='ATHLETE_ROW_UUID';
```

選手註冊後 profiles.approved 預設為 false。由教練核對後核准：

```sql
update public.profiles
set approved=true
where id='ATHLETE_PROFILE_UUID' and role='athlete';
```

## 權限原則
- 教練角色由資料庫管理者手動授予；前端註冊不能選教練。
- 選手可讀自己的訓練紀錄、自己的成績，以及教練標記為公開的全隊紀錄／成績。
- 選手不可新增或修改正式訓練紀錄及正式成績。
- 復健資料表僅核准教練可讀寫。對未成年選手，蒐集健康／復健資料前應確認學校規範、監護人及必要授權，避免記錄不必要的診斷細節。
- 不要將 anon key 以外的秘密金鑰放入 `NEXT_PUBLIC_` 環境變數。

## 重要限制
此專案是可部署的 MVP 起始版本，不是已經上線的網站。完成部署、網域設定、Email 寄送設定、教練帳號核准、選手帳號綁定與實際權限測試後，才可提供隊員正式使用。建議先以測試帳號驗證：教練可看全隊、選手只能看自己的私人資料及公開資料。
