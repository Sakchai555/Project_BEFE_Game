export default function AdminGamesTable({
  games,
  gamesLoading,
  editGame,
  deleteGame,
}) {
  return (
    <>
      <div className="admin-data-status" role="status">
        {gamesLoading
          ? "กำลังโหลดรายการเกม…"
          : games.length
            ? `${games.length} เกมในคลัง`
            : "ยังไม่มีเกม"}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>เกม</th>
              <th>แนว</th>
              <th>แหล่งจำหน่าย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>{game.id}</td>
                <td>{game.title}</td>
                <td>{game.genre}</td>
                <td>
                  {game.store_name ? (
                    <a
                      href={game.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {game.store_name} ↗
                    </a>
                  ) : (
                    <span className="muted">ยังไม่ระบุ</span>
                  )}
                </td>
                <td>
                  <div className="admin-actions">
                    <button type="button" onClick={() => editGame(game)}>
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteGame(game)}
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
