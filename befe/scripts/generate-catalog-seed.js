const fs = require('fs');
const path = require('path');
const games = require('../data/games.json');
if (new Set(games.map(g => g.id)).size !== games.length) throw new Error('Duplicate game IDs found');
if (new Set(games.map(g => g.title.trim().toLowerCase())).size !== games.length) throw new Error('Duplicate game titles found');
const q = value => value == null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
const rows = games.map(g => `(${g.id},${q(g.title)},${q(g.genre)},${q(g.platform)},${g.year == null ? 'NULL' : g.year},${q(g.image)},${q(g.description)})`);
const sql = `-- Game catalog only. No ratings or votes are inserted.\ninsert into public.games (id,title,genre,platform,year,image,description) values\n${rows.join(',\n')}\non conflict (id) do update set title=excluded.title,genre=excluded.genre,platform=excluded.platform,year=excluded.year,image=excluded.image,description=excluded.description;\nselect setval(pg_get_serial_sequence('public.games','id'), (select max(id) from public.games));\n`;
fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), sql);
console.log(`Generated seed for ${games.length} games`);


