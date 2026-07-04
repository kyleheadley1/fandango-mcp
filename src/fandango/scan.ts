import type { FandangoClientResult, MovieShowtimesQuery } from "./client.js";
import {
  summarizeOpenSeatGroups,
  type NormalizedMovieGroupings,
  type NormalizedSeatMap,
  type NormalizedShowtime,
  type NormalizedTheater,
  type OpenSeatGroup,
} from "./types.js";

export interface ScanFandangoClient {
  movieShowtimes(query: MovieShowtimesQuery): Promise<FandangoClientResult<NormalizedMovieGroupings>>;
  seatAvailability(showtimeHashCode: string): Promise<FandangoClientResult<NormalizedSeatMap>>;
}

export interface ScanMovieAvailabilityOptions {
  movieId: number;
  startDate: string;
  days: number;
  zip?: string | undefined;
  lat?: number | undefined;
  long?: number | undefined;
  format?: string | undefined;
  includeSeatCounts?: boolean | undefined;
  includeSeatDetails?: boolean | undefined;
  maxSeatMapFetches?: number | undefined;
}

export interface SeatCounts {
  availableSeatCount: number;
  takenSeatCount: number;
  totalSeatCount: number;
}

export interface ScannedShowtime extends NormalizedShowtime {
  seats?: SeatCounts;
  openGroups?: OpenSeatGroup[];
  seatMap?: NormalizedSeatMap;
}

export interface ScannedTheater extends NormalizedTheater {
  showtimes: ScannedShowtime[];
}

export interface ScannedDate {
  date: string;
  fetchedAt: string;
  hasShowtimes: boolean;
  theaterCount: number;
  theaters: ScannedTheater[];
}

export interface BestAvailability {
  date: string;
  theater: NormalizedTheater;
  showtimeHashCode: string;
  displayTime: string;
  showDate?: string;
  startsAtLocal?: string;
  seats: SeatCounts;
  bestOpenGroup?: OpenSeatGroup;
  openGroups: OpenSeatGroup[];
}

export interface ScanMovieAvailabilityResult {
  fetchedAt: string;
  query: {
    movieId: number;
    startDate: string;
    days: number;
    zip?: string | undefined;
    lat?: number | undefined;
    long?: number | undefined;
    format?: string | undefined;
    includeSeatCounts: boolean;
    includeSeatDetails: boolean;
    maxSeatMapFetches: number;
  };
  seatMapFetchCount: number;
  seatCountsTruncated: boolean;
  bestAvailability: BestAvailability[];
  dates: ScannedDate[];
}

const DEFAULT_MAX_SEAT_MAP_FETCHES = 100;
const BEST_AVAILABILITY_LIMIT = 25;

export async function scanMovieAvailability(
  client: ScanFandangoClient,
  options: ScanMovieAvailabilityOptions,
  now: () => Date = () => new Date(),
): Promise<ScanMovieAvailabilityResult> {
  const dates = Array.from({ length: options.days }, (_, index) => addDays(options.startDate, index));
  const maxSeatMapFetches = options.maxSeatMapFetches ?? DEFAULT_MAX_SEAT_MAP_FETCHES;
  const shouldFetchSeats = options.includeSeatCounts === true || options.includeSeatDetails === true;
  let seatMapFetchCount = 0;
  let seatCountsTruncated = false;
  const scannedDates: ScannedDate[] = [];
  const bestAvailability: BestAvailability[] = [];

  for (const date of dates) {
    const dayResult = await client.movieShowtimes({
      movieId: options.movieId,
      date,
      zip: options.zip,
      lat: options.lat,
      long: options.long,
      format: options.format,
    });

    const theaters: ScannedTheater[] = [];
    for (const theater of dayResult.data.theaters) {
      const showtimes: ScannedShowtime[] = [];

      for (const showtime of theater.showtimes) {
        if (!shouldFetchSeats || !showtime.isAvailable || !showtime.showtimeHashCode) {
          showtimes.push(showtime);
          continue;
        }

        if (seatMapFetchCount >= maxSeatMapFetches) {
          seatCountsTruncated = true;
          showtimes.push(showtime);
          continue;
        }

        const seats = await client.seatAvailability(showtime.showtimeHashCode);
        seatMapFetchCount += 1;
        const counts = seatCounts(seats.data);
        const openGroups = summarizeOpenSeatGroups(seats.data, 8);
        const scannedShowtime: ScannedShowtime = {
          ...showtime,
          seats: counts,
          openGroups,
          ...(options.includeSeatDetails === true ? { seatMap: seats.data } : {}),
        };
        showtimes.push(scannedShowtime);

        bestAvailability.push({
          date,
          theater: theaterBase(theater),
          showtimeHashCode: showtime.showtimeHashCode,
          displayTime: showtime.date,
          ...(showtime.showDate === undefined ? {} : { showDate: showtime.showDate }),
          ...(showtime.startsAtLocal === undefined ? {} : { startsAtLocal: showtime.startsAtLocal }),
          seats: counts,
          ...(openGroups[0] === undefined ? {} : { bestOpenGroup: openGroups[0] }),
          openGroups,
        });
      }

      theaters.push({ ...theater, showtimes });
    }

    scannedDates.push({
      date,
      fetchedAt: dayResult.fetchedAt,
      hasShowtimes: dayResult.data.hasShowtimes,
      theaterCount: theaters.length,
      theaters,
    });
  }

  return {
    fetchedAt: now().toISOString(),
    query: {
      movieId: options.movieId,
      startDate: options.startDate,
      days: options.days,
      zip: options.zip,
      lat: options.lat,
      long: options.long,
      format: options.format,
      includeSeatCounts: options.includeSeatCounts ?? false,
      includeSeatDetails: options.includeSeatDetails ?? false,
      maxSeatMapFetches,
    },
    seatMapFetchCount,
    seatCountsTruncated,
    bestAvailability: bestAvailability.sort(bestAvailabilityCompare).slice(0, BEST_AVAILABILITY_LIMIT),
    dates: scannedDates,
  };
}

function seatCounts(seatMap: NormalizedSeatMap): SeatCounts {
  return {
    availableSeatCount: seatMap.availableSeatCount,
    takenSeatCount: seatMap.takenSeatCount,
    totalSeatCount: seatMap.totalSeatCount,
  };
}

function theaterBase(theater: NormalizedTheater): NormalizedTheater {
  return {
    id: theater.id,
    name: theater.name,
    ...(theater.distance === undefined ? {} : { distance: theater.distance }),
    ...(theater.address === undefined ? {} : { address: theater.address }),
    ...(theater.city === undefined ? {} : { city: theater.city }),
    ...(theater.state === undefined ? {} : { state: theater.state }),
    ...(theater.zip === undefined ? {} : { zip: theater.zip }),
    ...(theater.chainCode === undefined ? {} : { chainCode: theater.chainCode }),
  };
}

function bestAvailabilityCompare(left: BestAvailability, right: BestAvailability): number {
  const groupCompare = (right.bestOpenGroup?.size ?? 0) - (left.bestOpenGroup?.size ?? 0);
  if (groupCompare !== 0) return groupCompare;
  const availableCompare = right.seats.availableSeatCount - left.seats.availableSeatCount;
  if (availableCompare !== 0) return availableCompare;
  return (left.startsAtLocal ?? left.displayTime).localeCompare(right.startsAtLocal ?? right.displayTime);
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
