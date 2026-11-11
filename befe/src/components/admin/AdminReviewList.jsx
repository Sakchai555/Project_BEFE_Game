export default function AdminReviewList({ reviews, reviewsLoading, deleteReview }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><div className="eyebrow muted">COMMUNITY</div><h2>รีวิวจากสมาชิก</h2></div>
      </div>
      <div className="admin-reviews">
        {reviewsLoading ? <p className="empty-row">กำลังโหลดรีวิว…</p> : reviews.length ? reviews.map(review => (
          <article className="admin-review" key={review.id}>
            <div className="admin-review-head"><strong>{review.author_name} · {review.game_title}</strong><small>{new Date(review.created_at).toLocaleString('th-TH')}</small></div>
            <p>{review.body}</p>
            <div className="admin-review-foot"><span>คะแนน {review.score ?? '—'}/10</span><button className="moderate-btn" type="button" onClick={() => deleteReview(review)}>นำรีวิวออก</button></div>
          </article>
        )) : <p className="empty-row">ยังไม่มีรีวิว</p>}
      </div>
    </section>
  );
}
