import { filterGames, getRevealStep, getVisibleGames } from './catalog';

const games = [
  { id: 1, title: 'Alpha', genre: 'RPG', description: 'space adventure', average_rating: 8, vote_count: 4, year: 2020 },
  { id: 2, title: 'Beta', genre: 'แอ็กชัน', description: 'fast action', average_rating: 9, vote_count: 2, year: 2022 },
  { id: 3, title: 'Gamma', genre: 'RPG', description: 'quiet journey', average_rating: null, vote_count: 0, year: 2018 },
];

describe('game catalog filtering and sorting', () => {
  test('filters by search text across title, genre, and description', () => {
    expect(filterGames(games, { genre: 'ทั้งหมด', search: 'SPACE', favorites: new Set(), sort: 'name-asc' }).map(game => game.id)).toEqual([1]);
  });

  test('filters by genre and favorites', () => {
    expect(filterGames(games, { genre: 'RPG', search: '', favorites: new Set([3]), sort: 'name-asc' }).map(game => game.id)).toEqual([1, 3]);
    expect(filterGames(games, { genre: 'เกมโปรด', search: '', favorites: new Set([2]), sort: 'name-asc' }).map(game => game.id)).toEqual([2]);
  });

  test('sorts by rating and vote count', () => {
    expect(filterGames(games, { genre: 'ทั้งหมด', search: '', favorites: new Set(), sort: 'rating-desc' }).map(game => game.id)).toEqual([2, 1, 3]);
    expect(filterGames(games, { genre: 'ทั้งหมด', search: '', favorites: new Set(), sort: 'votes-desc' }).map(game => game.id)).toEqual([1, 2, 3]);
  });
});

describe('progressive game display', () => {
  test('shows games in batches of 30 and includes the final remainder', () => {
    expect(getRevealStep(150)).toBe(30);
    expect(getVisibleGames(Array.from({ length: 150 }, (_, index) => index), '', null)).toHaveLength(30);
    expect(getVisibleGames(Array.from({ length: 150 }, (_, index) => index), '', 60)).toHaveLength(60);
    expect(getVisibleGames(Array.from({ length: 83 }, (_, index) => index), '', 90)).toHaveLength(83);
  });

  test('shows every search result without progressive loading', () => {
    const filtered = filterGames(games, { genre: 'ทั้งหมด', search: 'RPG', favorites: new Set(), sort: 'name-asc' });
    expect(filtered).toHaveLength(2);
    expect(getVisibleGames(filtered, 'RPG', 1)).toHaveLength(2);
  });
});
