import { z } from "zod";

import { FandangoError } from "./errors.js";

const stringOrNumberSchema = z.union([z.string(), z.number()]);

const filmFormatSchema = z
  .object({
    filterName: z.string().optional(),
    name: z.string().optional(),
    label: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough();

const showtimeSchema = z
  .object({
    id: stringOrNumberSchema.optional(),
    date: z.string(),
    expired: z.boolean().optional().default(false),
    type: z.string().optional().default("unknown"),
    showtimeHashCode: z.string().optional(),
    ticketingDate: z.string().optional(),
    screenReaderTime: z.string().optional(),
    filmFormat: z.array(filmFormatSchema).optional().default([]),
    ticketingJumpPageURL: z.string().optional(),
  })
  .passthrough();

const amenityGroupSchema = z
  .object({
    amenityString: z.string().optional(),
    showtimes: z.array(showtimeSchema).optional().default([]),
  })
  .passthrough();

const variantSchema = z
  .object({
    filmFormatHeader: z.string().optional(),
    amenityGroups: z.array(amenityGroupSchema).optional().default([]),
    showtimes: z.array(showtimeSchema).optional().default([]),
  })
  .passthrough();

const movieSchema = z
  .object({
    id: stringOrNumberSchema.optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    variants: z.array(variantSchema).optional().default([]),
  })
  .passthrough();

const theaterSchema = z
  .object({
    id: stringOrNumberSchema.optional(),
    theaterId: stringOrNumberSchema.optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    distance: z.union([z.number(), z.string()]).optional(),
    address1: z.string().optional(),
    address: z.string().optional(),
    addressLine1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    chainCode: z.string().optional(),
    variants: z.array(variantSchema).optional().default([]),
  })
  .passthrough();

const theaterShowtimesResponseSchema = z
  .object({
    viewModel: z
      .object({
        date: z.string().optional(),
        theater: z
          .object({
            details: theaterSchema.optional(),
          })
          .passthrough()
          .optional(),
        movies: z.array(movieSchema).optional().default([]),
        formats: z.array(z.unknown()).optional().default([]),
      })
      .passthrough(),
  })
  .passthrough();

const movieShowtimeGroupingsSchema = z
  .object({
    hasShowtimes: z.boolean().optional().default(false),
    theaterShowtimes: z
      .object({
        theaters: z.array(theaterSchema).optional().default([]),
      })
      .passthrough()
      .optional(),
    viewModel: z
      .object({
        theaterShowtimes: z
          .object({
            theaters: z.array(theaterSchema).optional().default([]),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const rawSeatSchema = z
  .object({
    id: stringOrNumberSchema.optional(),
    row: stringOrNumberSchema,
    column: stringOrNumberSchema,
    status: z.string(),
    type: z.string().optional(),
    x: z.union([z.number(), z.string()]).optional(),
    y: z.union([z.number(), z.string()]).optional(),
    attributes: z.unknown().optional(),
  })
  .passthrough();

const seatMapSchema = z
  .object({
    theaterId: stringOrNumberSchema.optional(),
    theaterName: z.string().optional(),
    showtimeId: stringOrNumberSchema.optional(),
    auditoriumId: stringOrNumberSchema.optional(),
    totalAvailableSeatCount: z.number().optional(),
    totalSeatCount: z.number().optional(),
    seats: z.array(rawSeatSchema).optional().default([]),
  })
  .passthrough();

const calendarDateSchema = z
  .object({
    full: z.string().optional(),
    date: z.string().optional(),
    value: z.string().optional(),
    fullDate: z.string().optional(),
    hasShowtime: z.boolean().optional(),
    hasShowtimes: z.boolean().optional(),
  })
  .passthrough();

const theaterCalendarBodySchema = z
  .object({
    selectedDate: z.string().optional(),
    firstShowtime: z.string().optional(),
    firstShowtimeDate: z.string().optional(),
    endDateFull: z.string().optional(),
    endDate: z.string().optional(),
    showtimeDates: z.array(z.string()).optional().default([]),
    calendar: z.array(calendarDateSchema).optional().default([]),
  })
  .passthrough();

const theaterCalendarResponseSchema = theaterCalendarBodySchema
  .extend({
    viewModel: theaterCalendarBodySchema.optional(),
  })
  .passthrough();

type RawShowtime = z.output<typeof showtimeSchema>;
type RawVariant = z.output<typeof variantSchema>;
type RawTheater = z.output<typeof theaterSchema>;
type RawMovie = z.output<typeof movieSchema>;
type RawSeat = z.output<typeof rawSeatSchema>;
type RawCalendarDate = z.output<typeof calendarDateSchema>;

export interface ShowtimeFilters {
  movieId?: number | undefined;
  format?: string | undefined;
}

export interface MovieGroupingFilters extends ShowtimeFilters {
  date: string;
}

export interface NormalizedTheater {
  id: string;
  name: string;
  distance?: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  chainCode?: string;
}

export interface NormalizedShowtime {
  date: string;
  showDate?: string;
  startsAtLocal?: string;
  status: string;
  isAvailable: boolean;
  expired: boolean;
  formats: string[];
  showtimeHashCode?: string;
  ticketingDate?: string;
  screenReaderTime?: string;
  ticketingJumpPageURL?: string;
}

export interface NormalizedMovie {
  id?: string;
  title: string;
  showtimes: NormalizedShowtime[];
}

export interface NormalizedTheaterShowtimes {
  date?: string;
  theater: NormalizedTheater;
  movies: NormalizedMovie[];
}

export interface NormalizedMovieGroupings {
  date: string;
  movieId?: number;
  hasShowtimes: boolean;
  theaters: Array<NormalizedTheater & { showtimes: NormalizedShowtime[] }>;
}

export interface NormalizedSeat {
  id: string;
  row: string;
  column: number;
  status: string;
  isAvailable: boolean;
  isWheelchair: boolean;
  x?: number;
  y?: number;
}

export interface NormalizedSeatMap {
  theaterId?: string;
  theaterName?: string;
  showtimeId?: string;
  auditoriumId?: string;
  totalSeatCount: number;
  availableSeatCount: number;
  takenSeatCount: number;
  seats: NormalizedSeat[];
}

export interface NormalizedTheaterCalendarDate {
  date: string;
  hasShowtime: boolean;
}

export interface NormalizedTheaterCalendar {
  selectedDate?: string;
  firstShowtimeDate?: string;
  endDate?: string;
  showtimeDates: string[];
  dates: NormalizedTheaterCalendarDate[];
}

export interface OpenSeatGroup {
  row: string;
  startColumn: number;
  endColumn: number;
  size: number;
  label: string;
}

function parseWithSchema<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new FandangoError("SCHEMA_CHANGED", `Unexpected Fandango ${context} response shape`, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeText(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function toNumber(value: string | number | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toId(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return String(value);
}

function normalizeTheater(theater: RawTheater): NormalizedTheater {
  const id = toId(theater.id ?? theater.theaterId);
  if (!id) {
    throw new FandangoError("SCHEMA_CHANGED", "Fandango theater response did not include a theater id");
  }

  const name = theater.name ?? theater.displayName ?? id;
  const address = theater.address1 ?? theater.addressLine1 ?? theater.address;
  const distance = toNumber(theater.distance);

  return {
    id,
    name,
    ...(distance === undefined ? {} : { distance }),
    ...(address === undefined ? {} : { address }),
    ...(theater.city === undefined ? {} : { city: theater.city }),
    ...(theater.state === undefined ? {} : { state: theater.state }),
    ...(theater.zip === undefined ? {} : { zip: theater.zip }),
    ...(theater.chainCode === undefined ? {} : { chainCode: theater.chainCode }),
  };
}

function formatNamesForShowtime(
  showtime: RawShowtime,
  amenityString: string | undefined,
  filmFormatHeader: string | undefined,
): string[] {
  return uniqueStrings([
    filmFormatHeader,
    amenityString,
    ...showtime.filmFormat.flatMap((format) => [
      format.filterName,
      format.name,
      format.label,
      format.value,
    ]),
  ]);
}

function formatMatches(formats: string[], wantedFormat: string | undefined): boolean {
  if (!wantedFormat) return true;
  const wanted = normalizeText(wantedFormat);
  return formats.some((format) => normalizeText(format).includes(wanted));
}

function normalizeShowtime(
  showtime: RawShowtime,
  amenityString: string | undefined,
  filmFormatHeader: string | undefined,
  showDate: string | undefined,
): NormalizedShowtime {
  const formats = formatNamesForShowtime(showtime, amenityString, filmFormatHeader);
  const status = normalizeText(showtime.type);
  const isAvailable = status === "available" && !showtime.expired;
  const startsAtLocal = startsAtLocalFromShowtime(showtime);

  return {
    date: showtime.date,
    ...(showDate === undefined ? {} : { showDate }),
    ...(startsAtLocal === undefined ? {} : { startsAtLocal }),
    status: showtime.type,
    isAvailable,
    expired: showtime.expired,
    formats,
    ...(showtime.showtimeHashCode === undefined ? {} : { showtimeHashCode: showtime.showtimeHashCode }),
    ...(showtime.ticketingDate === undefined ? {} : { ticketingDate: showtime.ticketingDate }),
    ...(showtime.screenReaderTime === undefined ? {} : { screenReaderTime: showtime.screenReaderTime }),
    ...(showtime.ticketingJumpPageURL === undefined ? {} : { ticketingJumpPageURL: showtime.ticketingJumpPageURL }),
  };
}

function startsAtLocalFromShowtime(showtime: RawShowtime): string | undefined {
  if (showtime.ticketingDate?.includes("+")) return showtime.ticketingDate.replace("+", "T");
  if (showtime.ticketingDate?.includes("T")) return showtime.ticketingDate;
  if (/^\d{4}-\d{2}-\d{2}T/.test(showtime.date)) return showtime.date;
  return undefined;
}

function showtimeSortKey(showtime: NormalizedShowtime): string {
  return showtime.startsAtLocal ?? showtime.ticketingDate ?? showtime.date;
}

function showtimeCompare(left: NormalizedShowtime, right: NormalizedShowtime): number {
  const keyCompare = showtimeSortKey(left).localeCompare(showtimeSortKey(right));
  return keyCompare === 0 ? left.date.localeCompare(right.date) : keyCompare;
}

function showtimesFromVariants(
  variants: RawVariant[],
  format: string | undefined,
  showDate: string | undefined,
): NormalizedShowtime[] {
  const showtimes: NormalizedShowtime[] = [];

  for (const variant of variants) {
    for (const showtime of variant.showtimes) {
      const normalized = normalizeShowtime(showtime, undefined, variant.filmFormatHeader, showDate);
      if (formatMatches(normalized.formats, format)) showtimes.push(normalized);
    }

    for (const amenityGroup of variant.amenityGroups) {
      for (const showtime of amenityGroup.showtimes) {
        const normalized = normalizeShowtime(
          showtime,
          amenityGroup.amenityString,
          variant.filmFormatHeader,
          showDate,
        );
        if (formatMatches(normalized.formats, format)) showtimes.push(normalized);
      }
    }
  }

  return showtimes.sort(showtimeCompare);
}

function movieMatches(movie: RawMovie, movieId: number | undefined): boolean {
  if (movieId === undefined) return true;
  return toId(movie.id) === String(movieId);
}

export function normalizeTheaterShowtimes(
  data: unknown,
  filters: ShowtimeFilters = {},
): NormalizedTheaterShowtimes {
  const parsed = parseWithSchema(theaterShowtimesResponseSchema, data, "theater showtimes");
  const rawTheater = parsed.viewModel.theater?.details ?? parsed.viewModel.theater;
  const theater = normalizeTheater(theaterSchema.parse(rawTheater ?? {}));

  const movies = parsed.viewModel.movies
    .filter((movie) => movieMatches(movie, filters.movieId))
    .map((movie) => {
      const showtimes = showtimesFromVariants(movie.variants, filters.format, parsed.viewModel.date);
      return {
        ...(movie.id === undefined ? {} : { id: String(movie.id) }),
        title: movie.title ?? movie.name ?? String(movie.id ?? "Unknown movie"),
        showtimes,
      };
    })
    .filter((movie) => movie.showtimes.length > 0);

  return {
    ...(parsed.viewModel.date === undefined ? {} : { date: parsed.viewModel.date }),
    theater,
    movies,
  };
}

export function normalizeMovieShowtimeGroupings(
  data: unknown,
  filters: MovieGroupingFilters,
): NormalizedMovieGroupings {
  const parsed = parseWithSchema(movieShowtimeGroupingsSchema, data, "movie showtime groupings");
  const rawTheaters =
    parsed.theaterShowtimes?.theaters ?? parsed.viewModel?.theaterShowtimes?.theaters ?? [];

  const theaters = rawTheaters
    .map((rawTheater) => {
      const showtimes = showtimesFromVariants(rawTheater.variants, filters.format, filters.date);
      return {
        ...normalizeTheater(rawTheater),
        showtimes,
      };
    })
    .filter((theater) => theater.showtimes.length > 0);

  return {
    date: filters.date,
    ...(filters.movieId === undefined ? {} : { movieId: filters.movieId }),
    hasShowtimes: parsed.hasShowtimes,
    theaters,
  };
}

function calendarDateValue(item: RawCalendarDate): string | undefined {
  return item.full ?? item.fullDate ?? item.date ?? item.value;
}

export function normalizeTheaterCalendar(data: unknown): NormalizedTheaterCalendar {
  const parsed = parseWithSchema(theaterCalendarResponseSchema, data, "theater calendar");
  const source = parsed.viewModel ?? parsed;
  const firstShowtimeDate = source.firstShowtimeDate ?? source.firstShowtime;
  const endDate = source.endDate ?? source.endDateFull;

  const dates = source.calendar.flatMap((item): NormalizedTheaterCalendarDate[] => {
    const date = calendarDateValue(item);
    if (!date) return [];
    return [{ date, hasShowtime: item.hasShowtime ?? item.hasShowtimes ?? false }];
  });

  return {
    ...(source.selectedDate === undefined ? {} : { selectedDate: source.selectedDate }),
    ...(firstShowtimeDate === undefined ? {} : { firstShowtimeDate }),
    ...(endDate === undefined ? {} : { endDate }),
    showtimeDates: source.showtimeDates,
    dates,
  };
}

function seatIsWheelchair(seat: RawSeat): boolean {
  if (seat.type?.toLowerCase().includes("wheelchair")) return true;
  return JSON.stringify(seat.attributes ?? "").toLowerCase().includes("wheelchair");
}

export function normalizeSeatMap(data: unknown): NormalizedSeatMap {
  const parsed = parseWithSchema(seatMapSchema, data, "seat map");
  const seats = parsed.seats
    .map((seat): NormalizedSeat => {
      const id = toId(seat.id) ?? `${seat.row}-${seat.column}`;
      const column = toNumber(seat.column);
      if (column === undefined) {
        throw new FandangoError("SCHEMA_CHANGED", "Fandango seat response included a non-numeric column");
      }
      const status = seat.status.toUpperCase();
      const isAvailable = status === "A";
      const x = toNumber(seat.x);
      const y = toNumber(seat.y);

      return {
        id,
        row: String(seat.row),
        column,
        status,
        isAvailable,
        isWheelchair: seatIsWheelchair(seat),
        ...(x === undefined ? {} : { x }),
        ...(y === undefined ? {} : { y }),
      };
    })
    .sort((a, b) => {
      const rowCompare = naturalCompare(a.row, b.row);
      return rowCompare === 0 ? a.column - b.column : rowCompare;
    });

  const computedAvailableSeatCount = seats.filter((seat) => seat.isAvailable).length;
  const availableSeatCount = parsed.totalAvailableSeatCount ?? computedAvailableSeatCount;
  const totalSeatCount = parsed.totalSeatCount ?? seats.length;

  return {
    ...(parsed.theaterId === undefined ? {} : { theaterId: String(parsed.theaterId) }),
    ...(parsed.theaterName === undefined ? {} : { theaterName: parsed.theaterName }),
    ...(parsed.showtimeId === undefined ? {} : { showtimeId: String(parsed.showtimeId) }),
    ...(parsed.auditoriumId === undefined ? {} : { auditoriumId: String(parsed.auditoriumId) }),
    totalSeatCount,
    availableSeatCount,
    takenSeatCount: Math.max(totalSeatCount - availableSeatCount, 0),
    seats,
  };
}

function naturalCompare(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function glyphForSeat(seat: NormalizedSeat | undefined): string {
  if (!seat) return "";
  if (seat.isWheelchair) return seat.isAvailable ? "▣" : "▦";
  return seat.isAvailable ? "□" : "☒";
}

export type SeatMapRenderStyle = "spaced" | "compact";

export interface SeatMapRenderOptions {
  style?: SeatMapRenderStyle;
  includeScreen?: boolean;
  includeColumnLabels?: boolean;
  includeOpenGroups?: boolean;
  maxOpenGroups?: number;
}

function renderOptions(styleOrOptions: SeatMapRenderStyle | SeatMapRenderOptions): Required<SeatMapRenderOptions> {
  if (typeof styleOrOptions === "string") {
    return {
      style: styleOrOptions,
      includeScreen: false,
      includeColumnLabels: false,
      includeOpenGroups: false,
      maxOpenGroups: 5,
    };
  }

  return {
    style: styleOrOptions.style ?? "spaced",
    includeScreen: styleOrOptions.includeScreen ?? true,
    includeColumnLabels: styleOrOptions.includeColumnLabels ?? false,
    includeOpenGroups: styleOrOptions.includeOpenGroups ?? false,
    maxOpenGroups: styleOrOptions.maxOpenGroups ?? 5,
  };
}

function groupedSeparator(column: number, maxColumn: number, style: SeatMapRenderStyle): string {
  if (style !== "spaced" || column >= maxColumn) return "";
  return column % 4 === 0 ? "  " : " ";
}

function renderColumnRange(
  minColumn: number,
  maxColumn: number,
  style: SeatMapRenderStyle,
  cellWidth: number,
  cellForColumn: (column: number) => string,
): string {
  const cells: string[] = [];
  for (let column = minColumn; column <= maxColumn; column += 1) {
    const cell = cellForColumn(column);
    cells.push(cell === "" ? "" : cell.padStart(cellWidth));
    cells.push(groupedSeparator(column, maxColumn, style));
  }
  return cells.join("").trimEnd();
}

export function summarizeOpenSeatGroups(seatMap: NormalizedSeatMap, maxGroups = 5): OpenSeatGroup[] {
  const seatsByRow = groupSeatsByRow(seatMap.seats);
  const groups: OpenSeatGroup[] = [];

  for (const [rowName, rowSeats] of seatsByRow.entries()) {
    const availableColumns = [...rowSeats.values()]
      .filter((seat) => seat.isAvailable)
      .map((seat) => seat.column)
      .sort((a, b) => a - b);

    let start: number | undefined;
    let previous: number | undefined;

    for (const column of availableColumns) {
      if (start === undefined || previous === undefined || column !== previous + 1) {
        if (start !== undefined && previous !== undefined) {
          groups.push(openSeatGroup(rowName, start, previous));
        }
        start = column;
      }
      previous = column;
    }

    if (start !== undefined && previous !== undefined) {
      groups.push(openSeatGroup(rowName, start, previous));
    }
  }

  return groups
    .sort((a, b) => b.size - a.size || naturalCompare(a.row, b.row) || a.startColumn - b.startColumn)
    .slice(0, maxGroups);
}

function openSeatGroup(row: string, startColumn: number, endColumn: number): OpenSeatGroup {
  const label =
    startColumn === endColumn ? `row ${row} col ${startColumn}` : `row ${row} cols ${startColumn}-${endColumn}`;
  return {
    row,
    startColumn,
    endColumn,
    size: endColumn - startColumn + 1,
    label,
  };
}

function groupSeatsByRow(seats: NormalizedSeat[]): Map<string, Map<number, NormalizedSeat>> {
  const seatsByRow = new Map<string, Map<number, NormalizedSeat>>();
  for (const seat of seats) {
    const row = seatsByRow.get(seat.row) ?? new Map<number, NormalizedSeat>();
    row.set(seat.column, seat);
    seatsByRow.set(seat.row, row);
  }
  return seatsByRow;
}

export function renderSeatMap(
  seatMap: NormalizedSeatMap,
  styleOrOptions: SeatMapRenderStyle | SeatMapRenderOptions = "spaced",
): string {
  const options = renderOptions(styleOrOptions);
  const seatsByRow = groupSeatsByRow(seatMap.seats);
  const rows = [...seatsByRow.keys()].sort(naturalCompare);
  const rowLabelWidth = Math.max(1, ...rows.map((row) => row.length));
  const allColumns = seatMap.seats.map((seat) => seat.column);
  const minColumn = allColumns.length === 0 ? 1 : Math.min(...allColumns);
  const maxColumn = allColumns.length === 0 ? 1 : Math.max(...allColumns);
  const cellWidth = options.includeColumnLabels ? Math.max(1, String(maxColumn).length) : 1;
  const mapWidth = renderColumnRange(minColumn, maxColumn, options.style, cellWidth, () => "x").length;
  const lines = [
    `${seatMap.theaterName ?? "Seat map"} - ${seatMap.availableSeatCount}/${seatMap.totalSeatCount} open`,
  ];

  if (options.includeScreen) {
    lines.push(`SCREEN ${"-".repeat(Math.max(mapWidth, 8))}`);
  }

  if (options.includeOpenGroups) {
    const groups = summarizeOpenSeatGroups(seatMap, options.maxOpenGroups);
    lines.push(`Open groups: ${groups.length === 0 ? "none" : groups.map((group) => `${group.label} (${group.size})`).join(", ")}`);
  }

  lines.push("Legend: □ open  ☒ taken  ▣ open wheelchair  ▦ taken wheelchair", "");

  if (options.includeColumnLabels) {
    const columnLabels = renderColumnRange(
      minColumn,
      maxColumn,
      options.style,
      cellWidth,
      (column) => String(column),
    );
    lines.push(`${"cols".padStart(rowLabelWidth)}  ${columnLabels}`.trimEnd());
  }

  for (const rowName of rows) {
    const rowSeats = seatsByRow.get(rowName);
    if (!rowSeats) continue;
    const row = renderColumnRange(
      minColumn,
      maxColumn,
      options.style,
      cellWidth,
      (column) => (rowSeats.has(column) || !options.includeColumnLabels ? glyphForSeat(rowSeats.get(column)) : " "),
    );

    lines.push(`${rowName.padStart(rowLabelWidth)}  ${row}`.trimEnd());
  }

  return lines.join("\n");
}
