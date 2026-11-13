const OSU_ARTWORK =
  "https://upload.wikimedia.org/wikipedia/commons/2/29/Osu%21_logo_2024.png";

export function withKnownGameArtwork(game) {
  if (/^osu!?$/i.test(String(game?.title || "").trim())) {
    return { ...game, image: OSU_ARTWORK, imageFit: "contain" };
  }

  return game;
}
