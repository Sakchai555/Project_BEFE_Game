import { Link } from "react-router-dom";

export default function StoreHeader({
  currentUser,
  userLabel,
  admin,
  openProfile,
  client,
  openAuth,
  openReview,
}) {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brand-icon">P</span>PLAYLOG
        <span className="brand-dot">.</span>
      </Link>
      <nav>
        <a className="active" href="#discover">
          ค้นพบเกม
        </a>
        <a href="#community">เกมจากชุมชน</a>
      </nav>
      <div className="top-actions">
        <span className="account-name">
          {currentUser ? userLabel(currentUser) : ""}
        </span>
        {admin && (
          <Link className="account-btn admin-link" to="/admin">
            จัดการระบบ
          </Link>
        )}
        {currentUser && (
          <button
            type="button"
            className="account-btn profile-btn"
            onClick={openProfile}
          >
            โปรไฟล์
          </button>
        )}
        <button
          className={`account-btn ${currentUser ? "signed-in" : ""}`}
          onClick={() =>
            currentUser ? client?.auth.signOut() : openAuth(null)
          }
        >
          {currentUser ? "ออกจากระบบ" : "เข้าสู่ระบบ"}
        </button>
        <button className="write-btn" onClick={openReview}>
          <span>＋</span> เขียนรีวิว
        </button>
      </div>
    </header>
  );
}
