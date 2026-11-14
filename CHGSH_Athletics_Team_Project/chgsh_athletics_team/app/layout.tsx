import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHGSH Athletics Team",
  description: "田徑隊訓練與成績管理平台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}