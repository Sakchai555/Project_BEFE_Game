export default function CommunitySection({
  communityPicks,
  openReview,
  showGame,
}) {
  return (
    <section className="community" id="community">
      <div className="community-copy">
        <div className="eyebrow">COMMUNITY RADAR</div>
        <h2>
          เกมที่ชุมชน
          <br />
          ให้คะแนน<span className="accent">.</span>
        </h2>
        <p>
          ดูเกมที่ผู้เล่นให้คะแนนจริง
          <br />
          แล้วค้นพบเกมที่น่าสนใจไปด้วยกัน
        </p>
        <button id="openWrite2" className="outline-btn" onClick={openReview}>
          ร่วมให้คะแนนเกม <span>↗</span>
        </button>
        <div className="community-count">
          <strong>{String(communityPicks.ratedCount).padStart(2, "0")}</strong>
          <span>เกมที่มีคะแนนจากผู้เล่น</span>
        </div>
      </div>
      <div className="community-highlights" aria-label="เกมที่ชุมชนให้คะแนน">
        {communityPicks.games.map((game, index) => (
          <button
            type="button"
            className="community-pick"
            key={game.id}
            style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
            onClick={() => showGame(game.id)}
            aria-label={`ดูรายละเอียด ${game.title}`}
          >
            <span className="community-pick-art">
              <img src={game.image} alt="" loading="lazy" />
              <span className="community-pick-rank">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="community-pick-score">
                {game.vote_count ? (
                  <>
                    {Number(game.average_rating).toFixed(1)}
                    <small>/10</small>
                  </>
                ) : (
                  "ยังไม่มีคะแนน"
                )}
              </span>
            </span>
            <span className="community-pick-info">
              <span className="community-pick-genre">{game.genre}</span>
              <strong>{game.title}</strong>
              <span className="community-pick-votes">
                {game.vote_count
                  ? `${game.vote_count} คะแนนจากผู้เล่น`
                  : "รอคะแนนแรกจากผู้เล่น"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
