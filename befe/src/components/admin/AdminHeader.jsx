import { Link } from "react-router-dom";

export default function AdminHeader({ email, onLogout }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brand-icon">P</span>PLAYLOG
        <span className="brand-dot">.</span>
      </Link>
      <nav>
        <Link to="/">กลับหน้าหลัก</Link>
      </nav>
      <div className="top-actions">
        <span className="account-name">{email || ""}</span>
        <button className="account-btn" onClick={onLogout}>
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
