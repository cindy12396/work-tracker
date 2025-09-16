import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth, provider } from "./firebase";
import ThemeToggle from "./ThemeToggle";
import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

function App() {
  const [darkMode, setDarkMode] = useState(false); //背景
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
  const [hasBreak, setHasBreak] = useState(false); // 有無休息
  const [rested, setRested] = useState(false);
  const [showModal, setShowModal] = useState(false); // 編輯按鈕
  const [editingStartTime, setEditingStartTime] = useState(""); // 宣告編輯起始時間
  const [editingEndTime, setEditingEndTime] = useState(""); // 宣告編輯結束時間
  const [editingRate, setEditingRate] = useState(hourlyRate); // 宣告編輯時長
  const [editingTaxRate, setEditingTaxRate] = useState(taxRate); // 宣告編輯稅率
  const [editingRested, setEditingRested] = useState(false); // 母雞斗
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 月份選擇器
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // 月份選擇器
  const saveUserHourlyRate = async (userEmail, rate) => {
    const ref = doc(db, "users", userEmail, "settings", "hourly");
    await setDoc(ref, { rate });
  };

  const loadUserHourlyRate = async (userEmail) => {
    const ref = doc(db, "users", userEmail, "settings", "hourly");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().rate : 25.63;
  };

  // 稅率
  const loadUserTaxRate = async (userEmail) => {
    const ref = doc(db, "users", userEmail, "settings", "tax");
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().rate : 13;
  };

  useEffect(() => {
    localStorage.setItem("workLog", JSON.stringify(workLog));
  }, [workLog]);

  // 時薪
  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const tax = await loadUserTaxRate(currentUser.email);
        setTaxRate(tax);
        const hourly = await loadUserHourlyRate(currentUser.email);
        setHourlyRate(hourly);
      }
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
    let hours = minutes / 60;
    if (rested) {
      hours = Math.max(0, hours - 0.5);
    }
    return hours;
  };

  // 歷史紀錄之選擇月份
  const monthLog = workLog.filter((log) => {
    const date = new Date(log.date);
    return (
      date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    );
  });

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
        break: hasBreak, //有無休息
      },
    ]);
    setStartTime("");
    setEndTime("");
    setEditingDate(null);
  };

  // 當編輯按下去時，會把log帶值進去popup window裡
  const handleEdit = (log) => {
    setSelectedDate(new Date(log.date));
    setEditingDate(log.date);
    setEditingStartTime(log.startTime);
    setEditingEndTime(log.endTime);
    setEditingRate(log.rate);
    setEditingTaxRate(log.taxRate || 13);
    setEditingRested(log.rested || false);
    setShowModal(true);
  };

  // 編輯成功後計算工時，並更新editedHours
  const [editingHasBreak, setEditingHasBreak] = useState(false);
  const calculateEditHours = () => {
    if (!editingStartTime || !editingEndTime) return 0;
    const [startH, startM] = editingStartTime.split(":").map(Number);
    const [endH, endM] = editingEndTime.split(":").map(Number);
    let minutes = endH * 60 + endM - (startH * 60 + startM);
    if (minutes < 0) minutes += 24 * 60;
    return minutes / 60;
  };
  let editedHours = calculateEditHours(); // 先計算工時
  if (editingHasBreak) {
    editedHours -= 0.5;
  }

  // popup window的儲存按鈕
  const handleEditSave = () => {
    if (!editingStartTime || !editingEndTime) return;

    const [startH, startM] = editingStartTime.split(":").map(Number);
    const [endH, endM] = editingEndTime.split(":").map(Number);
    let minutes = endH * 60 + endM - (startH * 60 + startM);
    if (minutes < 0) minutes += 24 * 60;

    let hours = minutes / 60;
    if (editingRested) hours -= 0.5;

    if (hours <= 0) {
      alert("⚠️ 請輸入正確的時間！");
      return;
    }

    const updatedLog = workLog.filter((log) => log.date !== editingDate);

    setWorkLog([
      ...updatedLog,
      {
        date: editingDate,
        startTime: editingStartTime,
        endTime: editingEndTime,
        hours: editedHours,
        rate: editingRate,
        taxRate: editingTaxRate,
        rested: editingRested,
      },
    ]);

    setShowModal(false);
  };

  // helper to 計算 hours（加入休息時間扣半小時）
  const calculateHoursFor = (startTime, endTime, hasBreak) => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let minutes = endH * 60 + endM - (startH * 60 + startM);
    if (minutes < 0) minutes += 24 * 60;
    let hours = minutes / 60;
    if (hasBreak) {
      hours = hours - 0.5;
      if (hours < 0) hours = 0;
    }
    return hours;
  };

  // 刪除
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

  // 動畫
  const [isClosing, setIsClosing] = useState(false);
  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setEditRecord(null);
      setIsClosing(false);
    }, 200); // 跟 CSS 動畫時長一致
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  const [activeButton, setActiveButton] = useState("add_time");

  // 背景顏色
  const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1 bg-gray-200 text-sm rounded shadow mb-4"
        >
          {darkMode ? "🌞 淺色模式" : "🌙 深色模式"}
        </button>
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
                <div className="modal-content">
                  <p className="mt-4 text-center font-semibold">
                    選擇日期：{selectedDate.toDateString()}
                  </p>

                  <div className="forinput">
                    <div>
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
                    <div>
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
                    <div>
                      <label htmlFor="input" className="text">
                        時薪:
                      </label>
                      <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => {
                          const newRate = Number(e.target.value);
                          setHourlyRate(newRate);
                          if (user) saveUserHourlyRate(user.email, newRate);
                        }}
                        name="input"
                        className="input"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="hasBreak"
                        checked={hasBreak}
                        onChange={(e) => setHasBreak(e.target.checked)}
                      />
                      <label htmlFor="hasBreak">今天有休息半小時</label>
                    </div>
                    <div>
                      <label htmlFor="input" className="text">
                        稅率%:
                      </label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => {
                          const newRate = Number(e.target.value);
                          setTaxRate(newRate);
                          if (user) saveUserTaxRate(user.email, newRate);
                        }}
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
                <div className="h-80 bg-white rounded-lg shadow-lg p-4 dark:bg-gray-800 chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={recentLog.map((entry) => ({
                        name: entry.date.slice(5),
                        hours: parseFloat(entry.hours),
                        salary: parseFloat(
                          (entry.hours * entry.rate).toFixed(2)
                        ),
                      }))}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#f9fafb",
                          borderRadius: "0.5rem",
                        }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Legend verticalAlign="top" height={36} />

                      <Line
                        type="monotone"
                        dataKey="hours"
                        name="工時"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "#fff",
                          stroke: "#3b82f6",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                        animationDuration={500}
                      />
                      <Line
                        type="monotone"
                        dataKey="salary"
                        name="薪水"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "#fff",
                          stroke: "#f59e0b",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeButton === "history" && (
              <div className="mt-6 history">
                <h2 className="font-bold mb-2">📋 歷史紀錄</h2>
                <div className="mb-4 flex justify-center gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="border rounded px-2 py-1"
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="border rounded px-2 py-1"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i + 1} 月
                      </option>
                    ))}
                  </select>
                </div>

                <ul className="max-h-40 overflow-y-auto text-sm">
                  {monthLog
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((log) => (
                      <li
                        key={log.date}
                        className="border-b pb-1 mb-1 flex justify-between items-center"
                      >
                        <div>
                          {log.date}｜{log.startTime} ~ {log.endTime}｜
                          {log.hours.toFixed(2)}h｜${log.rate}/hr
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

            {/* Modal 區塊 */}
            {showModal && (
              <div className="modal-overlay">
                <div className={`modal-content ${isClosing ? "closing" : ""}`}>
                  <h2 className="text-lg font-bold mb-4">✏️ 編輯紀錄</h2>

                  <div className="form-group">
                    <label>選擇日期：</label>
                    <p className="mb-2 text-sm text-gray-600">
                      {selectedDate.toDateString()}
                    </p>
                  </div>

                  <div className="form-group">
                    <label>起始時間：</label>
                    <input
                      type="time"
                      value={editingStartTime}
                      onChange={(e) => setEditingStartTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>結束時間：</label>
                    <input
                      type="time"
                      value={editingEndTime}
                      onChange={(e) => setEditingEndTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>時薪：</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label>稅率（%）：</label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingHasBreak}
                      onChange={(e) => setEditingHasBreak(e.target.checked)}
                    />
                    <label>今天有休息半小時</label>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="bg-gray-400 text-white px-4 py-2 rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleEditSave}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      儲存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}};

export default ThemeToggle;;
