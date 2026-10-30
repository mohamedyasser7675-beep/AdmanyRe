
import { useState } from "react";
import "./App.css";

const DEFAULT_API = "http://localhost:4000/api/auth";

const initialSignup = {
  name: "",
  email: "",
  phone: "",
  password: "",
  acceptedTerms: true,
};

export default function App() {
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem("athmini_api_url") || DEFAULT_API
  );

  const [page, setPage] = useState("signup");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [token, setToken] = useState(
    sessionStorage.getItem("athmini_access_token") || ""
  );
  const [accountEmail, setAccountEmail] = useState("");

  const [signup, setSignup] = useState(initialSignup);
  const [verify, setVerify] = useState({ email: "", code: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [forgot, setForgot] = useState({ email: "" });
  const [reset, setReset] = useState({
    email: "",
    code: "",
    newPassword: "",
  });

  const [me, setMe] = useState(null);

  const endpoint = (path) =>
    `${apiUrl.replace(/\/+$/, "")}/${path}`;

  const saveToken = (newToken) => {
    if (!newToken) return;

    setToken(newToken);
    sessionStorage.setItem("athmini_access_token", newToken);
  };

  const clearToken = () => {
    setToken("");
    sessionStorage.removeItem("athmini_access_token");
    setMe(null);
  };

  // Extract common access-token response formats.
  const findAccessToken = (data) => {
    return (
      data?.accessToken ||
      data?.access_token ||
      data?.tokens?.accessToken ||
      data?.data?.accessToken ||
      data?.data?.access_token ||
      null
    );
  };

  const request = async (path, method = "POST", body = null, auth = false) => {
    setLoading(true);
    setResponse(null);

    try {
      const headers = {};

      if (body !== null) {
        headers["Content-Type"] = "application/json";
      }

      if (auth) {
        if (!token) {
          throw new Error("لا يوجد Access Token. سجل الدخول أولاً.");
        }
        headers.Authorization = `Bearer ${token}`;
      }

      const result = await fetch(endpoint(path), {
        method,
        headers,
        ...(body !== null ? { body: JSON.stringify(body) } : {}),
      });

      const raw = await result.text();
      let data;

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { rawResponse: raw };
      }

      const output = {
        success: result.ok,
        status: result.status,
        method,
        endpoint: path,
        data,
        time: new Date().toLocaleTimeString(),
      };

      setResponse(output);

      if (!result.ok) {
        return { ok: false, data, status: result.status };
      }

      return { ok: true, data, status: result.status };
    } catch (error) {
      const output = {
        success: false,
        status: "NETWORK ERROR",
        method,
        endpoint: path,
        data: { message: error.message },
        time: new Date().toLocaleTimeString(),
      };

      setResponse(output);
      return { ok: false, data: output.data };
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    const result = await request("signup", "POST", signup);

    if (result.ok) {
      setAccountEmail(signup.email);
      setVerify({ email: signup.email, code: "" });
      setReset((old) => ({ ...old, email: signup.email }));
      setPage("verify");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    const result = await request("verify-email", "POST", verify);

    if (result.ok) {
      const newToken = findAccessToken(result.data);

      if (newToken) {
        saveToken(newToken);
      }

      setLogin((old) => ({ ...old, email: verify.email }));
      setAccountEmail(verify.email);
    }
  };

  const handleResend = async () => {
    await request("resend-verification", "POST", {
      email: verify.email,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const result = await request("login", "POST", login);

    if (result.ok) {
      const newToken = findAccessToken(result.data);

      if (newToken) {
        saveToken(newToken);
      }

      setAccountEmail(login.email);
    }
  };

  const handleMe = async () => {
    const result = await request("me", "GET", null, true);

    if (result.ok) {
      setMe(result.data);
    }
  };

  const handleLogout = async () => {
    const result = await request("logout", "POST", {}, true);

    if (result.ok) {
      clearToken();
      setPage("login");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();

    const result = await request("forgot-password", "POST", forgot);

    if (result.ok) {
      setReset((old) => ({ ...old, email: forgot.email, code: "" }));
      setPage("reset");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();

    const result = await request("reset-password", "POST", reset);

    if (result.ok) {
      setLogin({
        email: reset.email,
        password: reset.newPassword,
      });
      setPage("login");
    }
  };

  const updateApiUrl = (value) => {
    setApiUrl(value);
    localStorage.setItem("athmini_api_url", value);
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(
        JSON.stringify(response, null, 2)
      );
    }
  };

  const tabs = [
    { id: "signup", label: "إنشاء حساب", number: "01" },
    { id: "verify", label: "تأكيد البريد", number: "02" },
    { id: "login", label: "تسجيل الدخول", number: "03" },
    { id: "me", label: "بيانات الحساب", number: "04" },
    { id: "forgot", label: "نسيت كلمة المرور", number: "05" },
    { id: "reset", label: "تغيير كلمة المرور", number: "06" },
  ];

  const input = (label, name, value, onChange, options = {}) => (
    <label className="field" key={name}>
      <span>{label}</span>
      <input
        name={name}
        type={options.type || "text"}
        placeholder={options.placeholder || label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={options.required !== false}
        minLength={options.minLength}
        autoComplete={options.autoComplete || "off"}
      />
    </label>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h1>Athmini</h1>
            <span>Backend Integration Tester</span>
          </div>
        </div>

        <div className="connection">
          <span className={token ? "status-dot active" : "status-dot"} />
          {token ? "Session Token موجود" : "غير مسجل الدخول"}
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <div>
            <span className="eyebrow">DEVELOPER ENVIRONMENT</span>
            <h2>اختبار نظام الحسابات</h2>
            <p>
              واجهة تجريبية لاختبار جميع عمليات المصادقة مع
              Backend الحقيقي.
            </p>
          </div>

          <div className="api-config">
            <label>API Base URL</label>
            <input
              value={apiUrl}
              onChange={(e) => updateApiUrl(e.target.value)}
              placeholder="http://localhost:4000/api/auth"
            />
          </div>
        </section>

        <div className="workspace">
          <aside className="sidebar">
            <div className="sidebar-title">AUTHENTICATION</div>

            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${page === tab.id ? "selected" : ""}`}
                onClick={() => {
                  setPage(tab.id);
                  setResponse(null);
                }}
              >
                <span className="nav-number">{tab.number}</span>
                <span>{tab.label}</span>
              </button>
            ))}

            <div className="sidebar-divider" />

            <div className="sidebar-title">SESSION</div>

            <div className="session-box">
              <span>Access Token</span>
              <strong>{token ? "متوفر" : "غير متوفر"}</strong>
              {token && (
                <button
                  className="small-button"
                  onClick={() => {
                    navigator.clipboard.writeText(token);
                  }}
                >
                  نسخ Token
                </button>
              )}
            </div>

            <button
              className="logout-button"
              disabled={!token || loading}
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </aside>

          <section className="content">
            <div className="form-panel">
              {page === "signup" && (
                <>
                  <div className="panel-heading">
                    <span className="step">01 / SIGN UP</span>
                    <h2>إنشاء حساب جديد</h2>
                    <p>أدخل بيانات الحساب لاختبار API التسجيل.</p>
                  </div>

                  <form onSubmit={handleSignup}>
                    {input("الاسم الكامل", "name", signup.name,
                      (v) => setSignup({ ...signup, name: v }))}
                    {input("البريد الإلكتروني", "email", signup.email,
                      (v) => setSignup({ ...signup, email: v }),
                      { type: "email", autoComplete: "email" })}
                    {input("رقم الهاتف الكويتي", "phone", signup.phone,
                      (v) => setSignup({ ...signup, phone: v }),
                      { placeholder: "5xxxxxxx" })}
                    {input("كلمة المرور", "password", signup.password,
                      (v) => setSignup({ ...signup, password: v }),
                      { type: "password", minLength: 10, autoComplete: "new-password" })}

                    <label className="terms">
                      <input
                        type="checkbox"
                        checked={signup.acceptedTerms}
                        onChange={(e) =>
                          setSignup({
                            ...signup,
                            acceptedTerms: e.target.checked,
                          })
                        }
                      />
                      أوافق على الشروط والأحكام
                    </label>

                    <button className="primary-button" disabled={loading}>
                      {loading ? "جاري الإرسال..." : "إنشاء الحساب"}
                    </button>
                  </form>
                </>
              )}

              {page === "verify" && (
                <>
                  <div className="panel-heading">
                    <span className="step">02 / VERIFY EMAIL</span>
                    <h2>تأكيد البريد الإلكتروني</h2>
                    <p>أدخل الرمز الذي وصلك عبر البريد الإلكتروني.</p>
                  </div>

                  <form onSubmit={handleVerify}>
                    {input("البريد الإلكتروني", "email", verify.email,
                      (v) => setVerify({ ...verify, email: v }),
                      { type: "email" })}
                    {input("رمز التأكيد", "code", verify.code,
                      (v) => setVerify({ ...verify, code: v }),
                      { placeholder: "أدخل رمز التأكيد" })}

                    <button className="primary-button" disabled={loading}>
                      تأكيد البريد
                    </button>
                  </form>

                  <button className="text-button" onClick={handleResend}
                    disabled={loading}>
                    إعادة إرسال رمز التأكيد
                  </button>
                </>
              )}

              {page === "login" && (
                <>
                  <div className="panel-heading">
                    <span className="step">03 / LOGIN</span>
                    <h2>تسجيل الدخول</h2>
                    <p>اختبر تسجيل الدخول واستلام Access Token.</p>
                  </div>

                  <form onSubmit={handleLogin}>
                    {input("البريد الإلكتروني", "email", login.email,
                      (v) => setLogin({ ...login, email: v }),
                      { type: "email" })}
                    {input("كلمة المرور", "password", login.password,
                      (v) => setLogin({ ...login, password: v }),
                      { type: "password" })}

                    <button className="primary-button" disabled={loading}>
                      تسجيل الدخول
                    </button>
                  </form>

                  <button className="text-button"
                    onClick={() => setPage("forgot")}>
                    نسيت كلمة المرور؟
                  </button>
                </>
              )}

              {page === "me" && (
                <>
                  <div className="panel-heading">
                    <span className="step">04 / CURRENT USER</span>
                    <h2>بيانات الحساب</h2>
                    <p>اختبر GET /me باستخدام Bearer Token.</p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={handleMe}
                    disabled={loading || !token}
                  >
                    {loading ? "جاري التحميل..." : "تحميل بيانات الحساب"}
                  </button>

                  {!token && (
                    <p className="hint">سجل الدخول أولاً للحصول على Token.</p>
                  )}

                  {me && (
                    <pre className="data-preview">
                      {JSON.stringify(me, null, 2)}
                    </pre>
                  )}
                </>
              )}

              {page === "forgot" && (
                <>
                  <div className="panel-heading">
                    <span className="step">05 / FORGOT PASSWORD</span>
                    <h2>نسيت كلمة المرور؟</h2>
                    <p>اطلب رمز إعادة تعيين كلمة المرور.</p>
                  </div>

                  <form onSubmit={handleForgot}>
                    {input("البريد الإلكتروني", "email", forgot.email,
                      (v) => setForgot({ email: v }),
                      { type: "email" })}

                    <button className="primary-button" disabled={loading}>
                      إرسال طلب الاستعادة
                    </button>
                  </form>
                </>
              )}

              {page === "reset" && (
                <>
                  <div className="panel-heading">
                    <span className="step">06 / RESET PASSWORD</span>
                    <h2>تعيين كلمة مرور جديدة</h2>
                    <p>استخدم الرمز المرسل إلى بريدك الإلكتروني.</p>
                  </div>

                  <form onSubmit={handleReset}>
                    {input("البريد الإلكتروني", "email", reset.email,
                      (v) => setReset({ ...reset, email: v }),
                      { type: "email" })}
                    {input("رمز الاستعادة", "code", reset.code,
                      (v) => setReset({ ...reset, code: v }))}
                    {input("كلمة المرور الجديدة", "newPassword",
                      reset.newPassword,
                      (v) => setReset({ ...reset, newPassword: v }),
                      { type: "password", minLength: 10 })}

                    <button className="primary-button" disabled={loading}>
                      تغيير كلمة المرور
                    </button>
                  </form>
                </>
              )}
            </div>

            <section className="response-panel">
              <div className="response-heading">
                <div>
                  <span className="step">API RESPONSE</span>
                  <h3>نتيجة الطلب</h3>
                </div>

                {response && (
                  <button className="small-button" onClick={copyResponse}>
                    نسخ النتيجة
                  </button>
                )}
              </div>

              {!response ? (
                <div className="empty-response">
<div className="empty-icon">{"{}"}</div>                  <h4>لا توجد استجابة حتى الآن</h4>
                  <p>نفّذ أي عملية من القائمة لمشاهدة نتيجة الـ API.</p>
                </div>
              ) : (
                <div>
                  <div className="response-meta">
                    <span className={response.success ? "success-tag" : "error-tag"}>
                      {response.success ? "SUCCESS" : "FAILED"}
                    </span>
                    <span>HTTP {response.status}</span>
                    <span>{response.method}</span>
                    <span>{response.endpoint}</span>
                  </div>

                  <pre className="response-code">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>

                  <p className="response-time">
                    Request time: {response.time}
                  </p>
                </div>
              )}
            </section>
          </section>
        </div>

        <footer>
          Athmini API Tester · Development Only · Do not use real customer data
        </footer>
      </main>
    </div>
  );
}
