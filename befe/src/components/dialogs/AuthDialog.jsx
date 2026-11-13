import DialogFrame from "./DialogFrame";

export function AuthDialog({
  ref: dialogRef,
  open,
  mode,
  setMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirm,
  setConfirm,
  error,
  busy,
  onClose,
  onSubmit,
}) {
  return (
    <DialogFrame
      dialogRef={dialogRef}
      className="auth-dialog"
      onClose={onClose}
    >
      <form className="dialog-card" onSubmit={onSubmit}>
        <button
          type="button"
          className="close"
          aria-label="ปิด"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>

        <div className="eyebrow muted">COMMUNITY ACCESS</div>
        <h2>
          {mode === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          <span className="accent">.</span>
        </h2>
        <p className="auth-intro">
          {mode === "signup"
            ? "สร้างบัญชีเพื่อร่วมแบ่งปันรีวิวเกม"
            : "เข้าสู่ระบบเพื่อเขียนรีวิวและให้คะแนนเกม"}
        </p>

        {mode === "signup" && (
          <label>
            ชื่อที่แสดง
            <input
              autoComplete="name"
              maxLength="32"
              placeholder="ชื่อของคุณ"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        )}

        <label>
          อีเมล
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          รหัสผ่าน
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength="8"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {mode === "signup" && (
          <label>
            ยืนยันรหัสผ่าน
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="submit-btn" disabled={busy}>
          {busy
            ? "กำลังตรวจสอบ…"
            : mode === "signup"
              ? "สร้างบัญชี"
              : "เข้าสู่ระบบ"}{" "}
          <span>↗</span>
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "signup"
            ? "มีบัญชีแล้ว? เข้าสู่ระบบ"
            : "ยังไม่มีบัญชี? สมัครสมาชิก"}
        </button>
      </form>
    </DialogFrame>
  );
}
