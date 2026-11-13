package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type server struct {
	client  *http.Client
	baseURL string
	apiKey  string
}

type authUser struct {
	ID           string                 `json:"id"`
	Email        string                 `json:"email"`
	UserMetadata map[string]interface{} `json:"user_metadata"`
	AppMetadata  map[string]interface{} `json:"app_metadata"`
}

func main() {
	s := &server{
		client:  &http.Client{Timeout: 12 * time.Second},
		baseURL: strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		apiKey:  os.Getenv("SUPABASE_ANON_KEY"),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.health)
	mux.HandleFunc("/api/config", s.config)
	mux.HandleFunc("/api/games", s.games)
	mux.HandleFunc("/api/reviews", s.reviews)
	mux.HandleFunc("/api/games/", s.gameRoutes)
	mux.HandleFunc("/api/me/favorites", s.favorites)
	mux.HandleFunc("/api/me/favorites/", s.favorite)
	mux.HandleFunc("/api/admin/", s.adminRoutes)
	mux.HandleFunc("/", s.static)

	port := os.Getenv("PORT")
	if port == "" {
		port = "10000"
	}
	addr := ":" + port
	log.Printf("PLAYLOG Go API listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, s.cors(mux)))
}

func (s *server) cors(next http.Handler) http.Handler {
	allowed := strings.Split(os.Getenv("FRONTEND_ORIGIN"), ",")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			ok := len(allowed) == 0 || len(allowed) == 1 && allowed[0] == ""
			for _, candidate := range allowed {
				if strings.TrimSpace(candidate) == origin {
					ok = true
				}
			}
			if renderOrigin := os.Getenv("RENDER_EXTERNAL_URL"); renderOrigin != "" && origin == renderOrigin {
				ok = true
			}
			if !ok {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "Origin is not allowed by CORS"})
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.baseURL == "" || s.apiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "Supabase is not configured")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) config(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if s.baseURL == "" || s.apiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "Supabase is not configured")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]string{
		"apiBase":         strings.TrimRight(os.Getenv("PUBLIC_API_URL"), "/"),
		"supabaseUrl":     s.baseURL,
		"supabaseAnonKey": s.apiKey,
	})
}

func (s *server) games(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	var games []map[string]interface{}
	var stats []map[string]interface{}
	if err := s.getJSON("/rest/v1/games?select=id,title,genre,platform,year,image,store_name,store_url,description&order=id.asc", "", &games); err != nil {
		s.dbError(w, err)
		return
	}
	if err := s.getJSON("/rest/v1/game_rating_summary?select=game_id,average_rating,vote_count", "", &stats); err != nil {
		s.dbError(w, err)
		return
	}
	summary := make(map[string]map[string]interface{}, len(stats))
	for _, row := range stats {
		summary[fmt.Sprint(row["game_id"])] = row
	}
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	genre := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("genre")))
	results := make([]map[string]interface{}, 0, len(games))
	for _, game := range games {
		if q != "" && !strings.Contains(strings.ToLower(fmt.Sprint(game["title"])+" "+fmt.Sprint(game["genre"])+" "+fmt.Sprint(game["description"])), q) {
			continue
		}
		if genre != "" && genre != "ทั้งหมด" && !strings.Contains(strings.ToLower(fmt.Sprint(game["genre"])), genre) {
			continue
		}
		stat, exists := summary[fmt.Sprint(game["id"])]
		if exists {
			game["average_rating"] = stat["average_rating"]
			game["vote_count"] = stat["vote_count"]
		} else {
			game["average_rating"] = nil
			game["vote_count"] = 0
		}
		results = append(results, game)
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]interface{}{"games": results, "total": len(results)})
}

func (s *server) reviews(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 2
	}
	if limit > 10 {
		limit = 10
	}
	var rows []map[string]interface{}
	path := fmt.Sprintf("/rest/v1/review_feed?select=id,game_id,game_title,body,author_name,score,created_at&order=created_at.desc&limit=%d", limit)
	if err := s.getJSON(path, "", &rows); err != nil {
		s.dbError(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, map[string]interface{}{"reviews": rows, "total": len(rows)})
}

func (s *server) gameRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/games/"), "/"), "/")
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}
	gameID, err := strconv.Atoi(parts[0])
	if err != nil || gameID < 1 {
		writeError(w, http.StatusBadRequest, "รหัสเกมไม่ถูกต้อง")
		return
	}
	switch parts[1] {
	case "ratings":
		s.ratings(w, r, gameID)
	case "reviews":
		s.gameReviews(w, r, gameID)
	default:
		http.NotFound(w, r)
	}
}

func (s *server) ratings(w http.ResponseWriter, r *http.Request, gameID int) {
	if r.Method == http.MethodGet {
		var rows []map[string]interface{}
		path := fmt.Sprintf("/rest/v1/game_rating_summary?select=average_rating,vote_count&game_id=eq.%d", gameID)
		if err := s.getJSON(path, "", &rows); err != nil {
			s.dbError(w, err)
			return
		}
		var average interface{}
		votes := 0
		if len(rows) > 0 {
			average = rows[0]["average_rating"]
			votes, _ = strconv.Atoi(fmt.Sprint(rows[0]["vote_count"]))
		}
		var userRating interface{}
		if token := bearer(r); token != "" {
			var userRows []map[string]interface{}
			path := fmt.Sprintf("/rest/v1/ratings?select=score&game_id=eq.%d&limit=1", gameID)
			if err := s.getJSON(path, token, &userRows); err == nil && len(userRows) > 0 {
				userRating = userRows[0]["score"]
			}
		}
		w.Header().Set("Cache-Control", "no-store")
		writeJSON(w, http.StatusOK, map[string]interface{}{"average_rating": average, "vote_count": votes, "user_rating": userRating})
		return
	}
	if r.Method != http.MethodPut {
		methodNotAllowed(w)
		return
	}
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var input struct {
		Score int `json:"score"`
	}
	if !decodeBody(w, r, &input) || input.Score < 1 || input.Score > 10 {
		writeError(w, http.StatusBadRequest, "คะแนนต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 10")
		return
	}
	body, _ := json.Marshal(map[string]interface{}{"game_id": gameID, "user_id": user.ID, "score": input.Score, "updated_at": time.Now().UTC().Format(time.RFC3339Nano)})
	if _, _, err := s.request(http.MethodPost, "/rest/v1/ratings?on_conflict=game_id,user_id", token, body, "resolution=merge-duplicates,return=minimal"); err != nil {
		s.dbError(w, err)
		return
	}
	var rows []map[string]interface{}
	if err := s.getJSON(fmt.Sprintf("/rest/v1/game_rating_summary?select=average_rating,vote_count&game_id=eq.%d", gameID), "", &rows); err != nil {
		s.dbError(w, err)
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusNotFound, "ไม่พบเกมนี้")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"average_rating": rows[0]["average_rating"], "vote_count": rows[0]["vote_count"], "user_rating": input.Score})
}

func (s *server) gameReviews(w http.ResponseWriter, r *http.Request, gameID int) {
	if r.Method == http.MethodGet {
		var rows []map[string]interface{}
		path := fmt.Sprintf("/rest/v1/review_feed?select=id,game_id,game_title,body,author_name,score,created_at&game_id=eq.%d&order=created_at.desc&limit=50", gameID)
		if err := s.getJSON(path, "", &rows); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"reviews": rows})
		return
	}
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var input struct {
		Body string `json:"body"`
	}
	if !decodeBody(w, r, &input) {
		return
	}
	input.Body = strings.TrimSpace(input.Body)
	if len([]rune(input.Body)) < 2 || len([]rune(input.Body)) > 1000 {
		writeError(w, http.StatusBadRequest, "รีวิวต้องมีความยาว 2–1,000 ตัวอักษร")
		return
	}
	name := "ผู้เล่น"
	if value, ok := user.UserMetadata["display_name"].(string); ok && strings.TrimSpace(value) != "" {
		name = value
	} else if user.Email != "" {
		name = strings.Split(user.Email, "@")[0]
	}
	if len([]rune(name)) > 32 {
		name = string([]rune(name)[:32])
	}
	body, _ := json.Marshal(map[string]interface{}{"game_id": gameID, "user_id": user.ID, "author_name": name, "body": input.Body})
	data, status, err := s.request(http.MethodPost, "/rest/v1/reviews?select=id,game_id,body,author_name,created_at", token, body, "return=representation")
	if err != nil {
		writeError(w, mapUpstreamStatus(status), "ไม่สามารถเผยแพร่รีวิวได้ในขณะนี้")
		return
	}
	var rows []map[string]interface{}
	if json.Unmarshal(data, &rows) != nil || len(rows) == 0 {
		writeError(w, http.StatusInternalServerError, "ไม่สามารถอ่านข้อมูลรีวิวได้")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{"review": rows[0]})
}

func (s *server) favorites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	var rows []map[string]interface{}
	path := "/rest/v1/favorites?select=game_id&user_id=eq." + url.QueryEscape(user.ID)
	if err := s.getJSON(path, token, &rows); err != nil {
		s.dbError(w, err)
		return
	}
	ids := make([]interface{}, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row["game_id"])
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"favorites": ids})
}

func (s *server) favorite(w http.ResponseWriter, r *http.Request) {
	gameID, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/api/me/favorites/"))
	if err != nil || gameID < 1 {
		writeError(w, http.StatusBadRequest, "รหัสเกมไม่ถูกต้อง")
		return
	}
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodPut:
		body, _ := json.Marshal(map[string]interface{}{"game_id": gameID, "user_id": user.ID})
		if _, _, err := s.request(http.MethodPost, "/rest/v1/favorites?on_conflict=game_id,user_id", token, body, "resolution=merge-duplicates,return=minimal"); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"favorite": true, "game_id": gameID})
	case http.MethodDelete:
		path := fmt.Sprintf("/rest/v1/favorites?game_id=eq.%d&user_id=eq.%s", gameID, url.QueryEscape(user.ID))
		if _, _, err := s.request(http.MethodDelete, path, token, nil, "return=minimal"); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"favorite": false, "game_id": gameID})
	default:
		methodNotAllowed(w)
	}
}

func (s *server) adminRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/admin/"), "/")
	user, token, ok := s.requireAdmin(w, r)
	if !ok {
		return
	}
	if path == "me" && r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, map[string]interface{}{"id": user.ID, "email": user.Email, "role": "admin"})
		return
	}
	if path == "games" {
		s.adminGames(w, r, token)
		return
	}
	if strings.HasPrefix(path, "games/") {
		id, err := strconv.Atoi(strings.TrimPrefix(path, "games/"))
		if err != nil || id < 1 {
			writeError(w, http.StatusBadRequest, "รหัสเกมไม่ถูกต้อง")
			return
		}
		s.adminGame(w, r, token, id)
		return
	}
	if path == "reviews" && r.Method == http.MethodGet {
		s.adminReviews(w, r)
		return
	}
	if strings.HasPrefix(path, "reviews/") && r.Method == http.MethodDelete {
		id := strings.TrimPrefix(path, "reviews/")
		if _, err := strconv.ParseInt(id, 10, 64); err != nil {
			writeError(w, http.StatusBadRequest, "รหัสรีวิวไม่ถูกต้อง")
			return
		}
		if _, _, err := s.request(http.MethodDelete, "/rest/v1/reviews?id=eq."+url.QueryEscape(id), token, nil, "return=minimal"); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
		return
	}
	http.NotFound(w, r)
}

func (s *server) adminGames(w http.ResponseWriter, r *http.Request, token string) {
	switch r.Method {
	case http.MethodGet:
		var games []map[string]interface{}
		if err := s.getJSON("/rest/v1/games?select=id,title,genre,platform,year,image,store_name,store_url,description&order=id.asc", token, &games); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"games": games})
	case http.MethodPost:
		var game gameInput
		if !decodeBody(w, r, &game) || !validGame(game) {
			writeError(w, http.StatusBadRequest, "กรอกข้อมูลเกมให้ครบและตรวจสอบปีที่วางจำหน่าย")
			return
		}
		body, _ := json.Marshal(game)
		data, _, err := s.request(http.MethodPost, "/rest/v1/games?select=id,title,genre,platform,year,image,store_name,store_url,description", token, body, "return=representation")
		if err != nil {
			s.dbError(w, err)
			return
		}
		var rows []map[string]interface{}
		if json.Unmarshal(data, &rows) != nil || len(rows) == 0 {
			writeError(w, http.StatusInternalServerError, "ไม่สามารถอ่านข้อมูลเกมที่เพิ่มได้")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"game": rows[0]})
	default:
		methodNotAllowed(w)
	}
}

func (s *server) adminGame(w http.ResponseWriter, r *http.Request, token string, id int) {
	switch r.Method {
	case http.MethodPut:
		var game gameInput
		if !decodeBody(w, r, &game) || !validGame(game) {
			writeError(w, http.StatusBadRequest, "กรอกข้อมูลเกมให้ครบและตรวจสอบปีที่วางจำหน่าย")
			return
		}
		body, _ := json.Marshal(game)
		data, _, err := s.request(http.MethodPatch, fmt.Sprintf("/rest/v1/games?id=eq.%d&select=id,title,genre,platform,year,image,store_name,store_url,description", id), token, body, "return=representation")
		if err != nil {
			s.dbError(w, err)
			return
		}
		var rows []map[string]interface{}
		if json.Unmarshal(data, &rows) != nil || len(rows) == 0 {
			writeError(w, http.StatusNotFound, "ไม่พบเกมนี้")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"game": rows[0]})
	case http.MethodDelete:
		if _, _, err := s.request(http.MethodDelete, fmt.Sprintf("/rest/v1/games?id=eq.%d", id), token, nil, "return=minimal"); err != nil {
			s.dbError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
	default:
		methodNotAllowed(w)
	}
}

func (s *server) adminReviews(w http.ResponseWriter, r *http.Request) {
	var rows []map[string]interface{}
	if err := s.getJSON("/rest/v1/review_feed?select=id,game_id,game_title,body,author_name,score,created_at&order=created_at.desc&limit=200", "", &rows); err != nil {
		s.dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"reviews": rows})
}

type gameInput struct {
	Title       string `json:"title"`
	Genre       string `json:"genre"`
	Platform    string `json:"platform"`
	Year        int    `json:"year"`
	Image       string `json:"image"`
	StoreName   string `json:"store_name"`
	StoreURL    string `json:"store_url"`
	Description string `json:"description"`
}

func validGame(game gameInput) bool {
	return strings.TrimSpace(game.Title) != "" && strings.TrimSpace(game.Genre) != "" &&
		strings.TrimSpace(game.Platform) != "" && game.Year >= 1970 && game.Year <= 2200 &&
		strings.HasPrefix(game.Image, "https://") && strings.TrimSpace(game.StoreName) != "" && strings.HasPrefix(game.StoreURL, "https://") && strings.TrimSpace(game.Description) != ""
}

func (s *server) requireAdmin(w http.ResponseWriter, r *http.Request) (authUser, string, bool) {
	user, token, ok := s.requireUser(w, r)
	if !ok {
		return authUser{}, "", false
	}
	if role, _ := user.AppMetadata["role"].(string); role != "admin" {
		writeError(w, http.StatusForbidden, "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ")
		return authUser{}, "", false
	}
	return user, token, true
}

func (s *server) requireUser(w http.ResponseWriter, r *http.Request) (authUser, string, bool) {
	token := bearer(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "ต้องเข้าสู่ระบบก่อน")
		return authUser{}, "", false
	}
	data, status, err := s.request(http.MethodGet, "/auth/v1/user", token, nil, "")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
		return authUser{}, "", false
	}
	var user authUser
	if json.Unmarshal(data, &user) != nil || user.ID == "" {
		writeError(w, mapUpstreamStatus(status), "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
		return authUser{}, "", false
	}
	return user, token, true
}

func (s *server) getJSON(path, token string, target interface{}) error {
	data, _, err := s.request(http.MethodGet, path, token, nil, "")
	if err != nil {
		return err
	}
	if err := json.Unmarshal(data, target); err != nil {
		return fmt.Errorf("invalid Supabase response: %w", err)
	}
	return nil
}

func (s *server) request(method, path, token string, body []byte, prefer string) ([]byte, int, error) {
	if s.baseURL == "" || s.apiKey == "" {
		return nil, 0, errors.New("Supabase is not configured")
	}
	endpoint := s.baseURL + path
	req, err := http.NewRequest(method, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("apikey", s.apiKey)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return data, resp.StatusCode, fmt.Errorf("Supabase returned %d", resp.StatusCode)
	}
	return data, resp.StatusCode, nil
}

func (s *server) dbError(w http.ResponseWriter, err error) {
	log.Printf("Supabase request failed: %v", err)
	writeError(w, http.StatusInternalServerError, "ไม่สามารถอ่านหรือบันทึกข้อมูลได้ในขณะนี้")
}

func (s *server) static(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		http.NotFound(w, r)
		return
	}
	root := filepath.Join("build")
	indexFile := filepath.Join(root, "index.html")
	if _, err := os.Stat(indexFile); err != nil {
		http.Error(w, "Frontend build not found. Run npm run build.", http.StatusServiceUnavailable)
		return
	}
	file := filepath.Join(root, filepath.Clean("/"+r.URL.Path))
	if info, err := os.Stat(file); err == nil && !info.IsDir() {
		http.ServeFile(w, r, file)
		return
	}
	http.ServeFile(w, r, indexFile)
}

func bearer(r *http.Request) string {
	value := r.Header.Get("Authorization")
	if strings.HasPrefix(value, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(value, "Bearer "))
	}
	return ""
}

func decodeBody(w http.ResponseWriter, r *http.Request, target interface{}) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
		return false
	}
	return true
}

func mapUpstreamStatus(status int) int {
	if status >= 400 && status <= 599 {
		return status
	}
	return http.StatusInternalServerError
}

func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
}
