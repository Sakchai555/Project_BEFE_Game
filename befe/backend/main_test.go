package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newAPITest(t *testing.T, upstream http.Handler) (*server, http.Handler) {
	t.Helper()
	upstreamServer := httptest.NewServer(upstream)
	t.Cleanup(upstreamServer.Close)

	api := &server{client: upstreamServer.Client(), baseURL: upstreamServer.URL, apiKey: "test-publishable-key"}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", api.health)
	mux.HandleFunc("/api/config", api.config)
	mux.HandleFunc("/api/games", api.games)
	mux.HandleFunc("/api/reviews", api.reviews)
	mux.HandleFunc("/api/games/", api.gameRoutes)
	mux.HandleFunc("/api/me/favorites", api.favorites)
	mux.HandleFunc("/api/me/favorites/", api.favorite)
	mux.HandleFunc("/api/admin/", api.adminRoutes)
	return api, mux
}

func apiRequest(handler http.Handler, method, path, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, req)
	return response
}

func writeUpstreamJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = io.WriteString(w, body)
}

func TestGuestCanReadFilteredGamesAndAggregatedScores(t *testing.T) {
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("apikey") != "test-publishable-key" {
			t.Errorf("missing Supabase apikey header")
		}
		if r.Header.Get("Authorization") != "" {
			t.Errorf("guest request unexpectedly had an Authorization header")
		}
		switch r.URL.Path {
		case "/rest/v1/games":
			writeUpstreamJSON(w, http.StatusOK, `[{"id":1,"title":"Example RPG","genre":"RPG","description":"A quest"},{"id":2,"title":"Example Racer","genre":"กีฬา","description":"Race"}]`)
		case "/rest/v1/game_rating_summary":
			writeUpstreamJSON(w, http.StatusOK, `[{"game_id":1,"average_rating":8.5,"vote_count":2}]`)
		default:
			t.Errorf("unexpected Supabase path %s", r.URL.Path)
			http.NotFound(w, r)
		}
	})
	_, handler := newAPITest(t, upstream)

	response := apiRequest(handler, http.MethodGet, "/api/games?q=rpg", "", "")
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var result struct {
		Games []struct {
			ID            int     `json:"id"`
			AverageRating float64 `json:"average_rating"`
			VoteCount     int     `json:"vote_count"`
		} `json:"games"`
		Total int `json:"total"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Total != 1 || len(result.Games) != 1 || result.Games[0].ID != 1 {
		t.Fatalf("filtered response = %+v, want only game 1", result)
	}
	if result.Games[0].AverageRating != 8.5 || result.Games[0].VoteCount != 2 {
		t.Fatalf("rating summary = %+v, want 8.5 from 2 votes", result.Games[0])
	}
}

func TestMemberMutationsRequireAuthentication(t *testing.T) {
	upstreamCalls := 0
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamCalls++
		t.Errorf("unauthenticated request reached Supabase: %s %s", r.Method, r.URL.Path)
	})
	_, handler := newAPITest(t, upstream)
	requests := []struct{ method, path, body string }{
		{http.MethodPut, "/api/games/1/ratings", `{"score":8}`},
		{http.MethodPost, "/api/games/1/reviews", `{"body":"Nice"}`},
		{http.MethodGet, "/api/me/favorites", ""},
		{http.MethodPut, "/api/me/favorites/1", ""},
	}
	for _, item := range requests {
		response := apiRequest(handler, item.method, item.path, "", item.body)
		if response.Code != http.StatusUnauthorized {
			t.Errorf("%s %s status = %d, want %d", item.method, item.path, response.Code, http.StatusUnauthorized)
		}
	}
	if upstreamCalls != 0 {
		t.Fatalf("Supabase received %d requests without a member session", upstreamCalls)
	}
}

func TestMemberCanSaveRatingWithOwnIdentity(t *testing.T) {
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/auth/v1/user":
			if r.Header.Get("Authorization") != "Bearer member-token" {
				t.Errorf("user token was not forwarded: %q", r.Header.Get("Authorization"))
			}
			writeUpstreamJSON(w, http.StatusOK, `{"id":"member-1","email":"member@example.com","user_metadata":{"display_name":"Member"},"app_metadata":{"role":"member"}}`)
		case "/rest/v1/ratings":
			var rating map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&rating); err != nil {
				t.Fatal(err)
			}
			if rating["user_id"] != "member-1" || rating["game_id"] != float64(7) || rating["score"] != float64(9) {
				t.Errorf("rating payload = %#v", rating)
			}
			if r.Header.Get("Authorization") != "Bearer member-token" {
				t.Errorf("member token was not forwarded to database")
			}
			w.WriteHeader(http.StatusNoContent)
		case "/rest/v1/game_rating_summary":
			writeUpstreamJSON(w, http.StatusOK, `[{"average_rating":9,"vote_count":1}]`)
		default:
			t.Errorf("unexpected Supabase path %s", r.URL.Path)
			http.NotFound(w, r)
		}
	})
	_, handler := newAPITest(t, upstream)

	response := apiRequest(handler, http.MethodPut, "/api/games/7/ratings", "member-token", `{"score":9}`)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var result map[string]interface{}
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result["user_rating"] != float64(9) || result["vote_count"] != float64(1) {
		t.Fatalf("rating response = %#v", result)
	}
}

func TestAdminRoutesRequireAdminRole(t *testing.T) {
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" {
			t.Errorf("non-admin request reached protected route: %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}
		role := "member"
		if r.Header.Get("Authorization") == "Bearer admin-token" {
			role = "admin"
		}
		writeUpstreamJSON(w, http.StatusOK, `{"id":"user-1","email":"user@example.com","app_metadata":{"role":"`+role+`"}}`)
	})
	_, handler := newAPITest(t, upstream)

	memberResponse := apiRequest(handler, http.MethodGet, "/api/admin/me", "member-token", "")
	if memberResponse.Code != http.StatusForbidden {
		t.Fatalf("member admin status = %d, want %d", memberResponse.Code, http.StatusForbidden)
	}
	adminResponse := apiRequest(handler, http.MethodGet, "/api/admin/me", "admin-token", "")
	if adminResponse.Code != http.StatusOK {
		t.Fatalf("admin status = %d, want %d: %s", adminResponse.Code, http.StatusOK, adminResponse.Body.String())
	}
}

func TestSupabaseReadFailureReturnsStableAPIError(t *testing.T) {
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeUpstreamJSON(w, http.StatusServiceUnavailable, `{"message":"database unavailable"}`)
	})
	_, handler := newAPITest(t, upstream)

	response := apiRequest(handler, http.MethodGet, "/api/games", "", "")
	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if !strings.Contains(response.Body.String(), "ไม่สามารถอ่านหรือบันทึกข้อมูลได้ในขณะนี้") {
		t.Fatalf("response should expose a stable user-facing error: %s", response.Body.String())
	}
}

func TestInvalidRatingIsRejected(t *testing.T) {
	upstream := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" {
			t.Errorf("invalid rating reached database: %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}
		writeUpstreamJSON(w, http.StatusOK, `{"id":"member-1","app_metadata":{"role":"member"}}`)
	})
	_, handler := newAPITest(t, upstream)

	response := apiRequest(handler, http.MethodPut, "/api/games/7/ratings", "member-token", `{"score":11}`)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
}
