--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: jakemullins
--

COPY public.games (id, sport, "homeTeamId", "awayTeamId", "homeTeamName", "awayTeamName", game_date, "startTime", status, "createdAt", "updatedAt", odds_json, probable_home_pitcher_id, probable_away_pitcher_id, away_score, home_score) FROM stdin;
\.


--
-- Data for Name: predictions; Type: TABLE DATA; Schema: public; Owner: jakemullins
--

COPY public.predictions (id, "gameId", "predictionType", "predictionValue", confidence, reasoning, outcome, "createdAt", "updatedAt") FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

