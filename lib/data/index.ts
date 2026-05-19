/**
 * Data access layer.
 *
 * All functions are async so callers don't need to change when these are
 * replaced with GraphQL queries or REST fetch calls.
 */

import { movies } from "./movies";
import { memberships } from "./memberships";
import { theaters } from "./theaters";
import { adminEvents as fallbackAdminEvents } from "@/lib/admin/mock-data";
import {
  listPublicBookingsFromAmplify,
  listPublicEventsFromAmplify,
  listPublicMoviesFromAmplify,
  listPublicScreensFromAmplify,
  listPublicTheatersFromAmplify,
  listPublicVenueItemAvailabilityFromAmplify,
  listPublicVenueItemsFromAmplify,
  resolvePublicStorageUrl,
} from "@/lib/amplify/public-server";
import { CONCESSION_ITEM_PLACEHOLDER_IMAGE } from "@/lib/concessions";
import {
  getTmdbCredits,
  getTmdbMovieDetails,
  getTmdbTrailerYouTubeId,
} from "./tmdb";
import type {
  Booking,
  BookingDay,
  BookingException,
  BookingStatus,
  BookingShowtime,
  Movie,
  MembershipProgram,
  Screen,
  ScreenStatus,
  Theater,
  TheaterSpec,
  TheaterStatus,
  MovieShowtime,
  TheaterWithBookings,
  TheaterWithShowtimes,
  BookingTimeSlot,
  Event,
} from "./types";

export type {
  Booking,
  BookingDay,
  BookingException,
  BookingStatus,
  BookingShowtime,
  Movie,
  MembershipProgram,
  Screen,
  ScreenStatus,
  Theater,
  TheaterStatus,
  MovieShowtime,
  TheaterWithBookings,
  TheaterWithShowtimes,
  BookingTimeSlot,
  Event,
};

type PublicAmplifyTheater = Awaited<
  ReturnType<typeof listPublicTheatersFromAmplify>
>["data"][number];
type PublicAmplifyScreen = Awaited<
  ReturnType<typeof listPublicScreensFromAmplify>
>["data"][number];
type PublicAmplifyMovie = Awaited<
  ReturnType<typeof listPublicMoviesFromAmplify>
>["data"][number];
type PublicAmplifyBooking = Awaited<
  ReturnType<typeof listPublicBookingsFromAmplify>
>["data"][number];
type PublicAmplifyVenueItem = Awaited<
  ReturnType<typeof listPublicVenueItemsFromAmplify>
>["data"][number];
type PublicAmplifyVenueItemAvailability = Awaited<
  ReturnType<typeof listPublicVenueItemAvailabilityFromAmplify>
>["data"][number];

const PUBLIC_EVENT_TIME_ZONE = "America/Chicago";

function sortTheatersByOrder<TheaterRecord extends { sortOrder: number; name: string }>(
  theaters: TheaterRecord[]
) {
  return [...theaters].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.name.localeCompare(right.name)
      : left.sortOrder - right.sortOrder
  );
}

function getOptionalTheaterSortOrder(theater: unknown) {
  const value = (theater as { sortOrder?: unknown }).sortOrder;
  return typeof value === "number" ? value : null;
}

function formatConcessionPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function getConcessionDisplayPrice(item: PublicAmplifyVenueItem, basePrice: number) {
  const variationPrices = (item.variations ?? [])
    .filter((variation): variation is NonNullable<typeof variation> => Boolean(variation))
    .map((variation) => basePrice + (variation.priceDelta ?? 0));

  if (!variationPrices.length) {
    return formatConcessionPrice(basePrice);
  }

  const uniquePrices = Array.from(
    new Set(
      [basePrice, ...variationPrices].map((price) => Number(price.toFixed(2)))
    )
  ).sort((left, right) => left - right);

  if (uniquePrices.length <= 1) {
    return formatConcessionPrice(basePrice);
  }

  return `From ${formatConcessionPrice(uniquePrices[0])}`;
}

function buildTheaterSpecs(
  theater: PublicAmplifyTheater,
  associatedScreens: PublicAmplifyScreen[]
): TheaterSpec[] {
  const sortedScreens = associatedScreens
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const featuredScreens = sortedScreens.filter((screen) => screen.status === "active");
  const screensForSummary = featuredScreens.length ? featuredScreens : sortedScreens;
  const leadScreen = screensForSummary[0] ?? null;
  const screenCount = sortedScreens.length;
  const totalSeats = sortedScreens.reduce(
    (seatTotal, screen) => seatTotal + screen.capacity,
    0
  );
  const projectionSummary = Array.from(
    new Set(screensForSummary.map((screen) => screen.projection))
  )
    .slice(0, 2)
    .join(" / ");
  const featureSummary = leadScreen
    ? leadScreen.features.slice(0, 2).join(" · ")
    : "Feature details coming soon";

  return [
    {
      label: "Screens",
      value:
        screenCount > 0
          ? `${screenCount} ${screenCount === 1 ? "Screen" : "Screens"}${projectionSummary ? ` · ${projectionSummary}` : ""}`
          : "Screen details coming soon",
    },
    {
      label: "Seating",
      value:
        totalSeats > 0
          ? `${totalSeats} Seats Total${leadScreen ? ` · ${leadScreen.name}` : ""}`
          : "Capacity details coming soon",
    },
    {
      label: "Sound",
      value: leadScreen
        ? `${leadScreen.soundFormat}${screenCount > 1 ? ` · ${leadScreen.name}` : ""}`
        : "Audio details coming soon",
    },
    {
      label: "Features",
      value: featureSummary,
    },
    {
      label: "Phone",
      value: theater.phone ?? "Contact details coming soon",
    },
  ];
}

async function toSiteTheater(theater: PublicAmplifyTheater): Promise<Theater> {
  const fallback = theaters.find(
    (siteTheater) =>
      siteTheater.slug === theater.slug || siteTheater.name === theater.name
  );
  const screensResult = await listPublicScreensFromAmplify(theater.id);
  const associatedScreens = screensResult.errors?.length ? [] : screensResult.data;

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
    notes: fallback?.notes ?? "",
    heroImage:
      (await resolvePublicStorageUrl(theater.heroImage)) ??
      fallback?.heroImage ??
      "/next.svg",
    descriptionParagraphs: (
      theater.descriptionParagraphs ?? fallback?.descriptionParagraphs ?? []
    ).filter((paragraph): paragraph is string => Boolean(paragraph)),
    specs: buildTheaterSpecs(theater, associatedScreens),
    concessions:
      fallback?.concessions.map((item) => ({
        ...item,
        image: item.image?.trim() || CONCESSION_ITEM_PLACEHOLDER_IMAGE,
      })) ?? [],
  };
}

async function getPublicTheatersFromAmplify(): Promise<Theater[]> {
  const result = await listPublicTheatersFromAmplify();

  if (result.errors?.length) {
    throw new Error(
      `Unable to load public theaters from Amplify: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return sortTheatersByOrder(await Promise.all(result.data.map(toSiteTheater)));
}

async function getPublicTheaterByRouteKey(routeKey: string): Promise<Theater | null> {
  const publicTheaters = await getPublicTheatersFromAmplify();

  return (
    publicTheaters.find(
      (theater) =>
        theater.id === routeKey || theater.slug === routeKey || theater.name === routeKey
    ) ?? null
  );
}

function toMovieStatus(
  status: PublicAmplifyMovie["status"]
): Movie["status"] | "draft" | "archived" {
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

function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

function isFutureMovieReleaseDate(releaseDate?: string) {
  if (!releaseDate) {
    return false;
  }

  return releaseDate > getTodayIsoDate();
}

function isComingSoonMovie(movie: Movie) {
  return (
    movie.status === "coming-soon" ||
    !movie.releaseDate ||
    isFutureMovieReleaseDate(movie.releaseDate)
  );
}

function isActivePublishedBooking(booking: Booking, todayIso = getTodayIsoDate()) {
  return (
    booking.status === "published" &&
    booking.runStartsOn <= todayIso &&
    booking.runEndsOn >= todayIso
  );
}

function compareBookingsByStartDate(left: Booking, right: Booking) {
  return left.runStartsOn.localeCompare(right.runStartsOn);
}

function getHomepageFeaturedBookingIds(
  bookings: Booking[],
  todayIso = getTodayIsoDate()
): string[] {
  const publishedBookings = bookings
    .filter((booking) => booking.status === "published")
    .sort(compareBookingsByStartDate);
  const nextUpcomingIndex = publishedBookings.findIndex(
    (booking) => booking.runEndsOn >= todayIso
  );
  const orderedBookings =
    nextUpcomingIndex >= 0
      ? publishedBookings.slice(nextUpcomingIndex)
      : [...publishedBookings].sort((left, right) =>
          right.runEndsOn.localeCompare(left.runEndsOn) ||
          right.runStartsOn.localeCompare(left.runStartsOn)
        );

  return Array.from(
    new Set(orderedBookings.map((booking) => booking.movieSlug))
  );
}

function toSiteMovie(movie: PublicAmplifyMovie): Movie {
  const fallback = movies.find(
    (siteMovie) => siteMovie.slug === movie.slug || siteMovie.tmdbId === movie.tmdbId
  );
  const mappedStatus = toMovieStatus(movie.status);

  return {
    slug: movie.slug,
    title: movie.title,
    tagline: movie.tagline ?? fallback?.tagline ?? "Tagline unavailable.",
    rating: movie.rating ?? fallback?.rating ?? "NR",
    runtime: movie.runtime ?? fallback?.runtime ?? "Runtime TBD",
    genre: movie.genre ?? fallback?.genre ?? "Genre unavailable",
    status:
      mappedStatus === "draft" || mappedStatus === "archived"
        ? fallback?.status ?? "coming-soon"
        : mappedStatus,
    director: movie.director ?? fallback?.director ?? "Director unavailable",
    cast:
      movie.cast?.filter((credit): credit is string => Boolean(credit)) ??
      fallback?.cast ??
      [],
    synopsis: movie.synopsis ?? fallback?.synopsis ?? "Synopsis unavailable.",
    production: movie.production ?? fallback?.production ?? "Production unavailable",
    score: movie.score ?? fallback?.score ?? "Score unavailable",
    cinematography:
      movie.cinematography ??
      fallback?.cinematography ??
      "Cinematography unavailable",
    backdrop: movie.backdrop ?? fallback?.backdrop ?? "/next.svg",
    poster: movie.poster ?? fallback?.poster ?? "/next.svg",
    releaseDate: movie.releaseDate ?? fallback?.releaseDate,
    audienceScore: movie.audienceScore ?? fallback?.audienceScore,
    originalLanguage: movie.originalLanguage ?? fallback?.originalLanguage,
    productionCompanies:
      movie.productionCompanies?.filter(
        (company): company is string => Boolean(company)
      ) ?? fallback?.productionCompanies,
    tmdbId: movie.tmdbId ?? fallback?.tmdbId,
    trailerYouTubeId: movie.trailerYouTubeId ?? fallback?.trailerYouTubeId,
  };
}

async function getPublicMoviesFromAmplify(): Promise<Movie[]> {
  const result = await listPublicMoviesFromAmplify();

  if (result.errors?.length) {
    throw new Error(
      `Unable to load public movies from Amplify: ${result.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return result.data.map(toSiteMovie);
}

function toSiteBooking(booking: PublicAmplifyBooking, movieSlug: string): Booking {
  return {
    id: booking.id,
    slug: booking.slug,
    theaterId: booking.theaterId,
    screenId: booking.screenId,
    movieSlug,
    status: booking.status,
    runStartsOn: booking.runStartsOn,
    runEndsOn: booking.runEndsOn,
    ticketPrice: booking.ticketPrice ?? "",
    badge: booking.badge ?? null,
    showtimes:
      ((booking.showtimes ?? []) as Array<
        | {
            day: BookingDay;
            times: Array<string | null> | null;
          }
        | null
        | undefined
      >)
        .filter(
          (showtime): showtime is NonNullable<typeof showtime> => showtime != null
        )
        .map((showtime) => ({
          day: showtime.day,
          times: (showtime.times ?? []).filter(
            (time): time is string => typeof time === "string" && time.length > 0
          ),
        })),
    exceptions:
      ((booking.exceptions ?? []) as Array<
        | {
            date: string;
            label: string;
          }
        | null
        | undefined
      >)
        .filter(
          (exception): exception is NonNullable<typeof exception> => exception != null
        )
        .map((exception) => ({
          date: exception.date,
          label: exception.label,
        })),
    note: "",
  };
}

async function getPublicBookingsFromAmplify(): Promise<Booking[]> {
  const [bookingsResult, moviesResult] = await Promise.all([
    listPublicBookingsFromAmplify(),
    listPublicMoviesFromAmplify(),
  ]);

  if (bookingsResult.errors?.length) {
    throw new Error(
      `Unable to load public bookings from Amplify: ${bookingsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (moviesResult.errors?.length) {
    throw new Error(
      `Unable to load public movies for bookings from Amplify: ${moviesResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const movieSlugById = Object.fromEntries(
    moviesResult.data.map((movie) => [movie.id, movie.slug])
  );

  return bookingsResult.data.flatMap((booking) => {
    const movieSlug = movieSlugById[booking.movieId];
    if (!movieSlug) {
      return [];
    }

    return [toSiteBooking(booking, movieSlug)];
  });
}

function toDayShort(day: BookingDay): string {
  return day.slice(0, 3);
}

function flattenBookingTimes(showtimes: BookingShowtime[]): BookingTimeSlot[] {
  return showtimes.flatMap((showtime) =>
    showtime.times.map((time) => ({
      day: showtime.day,
      dayShort: toDayShort(showtime.day),
      time,
    }))
  );
}

function toPublicEventDateLabel(value: string) {
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
    timeZone: PUBLIC_EVENT_TIME_ZONE,
  }).format(date);
}

function isMissingPublicEventModelError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Amplify Event model is unavailable")
  );
}

async function getPublicEventsFromAmplify(): Promise<Event[]> {
  const [eventsResult, publicTheaters] = await Promise.all([
    listPublicEventsFromAmplify(),
    getPublicTheatersFromAmplify(),
  ]);

  if (eventsResult.errors?.length) {
    throw new Error(
      `Unable to load public events from Amplify: ${eventsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const theaterById = Object.fromEntries(
    publicTheaters.map((theater) => [theater.id, theater])
  );

  return Promise.all(eventsResult.data.map(async (event) => {
    const theater = theaterById[event.theaterId];

    return {
      id: event.id,
      slug: event.slug,
      theaterId: event.theaterId,
      theaterName: theater?.name ?? "Unknown theater",
      theaterSlug: theater?.slug ?? "",
      title: event.title,
      summary: event.summary,
      description: event.description ?? "",
      image: (await resolvePublicStorageUrl(event.image))?.trim() || "/next.svg",
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      startsAtLabel: toPublicEventDateLabel(event.startsAt),
      endsAtLabel: toPublicEventDateLabel(event.endsAt),
      status: event.status,
    };
  }));
}

async function getFallbackEvents(): Promise<Event[]> {
  const publicTheaters = await getPublicTheatersFromAmplify();
  const theaterById = Object.fromEntries(
    publicTheaters.map((theater) => [theater.id, theater])
  );

  return fallbackAdminEvents.map((event) => ({
    id: event.id,
    slug: event.slug,
    theaterId: event.theaterId,
    theaterName: theaterById[event.theaterId]?.name ?? "Unknown theater",
    theaterSlug: theaterById[event.theaterId]?.slug ?? "",
    title: event.title,
    summary: event.summary,
    description: event.description,
    image: event.image,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    startsAtLabel: event.startsAtLabel,
    endsAtLabel: event.endsAtLabel,
    status: event.status,
  }));
}

function isMissingPublicVenueItemModelError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Amplify VenueItem model is unavailable") ||
      error.message.includes("Amplify VenueItemAvailability model is unavailable"))
  );
}

async function toSiteConcessionItem(params: {
  item: PublicAmplifyVenueItem;
  availability: PublicAmplifyVenueItemAvailability;
}) {
  const effectivePrice = params.availability.priceOverride ?? params.item.basePrice;

  return {
    name: params.item.name,
    price: getConcessionDisplayPrice(params.item, effectivePrice),
    note: params.item.description?.trim() || params.item.category,
    image:
      (await resolvePublicStorageUrl(params.item.image))?.trim() ||
      CONCESSION_ITEM_PLACEHOLDER_IMAGE,
  };
}

async function getPublicConcessionsForTheater(theaterId: string) {
  const [itemsResult, availabilityResult] = await Promise.all([
    listPublicVenueItemsFromAmplify(),
    listPublicVenueItemAvailabilityFromAmplify(),
  ]);

  if (itemsResult.errors?.length) {
    throw new Error(
      `Unable to load public venue items from Amplify: ${itemsResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  if (availabilityResult.errors?.length) {
    throw new Error(
      `Unable to load public venue item availability from Amplify: ${availabilityResult.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  const itemById = Object.fromEntries(itemsResult.data.map((item) => [item.id, item]));

  const availableItems = availabilityResult.data
    .filter((availability) => availability.theaterId === theaterId && availability.isAvailable)
    .map((availability) => ({
      availability,
      item: itemById[availability.itemId],
    }))
    .filter(
      (
        record
      ): record is {
        availability: PublicAmplifyVenueItemAvailability;
        item: PublicAmplifyVenueItem;
      } => Boolean(record.item?.isActive)
    )
    .sort((left, right) => {
      if (left.item.category === right.item.category) {
        return left.item.name.localeCompare(right.item.name);
      }

      return left.item.category.localeCompare(right.item.category);
    });

  return Promise.all(
    availableItems.map(({ item, availability }) =>
      toSiteConcessionItem({ item, availability })
    )
  );
}

// ── Movies ────────────────────────────────────────────────────────────────────

export async function getMovies(): Promise<Movie[]> {
  return getPublicMoviesFromAmplify();
}

export async function getMovie(slug: string): Promise<Movie | null> {
  const publicMovies = await getPublicMoviesFromAmplify();
  return publicMovies.find((movie) => movie.slug === slug) ?? null;
}

export async function getNowPlayingMovies(): Promise<Movie[]> {
  const [publicMovies, publicBookings] = await Promise.all([
    getPublicMoviesFromAmplify(),
    getPublicBookingsFromAmplify(),
  ]);
  const activeMovieSlugs = new Set(
    publicBookings.filter((booking) => isActivePublishedBooking(booking)).map((booking) => booking.movieSlug)
  );

  return publicMovies.filter((movie) => activeMovieSlugs.has(movie.slug));
}

export async function getHomepageFeaturedMovies(): Promise<Movie[]> {
  const [publicMovies, publicBookings] = await Promise.all([
    getPublicMoviesFromAmplify(),
    getPublicBookingsFromAmplify(),
  ]);
  const movieBySlug = Object.fromEntries(
    publicMovies.map((movie) => [movie.slug, movie])
  );

  return getHomepageFeaturedBookingIds(publicBookings)
    .map((movieSlug) => movieBySlug[movieSlug])
    .filter((movie): movie is Movie => Boolean(movie));
}

export async function getComingSoonMovies(): Promise<Movie[]> {
  const publicMovies = await getPublicMoviesFromAmplify();
  return publicMovies.filter(isComingSoonMovie);
}

export async function getMovieDetail(slug: string): Promise<Movie | null> {
  const publicMovies = await getPublicMoviesFromAmplify();
  const movie = publicMovies.find((item) => item.slug === slug);
  if (!movie) return null;

  const [trailerYouTubeId, credits, details] = movie.tmdbId
    ? await Promise.all([
        movie.trailerYouTubeId
          ? Promise.resolve(movie.trailerYouTubeId)
          : getTmdbTrailerYouTubeId(movie.tmdbId),
        getTmdbCredits(movie.tmdbId),
        getTmdbMovieDetails(movie.tmdbId),
      ])
    : [movie.trailerYouTubeId, undefined, undefined];

  return {
    ...movie,
    title: details?.title ?? movie.title,
    tagline: details?.tagline ?? movie.tagline,
    runtime: details?.runtime ?? movie.runtime,
    genre: details?.genre ?? movie.genre,
    director: credits?.director ?? movie.director,
    cast: credits?.cast?.length ? credits.cast : movie.cast,
    synopsis: details?.synopsis ?? movie.synopsis,
    poster: details?.poster ?? movie.poster,
    backdrop: details?.backdrop ?? movie.backdrop,
    releaseDate: details?.releaseDate ?? movie.releaseDate,
    audienceScore: details?.audienceScore ?? movie.audienceScore ?? movie.score,
    originalLanguage:
      details?.originalLanguage ?? movie.originalLanguage ?? "English",
    productionCompanies:
      details?.productionCompanies ??
      movie.productionCompanies ??
      [movie.production],
    trailerYouTubeId,
  };
}

export async function getMovieShowtimes(slug: string): Promise<MovieShowtime[]> {
  const [publicTheaters, publicBookings, publicScreens] = await Promise.all([
    getPublicTheatersFromAmplify(),
    getPublicBookingsFromAmplify(),
    getScreens(),
  ]);
  const theaterById = Object.fromEntries(
    publicTheaters.map((theater) => [theater.id, theater])
  );
  const screenById = Object.fromEntries(publicScreens.map((screen) => [screen.id, screen]));

  return publicBookings
    .filter((booking) => booking.movieSlug === slug && booking.status === "published")
    .map((booking) => ({
      bookingId: booking.id,
      theaterId: booking.theaterId,
      theaterSlug: theaterById[booking.theaterId]?.slug ?? booking.theaterId,
      theaterName: theaterById[booking.theaterId]?.name ?? booking.theaterId,
      screenId: booking.screenId,
      screenName: screenById[booking.screenId]?.name ?? booking.screenId,
      runStartsOn: booking.runStartsOn,
      runEndsOn: booking.runEndsOn,
      status: booking.status,
      badge: booking.badge,
      times: flattenBookingTimes(booking.showtimes),
      price: booking.ticketPrice,
    }));
}

export async function getEvents(): Promise<Event[]> {
  let publicEvents: Event[];

  try {
    publicEvents = await getPublicEventsFromAmplify();
  } catch (error) {
    if (isMissingPublicEventModelError(error)) {
      publicEvents = await getFallbackEvents();
    } else {
      throw error;
    }
  }

  const now = Date.now();

  return publicEvents
    .filter((event) => event.status === "published")
    .filter((event) => {
      const endsAt = new Date(event.endsAt).getTime();
      return Number.isNaN(endsAt) || endsAt >= now;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

// ── Theaters ──────────────────────────────────────────────────────────────────

export async function getTheaters(): Promise<Theater[]> {
  return getPublicTheatersFromAmplify();
}

export async function getTheater(id: string): Promise<Theater | null> {
  return getPublicTheaterByRouteKey(id);
}

export async function getMembershipPrograms(): Promise<MembershipProgram[]> {
  return memberships;
}

export async function getPrimaryMembershipProgram(): Promise<MembershipProgram | null> {
  return memberships[0] ?? null;
}

export async function getScreens(): Promise<Screen[]> {
  const publicTheaters = await getPublicTheatersFromAmplify();
  const screenCollections = await Promise.all(
    publicTheaters.map((theater) => listPublicScreensFromAmplify(theater.id))
  );

  const screensWithErrors = screenCollections.find((result) => result.errors?.length);
  if (screensWithErrors?.errors?.length) {
    throw new Error(
      `Unable to load public screens from Amplify: ${screensWithErrors.errors
        .map((error) => error.message)
        .join("; ")}`
    );
  }

  return screenCollections
    .flatMap((result) => result.data)
    .map((screen) => ({
      id: screen.id,
      theaterId: screen.theaterId,
      name: screen.name,
      slug: screen.slug,
      capacity: screen.capacity,
      sortOrder: screen.sortOrder,
      projection: screen.projection,
      soundFormat: screen.soundFormat,
      features: screen.features.filter((feature): feature is string => Boolean(feature)),
      status: screen.status,
    }))
    .sort((left, right) =>
      left.theaterId === right.theaterId
        ? left.sortOrder - right.sortOrder
        : left.theaterId.localeCompare(right.theaterId)
    );
}

export async function getScreen(screenId: string): Promise<Screen | null> {
  const publicScreens = await getScreens();
  return publicScreens.find((screen) => screen.id === screenId) ?? null;
}

export async function getScreensForTheater(theaterId: string): Promise<Screen[]> {
  const publicScreens = await getScreens();
  return publicScreens
    .filter((screen) => screen.theaterId === theaterId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getBookings(): Promise<Booking[]> {
  return getPublicBookingsFromAmplify();
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const publicBookings = await getPublicBookingsFromAmplify();
  return publicBookings.find((booking) => booking.id === bookingId) ?? null;
}

/** Theater with its currently-showing films joined in — for the theater detail page. */
export async function getTheaterWithShowtimes(
  id: string
): Promise<TheaterWithShowtimes | null> {
  const theater = await getPublicTheaterByRouteKey(id);
  if (!theater) return null;

  const [publicMovies, publicScreens, publicBookings] = await Promise.all([
    getPublicMoviesFromAmplify(),
    getScreens(),
    getPublicBookingsFromAmplify(),
  ]);
  const movieMap = Object.fromEntries(publicMovies.map((movie) => [movie.slug, movie]));
  const screenMap = Object.fromEntries(publicScreens.map((screen) => [screen.id, screen]));

  const currentBookings = publicBookings
    .filter(
      (booking) => booking.theaterId === theater.id && booking.status === "published"
    )
    .map((booking) => {
      const movie = movieMap[booking.movieSlug];
      const screen = screenMap[booking.screenId];
      if (!movie) return null;

      return {
        bookingId: booking.id,
        slug: movie.slug,
        screenName: screen?.name ?? booking.screenId,
        runStartsOn: booking.runStartsOn,
        runEndsOn: booking.runEndsOn,
        title: movie.title,
        rating: movie.rating,
        runtime: movie.runtime,
        synopsis: movie.synopsis,
        poster: movie.poster,
        badge: booking.badge,
        times: flattenBookingTimes(booking.showtimes),
        price: booking.ticketPrice,
        isNew: movie.status === "coming-soon",
      };
    })
    .filter((booking): booking is NonNullable<typeof booking> => Boolean(booking));

  let concessions = theater.concessions;

  try {
    concessions = await getPublicConcessionsForTheater(theater.id);
  } catch (error) {
    if (!isMissingPublicVenueItemModelError(error)) {
      throw error;
    }
  }

  return { ...theater, concessions, currentBookings };
}

export async function getTheaterSlugs(): Promise<string[]> {
  const publicTheaters = await getPublicTheatersFromAmplify();

  return publicTheaters.map((theater) => theater.slug);
}

/** All theaters with their bookings joined in — for the showtimes page. */
export async function getTheatersWithBookings(): Promise<TheaterWithBookings[]> {
  const [publicTheaters, publicMovies, publicScreens, publicBookings] =
    await Promise.all([
      getPublicTheatersFromAmplify(),
      getPublicMoviesFromAmplify(),
      getScreens(),
      getPublicBookingsFromAmplify(),
    ]);
  const movieMap = Object.fromEntries(publicMovies.map((movie) => [movie.slug, movie]));
  const screenMap = Object.fromEntries(publicScreens.map((screen) => [screen.id, screen]));

  return publicTheaters.map((theater) => {
    const theaterBookings = publicBookings
      .filter(
        (booking) =>
          booking.theaterId === theater.id && booking.status === "published"
      )
      .map((booking) => {
        const movie = movieMap[booking.movieSlug];
        const screen = screenMap[booking.screenId];
        if (!movie) return null;

        return {
          bookingId: booking.id,
          slug: movie.slug,
          screenName: screen?.name ?? booking.screenId,
          runStartsOn: booking.runStartsOn,
          runEndsOn: booking.runEndsOn,
          title: movie.title,
          rating: movie.rating,
          runtime: movie.runtime,
          synopsis: movie.synopsis,
          poster: movie.poster,
          badge: booking.badge,
          times: flattenBookingTimes(booking.showtimes),
          price: booking.ticketPrice,
        };
      })
      .filter((booking): booking is NonNullable<typeof booking> => Boolean(booking));

    return {
      id: theater.id,
      name: theater.name,
      district: theater.district,
      bookings: theaterBookings,
    };
  });
}

/** slugs for generateStaticParams */
export async function getMovieSlugs(): Promise<string[]> {
  const publicMovies = await getPublicMoviesFromAmplify();
  return publicMovies.map((movie) => movie.slug);
}
