# Fandango API Notes

Observed read-only endpoints:

## Movie Showtimes Across Nearby Theaters

```http
GET https://www.fandango.com/napi/theaterShowtimeGroupings/:movieId/:date
```

Useful query params:

- `zip=94103`
- or `lat=37.7845&long=-122.404`
- `isdesktop=true`
- `isDesktopMOP=true`
- optional `chainCode`
- optional `page`

Returns theater groupings with showtimes and `showtimeHashCode` values suitable for seat-map lookup.

For late-night shows, Fandango may return a display time such as `3:00a` in the previous day's search bucket while `ticketingDate` is the actual local start date, for example `2026-07-19+03:00`. The MCP preserves both as `showDate` and `startsAtLocal`, and sorts by `startsAtLocal` when available.

## Theater Movie Showtimes

```http
GET https://www.fandango.com/napi/theaterMovieShowtimes/:theaterId
```

Useful query params:

- `chainCode=AMC`
- `startDate=2026-07-18`
- `isdesktop=true`
- `partnerRestrictedTicketing=`

Returns `viewModel.theater`, `viewModel.movies`, `viewModel.formats`, and showtimes nested under movie variants and amenity groups.

## Theater Calendar

```http
GET https://www.fandango.com/napi/theaterCalendar/:theaterId
```

Useful query params:

- `startDate=2026-07-18`

Returns selected date, showtime date range, and calendar entries with `hasShowtime`.

The MCP normalizes this to:

- `selectedDate`
- `firstShowtimeDate`
- `endDate`
- `showtimeDates`
- `dates[]` with `{ date, hasShowtime }`

## Seat Map

```http
GET https://www.fandango.com/napi/seatMap/:showtimeHashCode
```

Returns seat coordinates, status, type, totals, auditorium metadata, and theater metadata.

Observed seat status:

- `A`: available
- `R`: reserved or otherwise unavailable

Wheelchair seats are detected from `type: "wheelchair"` or wheelchair text in seat attributes.

## Headers

Observed requests used:

```http
Accept: application/json, text/javascript, */*; q=0.01
X-Requested-With: XMLHttpRequest
Referer: https://www.fandango.com/
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Safari/605.1.15
```
