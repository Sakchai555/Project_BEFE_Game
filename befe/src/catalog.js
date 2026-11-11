export function filterGames(games, { genre, search, favorites, sort }) {
  const query = search.trim().toLowerCase();
  return games
    .filter(game => (
      genre === 'ทั้งหมด'
      || (genre === 'เกมโปรด' ? favorites.has(Number(game.id)) : game.genre.toLowerCase().includes(genre.toLowerCase()))
    ) && (
      !query || `${game.title} ${game.genre} ${game.description}`.toLowerCase().includes(query)
    ))
    .sort((a, b) => {
      if (sort === 'rating-asc') return Number(a.average_rating ?? 11) - Number(b.average_rating ?? 11);
      if (sort === 'votes-desc') return Number(b.vote_count || 0) - Number(a.vote_count || 0);
      if (sort === 'name-asc') return a.title.localeCompare(b.title, 'th');
      if (sort === 'year-asc') return Number(a.year || 0) - Number(b.year || 0);
      if (sort === 'year-desc') return Number(b.year || 0) - Number(a.year || 0);
      return Number(b.average_rating ?? -1) - Number(a.average_rating ?? -1);
    });
}

export function getRevealStep(total) {
  return total > 0 ? 30 : 0;
}

export function getVisibleGames(games, search, visibleCount) {
  if (search.trim()) return games;
  return games.slice(0, Math.min(games.length, visibleCount ?? getRevealStep(games.length)));
}
