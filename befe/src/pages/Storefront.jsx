import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { request } from "../services/api";
import { userLabel, profileErrorMessage } from "../utils/account";
import { storesFor } from "../utils/gameStores";
import { filterGames, getRevealStep, getVisibleGames } from "../catalog";
import StoreHeader from "../components/storefront/StoreHeader";
import HeroCarousel from "../components/storefront/HeroCarousel";
import GameCatalog from "../components/storefront/GameCatalog";
import CommunitySection from "../components/storefront/CommunitySection";
import StoreFooter from "../components/storefront/StoreFooter";
import { GameDialog } from "../components/dialogs/GameDialog";
import { AuthDialog } from "../components/dialogs/AuthDialog";
import { ProfileDialog } from "../components/dialogs/ProfileDialog";
import { ReviewDialog } from "../components/dialogs/ReviewDialog";

export default function Storefront() {
  const [apiBase, setApiBase] = useState("");
  const [configReady, setConfigReady] = useState(false);
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [genre, setGenre] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rating-desc");
  const [visibleCount, setVisibleCount] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [dialogClosing, setDialogClosing] = useState(false);
  const [switchingGame, setSwitchingGame] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewGameId, setReviewGameId] = useState("");
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [toast, setToast] = useState(null);
  const [showPageArrow, setShowPageArrow] = useState(false);
  const [showUpArrow, setShowUpArrow] = useState(false);
  const gridRef = useRef(null);
  const heroRef = useRef(null);
  const heroTrackRef = useRef(null);
  const gameDialogRef = useRef(null);
  const authDialogRef = useRef(null);
  const profileDialogRef = useRef(null);
  const reviewDialogRef = useRef(null);
  const activeGameId = useRef(null);
  const closeTimer = useRef(null);
  const switchTimer = useRef(null);
  const arrowTimer = useRef(null);
  const arrowPending = useRef(null);
  const toastTimer = useRef(null);

  const currentUser = session?.user || null;
  const admin = currentUser?.app_metadata?.role === "admin";

  const notify = useCallback((message, type = "success") => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/config");
        const config = await response.json().catch(() => ({}));
        if (!response.ok || !config.supabaseUrl || !config.supabaseAnonKey)
          throw new Error(config.error || "ยังไม่ได้เชื่อมต่อ Supabase");
        if (!window.supabase?.createClient)
          throw new Error("โหลด Supabase Auth ไม่สำเร็จ");
        const supabase = window.supabase.createClient(
          config.supabaseUrl,
          config.supabaseAnonKey,
        );
        if (!active) return;
        setApiBase(config.apiBase || "");
        setClient(supabase);
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active) setSession(data.session);
        supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (active) setSession(nextSession);
        });
      } catch (error) {
        if (active) setAuthError(error.message);
      } finally {
        if (active) setConfigReady(true);
      }
    })();
    return () => {
      active = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!configReady || authError) return;
    setGamesLoading(true);
    request("/api/games", {}, apiBase)
      .then((data) => setGames(data.games || []))
      .catch((error) => setAuthError(error.message))
      .finally(() => setGamesLoading(false));
  }, [apiBase, configReady, authError]);

  useEffect(() => {
    if (!session?.user) {
      setFavorites(new Set());
      if (genre === "เกมโปรด") setGenre("ทั้งหมด");
      return;
    }
    request("/api/me/favorites", {}, apiBase, session.access_token)
      .then((data) => setFavorites(new Set((data.favorites || []).map(Number))))
      .catch(() => setFavorites(new Set()));
  }, [session, apiBase]);

  useEffect(() => {
    const dialog = gameDialogRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);
  useEffect(() => {
    if (authOpen && authDialogRef.current && !authDialogRef.current.open)
      authDialogRef.current.showModal();
    if (!authOpen && authDialogRef.current?.open) authDialogRef.current.close();
  }, [authOpen]);
  useEffect(() => {
    if (
      profileOpen &&
      profileDialogRef.current &&
      !profileDialogRef.current.open
    )
      profileDialogRef.current.showModal();
    if (!profileOpen && profileDialogRef.current?.open)
      profileDialogRef.current.close();
  }, [profileOpen]);
  useEffect(() => {
    if (reviewOpen && reviewDialogRef.current && !reviewDialogRef.current.open)
      reviewDialogRef.current.showModal();
    if (!reviewOpen && reviewDialogRef.current?.open)
      reviewDialogRef.current.close();
  }, [reviewOpen]);

  useEffect(() => {
    const update = () => {
      const max = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (max <= 40 || window.scrollY < max * 0.15) {
        clearTimeout(arrowTimer.current);
        arrowPending.current = null;
        setShowPageArrow(false);
        return;
      }
      const up = window.scrollY >= max / 2;
      if (arrowPending.current === up) return;
      clearTimeout(arrowTimer.current);
      arrowPending.current = up;
      arrowTimer.current = setTimeout(() => {
        setShowUpArrow(up);
        setShowPageArrow(true);
        arrowPending.current = null;
      }, 140);
    };
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
      clearTimeout(arrowTimer.current);
    };
  }, []);

  const api = useCallback(
    (path, options = {}) =>
      request(path, options, apiBase, session?.access_token || ""),
    [apiBase, session],
  );

  const loadReviews = useCallback(
    async (gameId) => {
      setReviewLoading(true);
      setReviews([]);
      try {
        const data = await api(`/api/games/${gameId}/reviews`);
        if (Number(activeGameId.current) === Number(gameId))
          setReviews(data.reviews || []);
      } catch {
        if (Number(activeGameId.current) === Number(gameId)) setReviews([]);
      } finally {
        if (Number(activeGameId.current) === Number(gameId))
          setReviewLoading(false);
      }
    },
    [api],
  );

  const loadRating = useCallback(
    async (gameId) => {
      try {
        const data = await api(`/api/games/${gameId}/ratings`);
        setGames((list) =>
          list.map((game) =>
            Number(game.id) === Number(gameId) ? { ...game, ...data } : game,
          ),
        );
        setSelected((game) =>
          game && Number(game.id) === Number(gameId)
            ? { ...game, ...data }
            : game,
        );
      } catch {
        /* rating summary remains visible if a user-specific request is unavailable */
      }
    },
    [api],
  );

  const showGame = useCallback(
    (gameId) => {
      const game = games.find((item) => Number(item.id) === Number(gameId));
      if (!game) return;
      activeGameId.current = Number(game.id);
      setSelected(game);
      setDialogClosing(false);
      setComment("");
      loadReviews(game.id);
      loadRating(game.id);
    },
    [games, loadRating, loadReviews],
  );

  const closeGame = () => {
    if (dialogClosing) return;
    setDialogClosing(true);
    closeTimer.current = setTimeout(
      () => {
        setSelected(null);
        setDialogClosing(false);
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 190,
    );
  };

  const switchSimilarGame = (gameId) => {
    const layout = document.querySelector(".detail-layout");
    const discussion = document.querySelector(".detail-community");
    setSwitchingGame(true);
    layout?.classList.add("is-switching");
    discussion?.classList.add("is-switching");
    clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => {
      const game = games.find((item) => Number(item.id) === Number(gameId));
      if (!game) return;
      activeGameId.current = Number(game.id);
      setSelected(game);
      setComment("");
      loadReviews(game.id);
      loadRating(game.id);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          layout?.classList.remove("is-switching");
          discussion?.classList.remove("is-switching");
          setSwitchingGame(false);
        }),
      );
    }, 160);
  };

  const continuePending = async () => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;
    if (action.type === "favorite") await toggleFavorite(action.gameId);
    else if (action.type === "rating")
      await rateGame(action.gameId, action.score);
    else if (action.type === "review") openReview();
    else if (action.type === "comment")
      await publishComment(action.gameId, action.body);
    else if (action.type === "favorites-filter") setGenre("เกมโปรด");
  };

  const openAuth = (action) => {
    setPendingAction(action || null);
    setAuthMode("login");
    setAuthError("");
    setAuthOpen(true);
  };

  const openProfile = () => {
    setProfileName(currentUser?.user_metadata?.display_name || "");
    setProfilePassword("");
    setProfilePasswordConfirm("");
    setProfileError("");
    setProfileOpen(true);
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setProfileError("");
    if (!client || !currentUser) {
      setProfileError("กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง");
      return;
    }
    const name = profileName.trim();
    if (!name || name.length > 32) {
      setProfileError("ชื่อที่แสดงต้องมีความยาว 1–32 ตัวอักษร");
      return;
    }
    if (profilePassword || profilePasswordConfirm) {
      if (profilePassword.length < 8) {
        setProfileError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
        return;
      }
      if (profilePassword !== profilePasswordConfirm) {
        setProfileError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
        return;
      }
    }
    const updates = {};
    if (name !== (currentUser.user_metadata?.display_name || ""))
      updates.data = { display_name: name };
    if (profilePassword) updates.password = profilePassword;
    if (!Object.keys(updates).length) {
      setProfileError("ยังไม่มีข้อมูลที่เปลี่ยนแปลง");
      return;
    }
    setProfileBusy(true);
    try {
      if (updates.data?.display_name) {
        const { data: nameAvailable, error: availabilityError } =
          await client.rpc("is_display_name_available", { p_name: name });
        if (availabilityError)
          throw new Error("ตรวจสอบชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        if (!nameAvailable)
          throw new Error("ชื่อนี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ");
      }
      const { data, error } = await client.auth.updateUser(updates);
      if (error) throw error;
      if (data.user)
        setSession((current) =>
          current
            ? { ...current, user: { ...current.user, ...data.user } }
            : current,
        );
      setProfileOpen(false);
      notify("บันทึกโปรไฟล์แล้ว");
    } catch (error) {
      setProfileError(profileErrorMessage(error, "บันทึกโปรไฟล์ไม่สำเร็จ"));
    } finally {
      setProfileBusy(false);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    if (!client) {
      setAuthError("ยังเชื่อมต่อระบบบัญชีไม่ได้");
      return;
    }
    if (authMode === "signup" && authPassword !== authConfirm) {
      setAuthError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { data: nameAvailable, error: availabilityError } =
          await client.rpc("is_display_name_available", {
            p_name: authName.trim(),
          });
        if (availabilityError)
          throw new Error("ตรวจสอบชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        if (!nameAvailable) {
          setAuthError("ชื่อนี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ");
          return;
        }
        const { data, error } = await client.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { display_name: authName.trim() } },
        });
        if (error) throw error;
        if (
          Array.isArray(data.user?.identities) &&
          data.user.identities.length === 0
        ) {
          setAuthError("อีเมลนี้สมัครไว้แล้ว");
          return;
        }
        if (data.session) setSession(data.session);
        else {
          setAuthError("สมัครแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
          setAuthMode("login");
          return;
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setSession(data.session);
      }
      setAuthOpen(false);
      notify(
        authMode === "signup" ? "สร้างบัญชีเรียบร้อยแล้ว" : "เข้าสู่ระบบแล้ว",
      );
      setTimeout(() => {
        void continuePending();
      }, 0);
    } catch (error) {
      setAuthError(
        authMode === "signup"
          ? profileErrorMessage(error, "สมัครสมาชิกไม่สำเร็จ")
          : error.message || "เข้าสู่ระบบไม่สำเร็จ",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const rateGame = async (gameId, score) => {
    if (!currentUser) {
      openAuth({ type: "rating", gameId, score });
      return;
    }
    try {
      const data = await api(`/api/games/${gameId}/ratings`, {
        method: "PUT",
        body: JSON.stringify({ score }),
      });
      setGames((list) =>
        list.map((game) =>
          Number(game.id) === Number(gameId) ? { ...game, ...data } : game,
        ),
      );
      setSelected((game) =>
        game && Number(game.id) === Number(gameId)
          ? { ...game, ...data }
          : game,
      );
      notify("บันทึกคะแนนแล้ว");
    } catch (error) {
      notify(error.message || "บันทึกคะแนนไม่สำเร็จ", "error");
    }
  };

  const toggleFavorite = async (gameId) => {
    if (!currentUser) {
      openAuth({ type: "favorite", gameId });
      return;
    }
    const wasSaved = favorites.has(Number(gameId));
    try {
      await api(`/api/me/favorites/${gameId}`, {
        method: wasSaved ? "DELETE" : "PUT",
      });
      setFavorites((list) => {
        const next = new Set(list);
        wasSaved ? next.delete(Number(gameId)) : next.add(Number(gameId));
        return next;
      });
      notify(
        wasSaved ? "นำเกมออกจากรายการโปรดแล้ว" : "เพิ่มเกมในรายการโปรดแล้ว",
      );
    } catch (error) {
      notify(error.message || "บันทึกรายการโปรดไม่สำเร็จ", "error");
    }
  };

  const openReview = () => {
    if (!currentUser) {
      openAuth({ type: "review" });
      return;
    }
    setReviewGameId(String(selected?.id || games[0]?.id || ""));
    setReviewScore(0);
    setReviewText("");
    setReviewOpen(true);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      setReviewOpen(false);
      openAuth({ type: "review" });
      return;
    }
    if (!reviewScore) {
      notify("เลือกคะแนน 1–10 ก่อนนะ", "error");
      return;
    }
    const id = Number(reviewGameId);
    const body = reviewText.trim();
    try {
      await api(`/api/games/${id}/ratings`, {
        method: "PUT",
        body: JSON.stringify({ score: reviewScore }),
      });
      await api(`/api/games/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setReviewOpen(false);
      notify("เผยแพร่รีวิวแล้ว");
      const [list, summary] = await Promise.all([
        api("/api/games"),
        api(`/api/games/${id}/ratings`),
      ]);
      setGames(
        (list.games || []).map((game) =>
          Number(game.id) === id ? { ...game, ...summary } : game,
        ),
      );
      if (Number(activeGameId.current) === id) {
        await loadReviews(id);
        setSelected((game) =>
          game && Number(game.id) === id ? { ...game, ...summary } : game,
        );
      }
    } catch (error) {
      notify(error.message || "ส่งรีวิวไม่สำเร็จ", "error");
    }
  };

  const publishComment = async (gameId, body) => {
    if (!currentUser) {
      openAuth({ type: "comment", gameId, body });
      return;
    }
    try {
      await api(`/api/games/${gameId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setComment("");
      notify("ส่งคอมเมนต์แล้ว");
      await loadReviews(gameId);
    } catch (error) {
      notify(error.message || "ส่งคอมเมนต์ไม่สำเร็จ", "error");
    }
  };

  const list = useMemo(() => {
    return filterGames(games, { genre, search, favorites, sort });
  }, [games, search, genre, favorites, sort]);

  const revealStep = getRevealStep(list.length);
  const isSearching = Boolean(search.trim());
  const visibleGames = getVisibleGames(list, search, visibleCount);
  useEffect(() => {
    setVisibleCount(null);
  }, [genre, search, sort, favorites]);
  const communityPicks = useMemo(() => {
    const rated = games
      .filter((game) => Number(game.vote_count) > 0)
      .sort(
        (a, b) =>
          Number(b.vote_count || 0) - Number(a.vote_count || 0) ||
          Number(b.average_rating || 0) - Number(a.average_rating || 0),
      );
    return {
      games: (rated.length ? rated : games).slice(0, 3),
      ratedCount: rated.length,
    };
  }, [games]);
  const featured = useMemo(
    () =>
      games.filter(
        (game) =>
          !/\b(?:dlc|expansion|season pass|add-on)\b|shadow of the erdtree/i.test(
            game.title,
          ),
      ),
    [games],
  );
  const selectedStoreLinks = selected ? storesFor(selected) : [];
  const similarGames = selected
    ? games
        .filter((game) => Number(game.id) !== Number(selected.id))
        .map((game) => ({
          game,
          shared: game.genre
            .split("/")
            .map((value) => value.trim())
            .filter((value) =>
              selected.genre
                .split("/")
                .map((item) => item.trim().toLowerCase())
                .includes(value.toLowerCase()),
            ),
        }))
        .filter((item) => item.shared.length)
        .sort(
          (a, b) =>
            b.shared.length - a.shared.length ||
            Number(b.game.average_rating ?? -1) -
              Number(a.game.average_rating ?? -1) ||
            Number(b.game.vote_count || 0) - Number(a.game.vote_count || 0),
        )
        .slice(0, 3)
    : [];

  const scrollHero = (direction) => {
    const viewport = heroRef.current;
    if (!viewport || !featured.length) return;
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    const target = (index + direction + featured.length) % featured.length;
    viewport.scrollTo({
      left: target * viewport.clientWidth,
      behavior: "smooth",
    });
  };
  const scrollToEdge = (direction) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({
        top: direction === "top" ? 0 : document.documentElement.scrollHeight,
        behavior: "instant",
      });
      return;
    }
    const start = window.scrollY,
      max = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
      target = direction === "top" ? 0 : max,
      began = performance.now(),
      duration = 680;
    const frame = (now) => {
      const progress = Math.min(1, (now - began) / duration),
        ease =
          progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({
        top: start + (target - start) * ease,
        behavior: "instant",
      });
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  if (authError && !games.length)
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="dialog-card">
          <h2>เชื่อมต่อระบบไม่สำเร็จ</h2>
          <p>{authError}</p>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col storefront-page-enter">
      <StoreHeader
        currentUser={currentUser}
        userLabel={userLabel}
        admin={admin}
        openProfile={openProfile}
        client={client}
        openAuth={openAuth}
        openReview={openReview}
      />
      <main id="top" className="flex-1">
        <HeroCarousel
          heroRef={heroRef}
          heroTrackRef={heroTrackRef}
          featured={featured}
          scrollHero={scrollHero}
          showGame={showGame}
        />
        <GameCatalog
          games={games}
          gamesLoading={gamesLoading}
          search={search}
          setSearch={setSearch}
          genre={genre}
          setGenre={setGenre}
          sort={sort}
          setSort={setSort}
          currentUser={currentUser}
          openAuth={openAuth}
          list={list}
          visibleGames={visibleGames}
          gridRef={gridRef}
          showGame={showGame}
          isSearching={isSearching}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          revealStep={revealStep}
        />
        <CommunitySection
          communityPicks={communityPicks}
          openReview={openReview}
          showGame={showGame}
        />
      </main>
      <StoreFooter />
      <GameDialog
        ref={gameDialogRef}
        game={selected}
        games={games}
        favorites={favorites}
        user={currentUser}
        reviews={reviews}
        reviewLoading={reviewLoading}
        comment={comment}
        setComment={setComment}
        stores={selectedStoreLinks}
        similar={similarGames}
        switching={switchingGame}
        closing={dialogClosing}
        onClose={closeGame}
        onFavorite={() => selected && toggleFavorite(selected.id)}
        onRate={(score) => selected && rateGame(selected.id, score)}
        onComment={() =>
          selected && publishComment(selected.id, comment.trim())
        }
        onSimilar={switchSimilarGame}
        onAuth={() => openAuth(null)}
      />
      <ProfileDialog
        ref={profileDialogRef}
        user={currentUser}
        name={profileName}
        setName={setProfileName}
        password={profilePassword}
        setPassword={setProfilePassword}
        confirm={profilePasswordConfirm}
        setConfirm={setProfilePasswordConfirm}
        error={profileError}
        busy={profileBusy}
        onClose={() => setProfileOpen(false)}
        onSubmit={updateProfile}
      />
      <AuthDialog
        ref={authDialogRef}
        open={authOpen}
        mode={authMode}
        setMode={setAuthMode}
        name={authName}
        setName={setAuthName}
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        confirm={authConfirm}
        setConfirm={setAuthConfirm}
        error={authError}
        busy={authBusy}
        onClose={() => {
          setAuthOpen(false);
          setPendingAction(null);
        }}
        onSubmit={handleAuth}
      />
      <ReviewDialog
        ref={reviewDialogRef}
        open={reviewOpen}
        games={games}
        gameId={reviewGameId}
        setGameId={setReviewGameId}
        score={reviewScore}
        setScore={setReviewScore}
        text={reviewText}
        setText={setReviewText}
        name={currentUser ? userLabel(currentUser) : ""}
        onClose={() => setReviewOpen(false)}
        onSubmit={submitReview}
      />
      <div
        id="appToast"
        className={`app-toast ${toast ? `${toast.type} visible` : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast?.message || ""}
      </div>
      <div
        className={`page-jump-controls ${showPageArrow ? "is-visible" : ""}`}
        aria-label="ปุ่มเลื่อนหน้า"
      >
        <button
          type="button"
          hidden={!showUpArrow || !showPageArrow}
          onClick={() => scrollToEdge("top")}
          aria-label="เลื่อนขึ้นไปบนสุด"
          title="ขึ้นบนสุด"
        >
          <ArrowIcon up />
        </button>
        <button
          type="button"
          hidden={showUpArrow || !showPageArrow}
          onClick={() => scrollToEdge("bottom")}
          aria-label="เลื่อนลงไปล่างสุด"
          title="ลงล่างสุด"
        >
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

function ArrowIcon({ up = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={up ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />
    </svg>
  );
}
