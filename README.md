# Fandango MCP

Unofficial, read-only MCP server for Fandango showtimes and seat availability, reverse-engineered from observed web traffic.

Built entirely by GPT-5.5 via Codex CLI.

## Overview

Exposes anonymous, read-only Fandango movie discovery, theater calendars, showtimes, and seat maps through MCP. It can find showtimes and inspect available seats, but it cannot buy, hold, reserve, validate, favorite, or check out tickets.

- `fandango_movie_showtimes` - search one movie across nearby theaters for a date
- `fandango_theater_showtimes` - list one theater's movie showtimes for a date
- `fandango_theater_calendar` - read a theater's available showtime dates
- `fandango_seat_availability` - read raw seat availability for a showtime
- `fandango_scan_movie_availability` - scan movie availability across multiple days, optionally with seat maps and best open groups
- `fandango_render_seat_map` - render a terminal seat map with open/taken seats and contiguous open groups

Typical workflow: `fandango_movie_showtimes` or `fandango_theater_showtimes` returns a `showtimeHashCode`, then `fandango_render_seat_map` or `fandango_seat_availability` inspects seats. For multi-day "good seats" searches, use `fandango_scan_movie_availability` with `includeSeatDetails`; it returns all showtimes, capped seat-map details, and `bestAvailability`.

Seat map symbols: `□` open, `☒` taken, `▣` open wheelchair, `▦` taken wheelchair.
