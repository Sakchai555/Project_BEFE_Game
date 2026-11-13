import DialogFrame from "./DialogFrame";

export function ProfileDialog({
  ref: dialogRef,
  user,
  name,
  setName,
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
      className="profile-dialog"
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
        <div className="eyebrow muted">ACCOUNT SETTINGS</div>
        <h2>
          โปรไฟล์<span className="accent">.</span>
        </h2>
        <label>
          อีเมล
          <input type="email" value={user?.email || ""} readOnly />
        </label>
        <label>
          ชื่อที่แสดง
          <input
            autoComplete="nickname"
            maxLength="32"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <div className="profile-password-divider">
          <span>เปลี่ยนรหัสผ่าน</span>
        </div>
        <label>
          รหัสผ่านใหม่
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          ยืนยันรหัสผ่านใหม่
          <input
            type="password"
            autoComplete="new-password"
            minLength="8"
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="submit-btn" disabled={busy}>
          {busy ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </form>
    </DialogFrame>
  );
}
