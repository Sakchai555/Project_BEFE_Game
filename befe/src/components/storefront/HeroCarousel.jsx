export default function HeroCarousel({
  heroRef,
  heroTrackRef,
  featured,
  scrollHero,
  showGame,
}) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="eyebrow">
          <span className="pulse" /> WELCOME TO PLAYLOG
        </div>
        <h1>
          ค้นพบเกมสำหรับคุณ
          <br />
          <em>จากเหล่าผู้เล่นจริง</em>
        </h1>
        <p>
          เลือกเกมในสไตล์คุณ
          พร้อมตัดสินใจอย่างมั่นใจด้วยคะแนนและรีวิวจากชุมชนคนเล่นเกม
        </p>
        <a href="#discover" className="hero-link">
          เริ่มสำรวจ <span>↘</span>
        </a>
      </div>
      <div className="hero-art">
        <div
          className="hero-carousel-viewport"
          ref={heroRef}
          aria-label="ปกเกมแนะนำ"
        >
          <div className="hero-carousel-track" ref={heroTrackRef}>
            {featured.map((game) => {
              const art = game.image.replace(
                /(\/store_item_assets\/steam\/apps\/\d+)\/[^/?]+$/,
                "$1/library_hero.jpg",
              );
              return (
                <article className="hero-slide" key={game.id}>
                  <img
                    src={art}
                    onError={(event) => {
                      event.currentTarget.src = game.image;
                    }}
                    alt={`ภาพแบนเนอร์เกม ${game.title}`}
                    loading="lazy"
                  />
                  <span>{game.title}</span>
                  <button
                    type="button"
                    className="hero-slide-action"
                    onClick={() => showGame(game.id)}
                  >
                    ดูเกม <span aria-hidden="true">↗</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
        <div className="hero-carousel-controls">
          <button
            type="button"
            onClick={() => scrollHero(-1)}
            aria-label="เลื่อนดูเกมก่อนหน้า"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollHero(1)}
            aria-label="เลื่อนดูเกมถัดไป"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="art-index">
          <span>
            {String(
              Math.min(
                featured.length,
                Math.round(
                  (heroRef.current?.scrollLeft || 0) /
                    (heroRef.current?.clientWidth || 1),
                ) + 1,
              ),
            ).padStart(2, "0")}
          </span>{" "}
          <i>
            / <span>{String(featured.length).padStart(2, "0")}</span>
          </i>
        </div>
      </div>
    </section>
  );
}
