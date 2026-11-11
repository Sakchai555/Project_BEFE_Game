export function storesFor(game) {
  if (game.store_url) return [{ label: game.store_name || 'แหล่งจำหน่ายเกม', url: game.store_url }];
  const title = game.title.toLowerCase();
  if (title === 'valorant') return [{ label: 'Riot Client', url: 'https://playvalorant.com/' }];
  if (title === 'league of legends') return [{ label: 'Riot Client', url: 'https://www.leagueoflegends.com/' }];
  if (title === 'fortnite') return [{ label: 'Epic Games Store', url: 'https://store.epicgames.com/p/fortnite' }];
  if (title === 'alan wake 2') return [{ label: 'Epic Games Store', url: 'https://store.epicgames.com/p/alan-wake-2' }];
  if (title === 'minecraft') return [{ label: 'Minecraft.net', url: 'https://www.minecraft.net/' }];
  if (title === 'starcraft ii') return [{ label: 'Battle.net', url: 'https://us.shop.battle.net/en-us/family/starcraft-ii' }];
  if (title === 'bloodborne') return [{ label: 'PlayStation Store', url: 'https://store.playstation.com/en-us/search/bloodborne' }];
  if (title === "demon's souls") return [{ label: 'PlayStation Store', url: 'https://store.playstation.com/en-us/search/demons-souls' }];
  if (title === 'gran turismo 7') return [{ label: 'PlayStation Store', url: 'https://store.playstation.com/en-us/search/gran-turismo-7' }];
  if (title === 'overwatch 2') return [{ label: 'Steam', url: 'https://store.steampowered.com/app/2357570/' }];
  if (title === 'nioh 2') return [{ label: 'Steam', url: 'https://store.steampowered.com/app/1325200/' }];
  const nintendo = ['metroid dread', 'super mario odyssey', 'super mario bros. wonder', 'mario kart 8 deluxe', 'the legend of zelda: breath of the wild', 'the legend of zelda: tears of the kingdom', 'animal crossing: new horizons', 'pokémon scarlet and violet', 'pokémon legends: arceus', 'fire emblem: three houses', 'splatoon 3', 'super smash bros. ultimate', "luigi's mansion 3", 'pikmin 4'];
  if (nintendo.includes(title)) return [{ label: 'Nintendo eShop', url: `https://www.nintendo.com/us/search/#q=${encodeURIComponent(game.title)}` }];
  const appId = (game.image || '').match(/steam\/apps\/(\d+)/i)?.[1];
  if (appId) return [{ label: 'Steam', url: `https://store.steampowered.com/app/${appId}/` }];
  return [{ label: 'ค้นหาเกมบน Steam', url: `https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}` }];
}
