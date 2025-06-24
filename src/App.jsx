import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { auth, provider } from "./firebase";
import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState(25.63);
  const [taxRate, setTaxRate] = useState(13);
  const [workLog, setWorkLog] = useState(() => {
    const saved = localStorage.getItem("workLog");
    return saved ? JSON.parse(saved) : [];
  });
  const [editingDate, setEditingDate] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    localStorage.setItem("workLog", JSON.stringify(workLog));
  }, [workLog]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider).catch(alert);
  };

  const loginWithEmail = () => {
    signInWithEmailAndPassword(auth, email, password).catch(alert);
  };

  const registerWithEmail = () => {
    createUserWithEmailAndPassword(auth, email, password).catch(alert);
  };

  const logout = () => {
    signOut(auth);
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let minutes = endH * 60 + endM - (startH * 60 + startM);
    if (minutes < 0) minutes += 24 * 60;
    return minutes / 60;
  };

  const handleSave = () => {
    const hours = calculateHours();
    if (hours <= 0) {
      alert("⚠️ 請輸入正確的時間！");
      return;
    }

    const dateStr = editingDate || selectedDate.toDateString();
    const updatedLog = workLog.filter((log) => log.date !== dateStr);

    setWorkLog([
      ...updatedLog,
      {
        date: dateStr,
        startTime,
        endTime,
        hours,
        rate: hourlyRate,
      },
    ]);

    setStartTime("");
    setEndTime("");
    setEditingDate(null);
  };

  const handleEdit = (log) => {
    setSelectedDate(new Date(log.date));
    setStartTime(log.startTime);
    setEndTime(log.endTime);
    setHourlyRate(log.rate);
    setEditingDate(log.date);
  };

  const handleDelete = (date) => {
    const updatedLog = workLog.filter((log) => log.date !== date);
    setWorkLog(updatedLog);
  };

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentLog = workLog.filter((log) => new Date(log.date) >= twoWeeksAgo);
  const totalHours = recentLog.reduce((sum, log) => sum + log.hours, 0);
  const totalGross = recentLog.reduce(
    (sum, log) => sum + log.hours * log.rate,
    0
  );
  const totalNet = totalGross * (1 - taxRate / 100);

  const [activeButton, setActiveButton] = useState("add_time");
  return (
    <div className="">
      <div className="">
        {!user ? (
          <>
            <h2 className="text-xl font-bold mb-4">🔐 請登入</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 w-full mb-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border p-2 w-full mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={loginWithEmail}
                className="flex-1 bg-blue-500 text-white p-2 rounded"
              >
                登入
              </button>
              <button
                onClick={registerWithEmail}
                className="flex-1 bg-green-500 text-white p-2 rounded"
              >
                註冊
              </button>
            </div>
            <div className="text-center mt-3">
              <button
                onClick={signInWithGoogle}
                className="text-blue-600 underline"
              >
                使用 Google 登入
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ---------------------------分頁按鈕css---start------------------------ */}

            <div className="container">
              <div
                className="radio-wrapper"
                onClick={() => setActiveButton("add_time")}
              >
                <input type="radio" id="value-1" name="btn" className="input" />
                <div className="btn">
                  <span aria-hidden="">_</span>兩週統計
                  <span aria-hidden="" className="btn__glitch">
                    兩週統計
                  </span>
                  <label className="number">r1</label>
                </div>
              </div>
              <div
                className="radio-wrapper"
                onClick={() => setActiveButton("work_chart")}
              >
                <input
                  type="radio"
                  defaultChecked={true}
                  id="value-2"
                  name="btn"
                  className="input"
                />
                <div className="btn">
                  _工時圖表<span aria-hidden="">_</span>
                  <span aria-hidden="" className="btn__glitch">
                    工時圖表
                  </span>
                  <label className="number">r2</label>
                </div>
              </div>
              <div
                className="radio-wrapper"
                onClick={() => setActiveButton("history")}
              >
                <input type="radio" id="value-3" name="btn" className="input" />
                <div className="btn">
                  歷史紀錄<span aria-hidden=""></span>
                  <span aria-hidden="" className="btn__glitch">
                    歷史紀錄_
                  </span>
                  <label className="number">r3</label>
                </div>
              </div>
            </div>
            {/* ---------------------------分頁按鈕css---start------------------------*/}

            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold">🧮 {user.email} 的工時紀錄</h1>
              <article className="keycap" onClick={logout}>
                <aside className="letter">登出</aside>
              </article>
            </div>

            {activeButton === "add_time" && (
                <div className="add_time wrapper">
                  <div className="date">
                    <Calendar onChange={setSelectedDate} value={selectedDate} />
                  </div>
                  <div className="movediv">
                    <p className="mt-4 text-center font-semibold">
                      選擇日期：{selectedDate.toDateString()}
                    </p>

                    <div className="forinput">
                      <div className="coolinput">
                        <label htmlFor="input" className="text">
                          起始時間:
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          name="input"
                          className="input"
                        />
                      </div>
                      <div className="coolinput">
                        <label htmlFor="input" className="text">
                          結束時間:
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          name="input"
                          className="input"
                        />
                      </div>
                      <div className="coolinput">
                        <label htmlFor="input" className="text">
                          時薪:
                        </label>
                        <input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) =>
                            setHourlyRate(Number(e.target.value))
                          }
                          name="input"
                          className="input"
                        />
                      </div>
                      <div className="coolinput">
                        <label htmlFor="input" className="text">
                          稅率%:
                        </label>
                        <input
                          type="number"
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value))}
                          name="input"
                          className="input"
                        />
                      </div>

                      <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 text-white p-2 rounded"
                      >
                        {editingDate ? "更新紀錄" : "儲存今日紀錄"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 two_week">
                    <h2 className="font-bold mb-2">🧾 兩週統計</h2>
                    <p>
                      總工時：<strong>{totalHours.toFixed(2)}</strong> 小時
                    </p>
                    <p>
                      稅前薪水：<strong>${totalGross.toFixed(2)}</strong>
                    </p>
                    <p>
                      稅後薪水：<strong>${totalNet.toFixed(2)}</strong>
                    </p>
                  </div>
              </div>
            )}

            {activeButton === "work_chart" && (
              <div className="mt-6 work_chart">
                <h2 className="font-bold mb-2">📊 工時圖表</h2>
                <div className="h-72 bg-white rounded shadow p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={recentLog.map((entry) => ({
                        name: entry.date.slice(5),
                        hours: parseFloat(entry.hours).toFixed(1),
                      }))}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeButton === "history" && (
              <div className="mt-6 history">
                <h2 className="font-bold mb-2">📋 歷史紀錄</h2>
                <ul className="max-h-40 overflow-y-auto text-sm">
                  {recentLog
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((log) => (
                      <li
                        key={log.date}
                        className="border-b pb-1 mb-1 flex justify-between items-center"
                      >
                        <div>
                          {log.date}｜{log.startTime} ~ {log.endTime}｜
                          {log.hours}
                          h｜${log.rate}/hr
                        </div>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleDelete(log.date)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            刪除
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
