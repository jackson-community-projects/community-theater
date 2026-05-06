import {
  adminEvents,
} from "./mock-data";
import type { ImportCandidate } from "./types";
import type { BookingDay } from "@/lib/data";
import { theaters as siteTheaters } from "@/lib/data/theaters";
import { screens as siteScreens } from "@/lib/data/screens";
import {
  listTheatersFromAmplify,
  getTheaterFromAmplify,
  listScreensFromAmplify,
  getScreenFromAmplify,
  getMovieFromAmplify,
  listMoviesFromAmplify,
  getBookingFromAmplify,
  listBookingsFromAmplify,
  getEventFromAmplify,
  listEventsFromAmplify,
  resolveProtectedStorageUrl,
} from "@/lib/amplify/server";
import {
  getTmdbCredits,
  getTmdbMovieDetails,
  getTmdbSearchResultYear,
  getTmdbTrailerYouTubeId,
  searchTmdbMovies,
} from "@/lib/data/tmdb";
import { isE2ETestMode } from "@/lib/e2e/config";
import { tmdbMovieFixtures } from "@/lib/data/tmdb-fixtures";
import type { Schema } from "@/amplify/data/resource";

type AdminMovieStatus = "now-playing" | "coming-soon" | "draft" | "archived";

export type {
  AdminActivityItem,
  AdminBooking,
  AdminEvent,
  AdminMovie,
  AdminScreen,
  AdminStatus,
  AdminTheater,
  ImportCandidate,
  RecurringShowtime,
} from "./types";

type AmplifyTheaterRecord = NonNullable<
  Awaited<ReturnType<typeof getTheaterFromAmplify>>["data"]
>;
type AmplifyScreenRecord = NonNullable<
  Awaited<ReturnType<typeof getScreenFromAmplify>>["data"]
>;
type AmplifyMovieRecord = NonNullable<
  Awaited<ReturnType<typeof getMovieFromAmplify>>["data"]
>;
type AmplifyBookingRecord = NonNullable<
  Awaited<ReturnType<typeof getBookingFromAmplify>>["data"]
>;
type AmplifyEventRecord = Schema["Event"]["type"];
const bookingDays = new Set<BookingDay>([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

function toAdminMovieStatus(
  status: AmplifyMovieRecord["status"]
): AdminMovieStatus {
  switch (status) {
    case "nowPlaying":
      return "now-playing";
    case "comingSoon":
      return "coming-soon";
    case "draft":
      return "draft";
    case "archived":
      return "archived";
  }
}

function getOptionalTheaterSortOrder(theater: unknown) {
  const value = (theater as { sortOrder?: unknown }).sortOrder;
  return typeof value === "number" ? value : null;
}

function isFutureReleaseDate(releaseDate?: string | null) {
  if (!releaseDate) {
    return false;
  }

  const parsedReleaseDate = new Date(`${releaseDate}T00:00:00Z`);

  if (Number.isNaN(parsedReleaseDate.getTime())) {
    return false;
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  return parsedReleaseDate.getTime() > todayUtc;
}

function hasActiveBooking(
  movieId: string,
  bookings: AmplifyBookingRecord[]
) {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  return bookings.some((booking) => {
    if (booking.movieId !== movieId || booking.status !== "published") {
      return false;
    }

    const runStartsOn = new Date(`${booking.runStartsOn}T00:00:00Z`);
    const runEndsOn = new Date(`${booking.runEndsOn}T00:00:00Z`);

    if (Number.isNaN(runStartsOn.getTime()) || Number.isNaN(runEndsOn.getTime())) {
      return false;
    }

    return runStartsOn.getTime() <= todayUtc && runEndsOn.getTime() >= todayUtc;
  });
}

function getDerivedAdminMovieStatus(
  movie: AmplifyMovieRecord,
  bookings: AmplifyBookingRecord[]
): AdminMovieStatus | null {
  if (hasActiveBooking(movie.id, bookings)) {
    return "now-playing";
  }

  if (isFutureReleaseDate(movie.releaseDate)) {
    return "coming-soon";
  }

  if (movie.status === "draft" || movie.status === "archived") {
    return toAdminMovieStatus(movie.status);
  }

  return null;
}

function getMovieYear(movie: AmplifyMovieRecord) {
  if (!movie.releaseDate) {
    return new Date().getUTCFullYear();
  }

  const parsed = new Date(movie.releaseDate);
  return Number.isNaN(parsed.getTime())
    ? new Date().getUTCFullYear()
    : parsed.getUTCFullYear();
}

function getRuntimeMinutes(runtime?: string | null) {
  if (!runtime) {
    return 0;
  }

  const hoursMatch = runtime.match(/(\d+)\s*h/);
  const minutesMatch = runtime.match(/(\d+)\s*m/);
  const hours = hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;
  const total = hours * 60 + minutes;

  return Number.isNaN(total) ? 0 : total;
}

function toAmplifyDate(value?: string) {
  if (!value) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function toAdminDateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toEventImage(image?: string | null) {
  return image?.trim() || "/next.svg";
}

function getActivityTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);

  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function formatRelativeActivityTime(date: Date, now = new Date()) {
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absDiffMs < hourMs) {
    return rtf.format(Math.round(diffMs / minuteMs), "minute");
  }

  if (absDiffMs < dayMs) {
    return rtf.format(Math.round(diffMs / hourMs), "hour");
  }

  if (absDiffMs < 7 * dayMs) {
    return rtf.format(Math.round(diffMs / dayMs), "day");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toAdminMovie(
  movie: AmplifyMovieRecord,
  bookings: AmplifyBookingRecord[] = []
): import("./types").AdminMovie {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    year: getMovieYear(movie),
    runtimeMinutes: getRuntimeMinutes(movie.runtime),
    rating: movie.rating ?? "NR",
    genres:
      movie.genre
        ?.split("/")
        .map((genre) => genre.trim())
        .filter(Boolean) ?? [],
    status: getDerivedAdminMovieStatus(movie, bookings),
    tagline: movie.tagline ?? "Tagline unavailable.",
    overview: movie.synopsis ?? "Synopsis unavailable.",
    poster: movie.poster ?? "/next.svg",
    backdrop: movie.backdrop ?? "/next.svg",
    castHighlights: (
      movie.cast?.filter(
        (credit): credit is string =>
          typeof credit === "string" && credit.trim().length > 0
      ) ?? []
    ) as string[],
    trailerLabel: movie.trailerYouTubeId
      ? "Trailer available"
      : "Trailer not available yet",
  };
}

function toAdminMovieDetail(
  movie: AmplifyMovieRecord,
  bookings: AmplifyBookingRecord[] = []
) {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    tagline: movie.tagline ?? "Tagline unavailable.",
    rating: movie.rating ?? "NR",
    runtime: movie.runtime ?? "Runtime TBD",
    genre: movie.genre ?? "Genre unavailable",
    status: getDerivedAdminMovieStatus(movie, bookings),
    libraryStatus: movie.status,
    director: movie.director ?? "Director unavailable",
    cast: movie.cast?.filter((credit): credit is string => Boolean(credit)) ?? [],
    synopsis: movie.synopsis ?? "Synopsis unavailable.",
    production: movie.production ?? "Production unavailable",
    score: movie.score ?? "Score unavailable",
    cinematography: movie.cinematography ?? "Cinematography unavailable",
    backdrop: movie.backdrop ?? "/next.svg",
    poster: movie.poster ?? "/next.svg",
    releaseDate: movie.releaseDate ?? undefined,
    audienceScore: movie.audienceScore ?? undefined,
    originalLanguage: movie.originalLanguage ?? undefined,
    productionCompanies:
      movie.productionCompanies?.filter(
        (company): company is string => Boolean(company)
      ) ?? [],
    tmdbId: movie.tmdbId ?? undefined,
    trailerYouTubeId: movie.trailerYouTubeId ?? undefined,
  };
}

async function toAdminTheater(
  theater: AmplifyTheaterRecord
) {
  const fallback = siteTheaters.find(
    (siteTheater) =>
      siteTheater.slug === theater.slug || siteTheater.name === theater.name
  );

  return {
    id: theater.id,
    sortOrder:
      getOptionalTheaterSortOrder(theater) ??
      fallback?.sortOrder ??
      Number.MAX_SAFE_INTEGER,
    slug: theater.slug,
    name: theater.name,
    city: theater.city,
    state: theater.state,
    district: theater.district,
    established: theater.established ?? fallback?.established ?? 0,
    status: theater.status,
    address: theater.address,
    phone: theater.phone ?? fallback?.phone ?? "",
    contactEmail: theater.contactEmail ?? fallback?.contactEmail ?? "",
    manager: theater.manager ?? fallback?.manager ?? "",
    notes: theater.notes ?? fallback?.notes ?? "",
    heroImage: theater.heroImage ?? fallback?.heroImage ?? "/next.svg",
    heroImagePreview:
      (await resolveProtectedStorageUrl(theater.heroImage)) ??
      fallback?.heroImage ??
      "/next.svg",
    descriptionParagraphs: (
      theater.descriptionParagraphs ?? fallback?.descriptionParagraphs ?? []
    ).filter((paragraph): paragraph is string => Boolean(paragraph)),
    specs:
      fallback?.specs ?? [
        { label: "Location", value: theater.address },
        { label: "Phone", value: theater.phone ?? "Not provided" },
        { label: "Status", value: theater.status },
      ],
    concessions: fallback?.concessions ?? [],
  };
}

function toAdminScreen(screen: AmplifyScreenRecord) {
  const fallback = siteScreens.find(
    (siteScreen) =>
      siteScreen.slug === screen.slug || siteScreen.name === screen.name
  );

  return {
    id: screen.id,
    theaterId: screen.theaterId,
    name: screen.name,
    slug: screen.slug,
    capacity: screen.capacity,
    sortOrder: screen.sortOrder,
    projection: screen.projection,
    soundFormat: screen.soundFormat,
    features: (screen.features ?? fallback?.features ?? []).filter(
      (feature): feature is string => Boolean(feature)
    ),
    status: screen.status,
  };
}

function toAdminBooking(
  booking: AmplifyBookingRecord,
  movieSlugById: Record<string, string>
): import("./types").AdminBooking {
  return {
    id: booking.id,
    slug: booking.slug,
    theaterId: booking.theaterId,
    screenId: booking.screenId,
    movieSlug: movieSlugById[booking.movieId] ?? booking.movieId,
    status: booking.status,
    runStartsOn: booking.runStartsOn,
    runEndsOn: booking.runEndsOn,
    ticketPrice: booking.ticketPrice ?? "",
    badge: booking.badge ?? null,
    showtimes:
      (
        (booking.showtimes ?? []) as Array<
          | {
              day: string;
              times: Array<string | null> | null;
            }
          | null
        >
      )
        .filter((showtime): showtime is NonNullable<typeof showtime> => showtime != null)
        .filter(
          (showtime): showtime is { day: BookingDay; times: Array<string | null> | null } =>
            bookingDays.has(showtime.day as BookingDay)
        )
        .map((showtime) => ({
          day: showtime.day,
          times: (showtime.times ?? []).filter(
            (time): time is string => typeof time === "string" && time.length > 0
          ),
        })),
    exceptions:
      (
        (booking.exceptions ?? []) as Array<
          | {
              date: string;
              label: string;
            }
          | null
        >
      )
        .filter(
          (exception): exception is NonNullable<typeof exception> => exception != null
        )
        .map((exception) => ({
          date: exception.date,
          label: exception.label,
        })),
    note: booking.note ?? "",
  };
}

async function toAdminEvent(event: AmplifyEventRecord) {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    description: event.description ?? "",
    theaterId: event.theaterId,
    image: toEventImage(event.image),
    imagePreview: toEventImage(await resolveProtectedStorageUrl(event.image)),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    startsAtLabel: toAdminDateTimeLabel(event.startsAt),
    endsAtLabel: toAdminDateTimeLabel(event.endsAt),
    status: event.status,
  };
}

function isMissingEventModelError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Events are not available right now")
  );
}

export async function getAdminTheaters() {
  const result = await listTheatersFromAmplify();

  if (result.errors?.length) {
    throw new Error(
      `Unable to load theaters: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return (await Promise.all(result.data.map(toAdminTheater))).sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.name.localeCompare(right.name)
      : left.sortOrder - right.sortOrder
  );
}

export async function getAdminTheater(theaterId: string) {
  const result = await getTheaterFromAmplify(theaterId);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load theater: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data ? toAdminTheater(result.data) : null;
}

export async function getAdminScreens() {
  const result = await listScreensFromAmplify();

  if (result.errors?.length) {
    throw new Error(
      `Unable to load screens: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data.map(toAdminScreen);
}

export async function getAdminScreen(screenId: string) {
  const result = await getScreenFromAmplify(screenId);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load screen: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data ? toAdminScreen(result.data) : null;
}

export async function getAdminScreensForTheater(theaterId: string) {
  const result = await listScreensFromAmplify(theaterId);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load theater screens: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data.map(toAdminScreen);
}

export async function getAdminMovies() {
  const [result, bookingsResult] = await Promise.all([
    listMoviesFromAmplify(),
    listBookingsFromAmplify(),
  ]);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load movies: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load bookings for movies: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data.map((movie) => toAdminMovie(movie, bookingsResult.data));
}

export async function getAdminMovie(movieId: string) {
  const [result, bookingsResult] = await Promise.all([
    getMovieFromAmplify(movieId),
    listBookingsFromAmplify(),
  ]);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load movie: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load bookings for movie: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data ? toAdminMovie(result.data, bookingsResult.data) : null;
}

export async function getAdminMovieDetail(movieId: string) {
  const result = await getMovieFromAmplify(movieId);

  if (result.errors?.length) {
    throw new Error(
      `Unable to load movie detail: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const movie = result.data;
  if (!movie) {
    return null;
  }

  const [bookingsResult, theaters, screens] = await Promise.all([
    listBookingsFromAmplify(),
    getAdminTheaters(),
    getAdminScreens(),
  ]);

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load bookings for movie detail: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const bookings = bookingsResult.data;
  const movieBookings = bookings
    .filter((booking) => booking.movieId === movie.id);
  const adminMovie = toAdminMovie(movie, movieBookings);
  const theaterById = Object.fromEntries(theaters.map((theater) => [theater.id, theater]));
  const screenById = Object.fromEntries(screens.map((screen) => [screen.id, screen]));

  const showtimes = bookings
    .filter((booking) => booking.movieId === movie.id && booking.status === "published")
    .map((booking) => ({
      bookingId: booking.id,
      theaterId: booking.theaterId,
      theaterName: theaterById[booking.theaterId]?.name ?? booking.theaterId,
      screenId: booking.screenId,
      screenName: screenById[booking.screenId]?.name ?? booking.screenId,
      runStartsOn: booking.runStartsOn,
      runEndsOn: booking.runEndsOn,
      status: booking.status,
      badge: booking.badge,
      times:
        ((booking.showtimes ?? []) as Array<
          | {
              day: BookingDay;
              times: Array<string | null> | null;
            }
          | null
        >)
          .filter((showtime): showtime is NonNullable<typeof showtime> => showtime != null)
          .flatMap((showtime) =>
            (showtime.times ?? []).filter(
              (time): time is string => typeof time === "string" && time.length > 0
            )
          ),
      price: booking.ticketPrice,
    }));

  return {
    adminMovie,
    movie: toAdminMovieDetail(movie, movieBookings),
    showtimes,
  };
}

export async function getAdminBookings() {
  const [bookingsResult, movies] = await Promise.all([
    listBookingsFromAmplify(),
    listMoviesFromAmplify(),
  ]);

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load bookings: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (movies.errors?.length) {
    throw new Error(
      `Unable to load movies for bookings: ${movies.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const movieSlugById = Object.fromEntries(
    movies.data.map((movie) => [movie.id, movie.slug])
  );

  return bookingsResult.data.map((booking) => toAdminBooking(booking, movieSlugById));
}

export async function getAdminBooking(bookingId: string) {
  const [bookingResult, movies] = await Promise.all([
    getBookingFromAmplify(bookingId),
    listMoviesFromAmplify(),
  ]);

  if (bookingResult.errors?.length) {
    throw new Error(
      `Unable to load booking: ${bookingResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (movies.errors?.length) {
    throw new Error(
      `Unable to load movies for booking: ${movies.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (!bookingResult.data) {
    return null;
  }

  const movieSlugById = Object.fromEntries(
    movies.data.map((movie) => [movie.id, movie.slug])
  );

  return toAdminBooking(bookingResult.data, movieSlugById);
}

export async function getAdminEvents() {
  let result: Awaited<ReturnType<typeof listEventsFromAmplify>>;

  try {
    result = await listEventsFromAmplify();
  } catch (error) {
    if (isMissingEventModelError(error)) {
      return adminEvents;
    }

    throw error;
  }

  if (result.errors?.length) {
    throw new Error(
      `Unable to load events: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return Promise.all(result.data.map(toAdminEvent));
}

export async function getAdminEvent(eventId: string) {
  let result: Awaited<ReturnType<typeof getEventFromAmplify>>;

  try {
    result = await getEventFromAmplify(eventId);
  } catch (error) {
    if (isMissingEventModelError(error)) {
      return adminEvents.find((event) => event.id === eventId) ?? null;
    }

    throw error;
  }

  if (result.errors?.length) {
    throw new Error(
      `Unable to load event: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data ? toAdminEvent(result.data) : null;
}

export async function getAdminRecentActivity() {
  const [theatersResult, moviesResult, bookingsResult] = await Promise.all([
    listTheatersFromAmplify(),
    listMoviesFromAmplify(),
    listBookingsFromAmplify(),
  ]);

  if (theatersResult.errors?.length) {
    throw new Error(
      `Unable to load theaters for activity: ${theatersResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (moviesResult.errors?.length) {
    throw new Error(
      `Unable to load movies for activity: ${moviesResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load bookings for activity: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  let events: AmplifyEventRecord[] = [];

  try {
    const eventsResult = await listEventsFromAmplify();

    if (eventsResult.errors?.length) {
      throw new Error(
        `Unable to load events for activity: ${eventsResult.errors
          .map((error) => error.message)
          .join("; ")}`
      );
    }

    events = eventsResult.data;
  } catch (error) {
    if (!isMissingEventModelError(error)) {
      throw error;
    }
  }

  const theaterById = Object.fromEntries(
    theatersResult.data.map((theater) => [theater.id, theater])
  );
  const movieById = Object.fromEntries(
    moviesResult.data.map((movie) => [movie.id, movie])
  );

  const bookingActivity = bookingsResult.data
    .map((booking) => {
      const timestamp =
        getActivityTimestamp(booking.updatedAt) ??
        getActivityTimestamp(booking.createdAt) ??
        getActivityTimestamp(booking.publishedAt);

      if (!timestamp) {
        return null;
      }

      const movieTitle = movieById[booking.movieId]?.title ?? "Untitled movie";
      const theaterName = theaterById[booking.theaterId]?.name ?? "Unknown theater";

      return {
        id: `booking-${booking.id}`,
        title: booking.status === "published" ? "Booking published" : "Booking updated",
        detail: `${movieTitle} at ${theaterName} runs ${booking.runStartsOn} through ${booking.runEndsOn}.`,
        occurredAt: formatRelativeActivityTime(timestamp),
        occurredAtDate: timestamp,
        kind: "booking" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const movieActivity = moviesResult.data
    .map((movie) => {
      const timestamp =
        getActivityTimestamp(movie.updatedAt) ?? getActivityTimestamp(movie.createdAt);

      if (!timestamp) {
        return null;
      }

      return {
        id: `movie-${movie.id}`,
        title: "Movie updated",
        detail: `${movie.title} is currently marked ${movie.status}.`,
        occurredAt: formatRelativeActivityTime(timestamp),
        occurredAtDate: timestamp,
        kind: "movie" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const theaterActivity = theatersResult.data
    .map((theater) => {
      const timestamp =
        getActivityTimestamp(theater.updatedAt) ?? getActivityTimestamp(theater.createdAt);

      if (!timestamp) {
        return null;
      }

      return {
        id: `theater-${theater.id}`,
        title: "Theater updated",
        detail: `${theater.name} in ${theater.city}, ${theater.state} is ${theater.status}.`,
        occurredAt: formatRelativeActivityTime(timestamp),
        occurredAtDate: timestamp,
        kind: "theater" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const eventActivity = events
    .map((event) => {
      const timestamp =
        getActivityTimestamp(event.updatedAt) ?? getActivityTimestamp(event.createdAt);

      if (!timestamp) {
        return null;
      }

      return {
        id: `event-${event.id}`,
        title: event.status === "published" ? "Event published" : "Event updated",
        detail: `${event.title} starts ${toAdminDateTimeLabel(event.startsAt)}.`,
        occurredAt: formatRelativeActivityTime(timestamp),
        occurredAtDate: timestamp,
        kind: "event" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  return [
    ...bookingActivity,
    ...movieActivity,
    ...theaterActivity,
    ...eventActivity,
  ]
    .sort((left, right) => right.occurredAtDate.getTime() - left.occurredAtDate.getTime())
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      occurredAt: item.occurredAt,
      kind: item.kind,
    }));
}

export async function getImportCandidates() {
  return [];
}

export async function getTmdbImportCandidate(tmdbId: number) {
  if (isE2ETestMode()) {
    const fixture = Object.values(tmdbMovieFixtures).find(
      (item) => item.details.id === tmdbId
    );

    if (!fixture) {
      return null;
    }

    return {
      id: `tmdb-${fixture.details.id}`,
      title: fixture.details.title,
      year: new Date(fixture.details.release_date).getUTCFullYear(),
      poster: fixture.details.poster_path
        ? `https://image.tmdb.org/t/p/original${fixture.details.poster_path}`
        : "/next.svg",
      backdrop: fixture.details.backdrop_path
        ? `https://image.tmdb.org/t/p/original${fixture.details.backdrop_path}`
        : "/next.svg",
      overview: fixture.details.overview,
      genres: fixture.details.genres.slice(0, 2).map((genre) => genre.name),
      castHighlights: fixture.credits.cast.slice(0, 5).map((member) => member.name),
      trailerLabel: fixture.videos.length ? "Trailer available" : "Trailer not available yet",
      trailerYouTubeId: fixture.videos[0]?.key,
      tmdbId: fixture.details.id,
      tagline: fixture.details.tagline,
      rating: "NR",
      runtime: `${Math.floor(fixture.details.runtime / 60)}h ${fixture.details.runtime % 60}m`.trim(),
      status:
        new Date(fixture.details.release_date).getTime() > Date.now()
          ? "coming-soon"
          : "now-playing",
      director:
        fixture.credits.crew.find((member) => member.job === "Director")?.name ??
        "Director unavailable",
      releaseDate: fixture.details.release_date,
      audienceScore: `${fixture.details.vote_average.toFixed(1)} / 10`,
      originalLanguage: "English",
      productionCompanies: fixture.details.production_companies.map(
        (company) => company.name
      ),
    } satisfies ImportCandidate;
  }

  const [details, credits, trailerYouTubeId] = await Promise.all([
    getTmdbMovieDetails(tmdbId),
    getTmdbCredits(tmdbId),
    getTmdbTrailerYouTubeId(tmdbId),
  ]);

  if (!details && !credits && !trailerYouTubeId) {
    return null;
  }

  const releaseDate = details?.releaseDateIso ?? details?.releaseDate;

  return {
    id: `tmdb-${tmdbId}`,
    title: details?.title ?? "Title unavailable",
    year: releaseDate ? new Date(releaseDate).getUTCFullYear() : new Date().getUTCFullYear(),
    poster: details?.poster ?? "/next.svg",
    backdrop: details?.backdrop ?? "/next.svg",
    overview: details?.synopsis ?? "Overview unavailable.",
    genres:
      details?.genre
        ?.split("/")
        .map((genre) => genre.trim())
        .filter(Boolean) ?? ["Genre unavailable"],
    castHighlights:
      credits?.cast?.length ? credits.cast : ["Cast unavailable"],
    trailerLabel: trailerYouTubeId ? "Trailer available" : "Trailer not available yet",
    trailerYouTubeId,
    tmdbId,
    tagline: details?.tagline ?? "Imported from TMDB movie details.",
    rating: "NR",
    runtime: details?.runtime ?? "Runtime TBD",
    status: (isFutureReleaseDate(releaseDate ?? null) ? "coming-soon" : null) as
      | "coming-soon"
      | null,
    director: credits?.director ?? "Director unavailable",
    releaseDate,
    releaseDateIso: details?.releaseDateIso,
    audienceScore: details?.audienceScore,
    originalLanguage: details?.originalLanguage,
    productionCompanies: details?.productionCompanies ?? [],
  } satisfies ImportCandidate;
}

export async function searchTmdbImportCandidates(query: string) {
  if (isE2ETestMode()) {
    const normalizedQuery = query.trim().toLowerCase();
    const fixtures = Object.values(tmdbMovieFixtures)
      .filter((fixture) =>
        fixture.details.title.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6);

    return fixtures.map((fixture) => ({
      id: `tmdb-${fixture.details.id}`,
      title: fixture.details.title,
      year: new Date(fixture.details.release_date).getUTCFullYear(),
      poster: fixture.details.poster_path
        ? `https://image.tmdb.org/t/p/original${fixture.details.poster_path}`
        : "/next.svg",
      backdrop: fixture.details.backdrop_path
        ? `https://image.tmdb.org/t/p/original${fixture.details.backdrop_path}`
        : "/next.svg",
      overview: fixture.details.overview,
      genres: fixture.details.genres.slice(0, 2).map((genre) => genre.name),
      castHighlights: fixture.credits.cast.slice(0, 5).map((member) => member.name),
      trailerLabel: fixture.videos.length ? "Trailer available" : "Trailer not available yet",
      trailerYouTubeId: fixture.videos[0]?.key,
      tmdbId: fixture.details.id,
      tagline: fixture.details.tagline,
      rating: "NR",
      runtime: `${Math.floor(fixture.details.runtime / 60)}h ${fixture.details.runtime % 60}m`.trim(),
      status:
        new Date(fixture.details.release_date).getTime() > Date.now()
          ? "coming-soon"
          : "now-playing",
      director:
        fixture.credits.crew.find((member) => member.job === "Director")?.name ??
        "Director unavailable",
      releaseDate: fixture.details.release_date,
      audienceScore: `${fixture.details.vote_average.toFixed(1)} / 10`,
      originalLanguage: "English",
      productionCompanies: fixture.details.production_companies.map(
        (company) => company.name
      ),
    })) satisfies ImportCandidate[];
  }

  const results = (await searchTmdbMovies(query)).slice(0, 6);

  return Promise.all(
    results.map(async (result) => {
      const candidate = await getTmdbImportCandidate(result.id);

      return {
        id: `tmdb-${result.id}`,
        title: candidate?.title ?? result.title,
        year: getTmdbSearchResultYear(result) ?? new Date().getUTCFullYear(),
        poster:
          candidate?.poster ??
          (result.poster_path
            ? `https://image.tmdb.org/t/p/original${result.poster_path}`
            : "/next.svg"),
        backdrop:
          candidate?.backdrop ??
          (result.backdrop_path
            ? `https://image.tmdb.org/t/p/original${result.backdrop_path}`
            : "/next.svg"),
        overview:
          candidate?.overview ??
          result.overview ??
          "Overview unavailable.",
        genres: candidate?.genres ?? ["Genre unavailable"],
        castHighlights:
          candidate?.castHighlights?.length ? candidate.castHighlights : ["Cast unavailable"],
        trailerLabel: candidate?.trailerLabel ?? "Trailer not available yet",
        trailerYouTubeId: candidate?.trailerYouTubeId,
        tmdbId: result.id,
        tagline: candidate?.tagline ?? "Imported from TMDB movie details.",
        rating: candidate?.rating ?? "NR",
        runtime: candidate?.runtime ?? "Runtime TBD",
        status: (isFutureReleaseDate(toAmplifyDate(result.release_date) ?? null)
          ? "coming-soon"
          : null) as "coming-soon" | null,
        director: candidate?.director ?? "Director unavailable",
        releaseDate:
          candidate?.releaseDateIso ?? candidate?.releaseDate ?? toAmplifyDate(result.release_date),
        releaseDateIso: candidate?.releaseDateIso ?? toAmplifyDate(result.release_date),
        audienceScore:
          candidate?.audienceScore ?? `${result.vote_average.toFixed(1)} / 10`,
        originalLanguage: candidate?.originalLanguage,
        productionCompanies: candidate?.productionCompanies ?? [],
      };
    })
  );
}
