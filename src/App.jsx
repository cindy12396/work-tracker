import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { auth, provider } from "./firebase";
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
  const [bgClass, setBgClass] = useState("bg-slate-100");
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
  const [modalOpen, setModalOpen] = useState(false); // 新增 modal 相關(編輯按鈕)
  const [editRecord, setEditRecord] = useState(null); // 新增 modal 相關(編輯按鈕)
  const [rested, setRested] = useState(false);

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

  useEffect(() => {
    document.body.style.backgroundColor =
      bgClass === "bg-green" ? "#f0fdf4" : "#ffffff";
    console.log(document.body.style.backgroundColor);
  }, [bgClass]);

  const openEditModal = (log) => {
    setEditRecord(log);
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setEditRecord(null);
  };

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

  const handleEdit = (log) => {
  setSelectedDate(new Date(log.date));
  setStartTime(log.startTime);
  setEndTime(log.endTime);
  setHourlyRate(log.rate);
  setRested(log.rested || false);   // 預設 false
  setTaxRate(log.taxRate || 13);    // 預設稅率
  setEditingDate(log.date);
  setShowModal(true);               // 打開 modal
};

  // 編輯
const handleEditSave = () => {
  let hours = calculateHours();
  if (hours <= 0) {
    alert("⚠️ 請輸入正確的時間！");
    return;
  }

  if (rested) {
    hours = Math.max(0, hours - 0.5);
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
      taxRate,
      rested,
    },
  ]);

  setStartTime("");
  setEndTime("");
  setEditingDate(null);
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

  const [activeButton, setActiveButton] = useState("add_time");
  return (
    <div className={`w-full h-full ${bgClass}`}>
      <div className="p-6">
        <button
          onClick={() => {
            const newClass =
              bgClass === "bg-white" ? "bg-slate-100" : "bg-white";
            setBgClass(newClass);
          }}
          className="px-3 py-1 bg-white border text-sm rounded mb-4 shadow"
        >
          切換背景顏色
        </button>
        <p className="text-sm text-gray-500">🔍 現在背景：{bgClass}</p>
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
                    <div className="coolinput">
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
                          {log.hours.toFixed(2)}
                          h｜${log.rate}/hr
                        </div>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => openEditModal(log)}
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
            {modalOpen && (
              <div className="modal-overlay">
                <div className="modal-container">
                  <h3 className="modal-title">✏️ 編輯紀錄</h3>

                  {/* 起始時間 */}
                  <div className="coolinput">
                    <label className="text">起始時間:</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  {/* 結束時間 */}
                  <div className="coolinput">
                    <label className="text">結束時間:</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>

                  {/* ✅ 時薪 */}
                  <div className="coolinput">
                    <label className="text">時薪:</label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => {
                        const newRate = Number(e.target.value);
                        setHourlyRate(newRate);
                        if (user) saveUserHourlyRate(user.email, newRate);
                      }}
                    />
                  </div>

                  {/* ✅ 稅率 */}
                  <div className="coolinput">
                    <label className="text">稅率%:</label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => {
                        const newRate = Number(e.target.value);
                        setTaxRate(newRate);
                        if (user) saveUserTaxRate(user.email, newRate);
                      }}
                    />
                  </div>

                  {/* ✅ 是否有休息 */}
                  <div className="coolinput flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="rested"
                      checked={rested}
                      onChange={() => setRested(!rested)}
                    />
                    <label htmlFor="rested">今天有休息半小時</label>
                  </div>

                  {/* ✅ 按鈕列 */}
                  <div className="modal-buttons mt-4 flex justify-end gap-2">
                    <button
                      onClick={handleSave}
                      className="save-btn bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      儲存
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="cancel-btn bg-gray-300 px-4 py-2 rounded"
                    >
                      取消
                    </button>
                  </div>

                  <button
                    className="modal-close-button"
                    onClick={closeEditModal}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
