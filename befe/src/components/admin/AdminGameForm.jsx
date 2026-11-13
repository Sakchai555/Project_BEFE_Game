export default function AdminGameForm({
  editingId,
  form,
  setField,
  saveGame,
  busy,
  resetForm,
}) {
  return (
    <>
      <div className="admin-panel-heading">
        <div>
          <div className="eyebrow muted">CATALOG</div>
          <h2 id="gameFormTitle">
            {editingId ? `แก้ไขเกม #${editingId}` : "เพิ่มเกม"}
          </h2>
        </div>
      </div>
      <form className="admin-form" onSubmit={saveGame}>
        <label>
          ชื่อเกม
          <input
            name="title"
            maxLength="120"
            value={form.title}
            onChange={setField}
            required
          />
        </label>
        <label>
          แนวเกม
          <input
            name="genre"
            maxLength="80"
            value={form.genre}
            onChange={setField}
            required
          />
        </label>
        <label>
          แพลตฟอร์ม
          <input
            name="platform"
            maxLength="100"
            value={form.platform}
            onChange={setField}
            required
          />
        </label>
        <label>
          ปีที่วางจำหน่าย
          <input
            name="year"
            type="number"
            min="1970"
            max="2200"
            value={form.year}
            onChange={setField}
            required
          />
        </label>
        <label className="wide">
          ลิงก์รูปภาพ (HTTPS)
          <input
            name="image"
            type="url"
            placeholder="https://…"
            value={form.image}
            onChange={setField}
            required
          />
        </label>
        <label>
          แหล่งจำหน่ายเกม
          <input
            name="store_name"
            maxLength="80"
            placeholder="เช่น Steam, Riot Client, Epic Games Store"
            value={form.store_name}
            onChange={setField}
            required
          />
        </label>
        <label>
          ลิงก์แหล่งจำหน่าย
          <input
            name="store_url"
            type="url"
            placeholder="https://…"
            value={form.store_url}
            onChange={setField}
            required
          />
        </label>
        <label className="wide">
          คำอธิบาย
          <textarea
            name="description"
            rows="3"
            maxLength="1000"
            value={form.description}
            onChange={setField}
            required
          />
        </label>
        <div className="admin-form-actions">
          <button className="submit-btn" type="submit" disabled={busy}>
            {busy ? "กำลังบันทึก…" : "บันทึกเกม"}
          </button>
          {editingId && (
            <button className="outline-btn" type="button" onClick={resetForm}>
              ยกเลิกแก้ไข
            </button>
          )}
        </div>
      </form>
    </>
  );
}
