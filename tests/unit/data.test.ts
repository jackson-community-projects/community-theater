import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicBookingsFromAmplify, listPublicMoviesFromAmplify } = vi.hoisted(() => ({
  listPublicBookingsFromAmplify: vi.fn(),
  listPublicMoviesFromAmplify: vi.fn(),
}));

vi.mock("@/lib/amplify/public-server", () => ({
  listPublicBookingsFromAmplify,
  listPublicEventsFromAmplify: vi.fn(),
  listPublicMoviesFromAmplify,
  listPublicScreensFromAmplify: vi.fn(),
  listPublicTheatersFromAmplify: vi.fn(),
  listPublicVenueItemAvailabilityFromAmplify: vi.fn(),
  listPublicVenueItemsFromAmplify: vi.fn(),
  resolvePublicStorageUrl: vi.fn(),
}));

import { getComingSoonMovies, getHomepageFeaturedMovies } from "@/lib/data";
import {
  listPublicEventsFromAmplify,
  listPublicScreensFromAmplify,
  listPublicTheatersFromAmplify,
  resolvePublicStorageUrl,
} from "@/lib/amplify/public-server";
import { getEvents } from "@/lib/data";

function createMovieRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: `movie-${Math.random().toString(36).slice(2)}`,
    slug: "sample-movie",
    title: "Sample Movie",
    tagline: null,
    rating: null,
    runtime: null,
    genre: null,
    status: "nowPlaying",
    director: null,
    cast: null,
    synopsis: null,
    production: null,
    score: null,
    cinematography: null,
    backdrop: null,
    poster: null,
    releaseDate: null,
    audienceScore: null,
    originalLanguage: null,
    productionCompanies: null,
    tmdbId: null,
    trailerYouTubeId: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function createBookingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: `booking-${Math.random().toString(36).slice(2)}`,
    slug: "sample-booking",
    theaterId: "theater-1",
    screenId: "screen-1",
    movieId: "movie-1",
    runStartsOn: "2026-05-01",
    runEndsOn: "2026-05-07",
    status: "published",
    ticketPrice: null,
    badge: null,
    showtimes: [],
    exceptions: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getComingSoonMovies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
    listPublicBookingsFromAmplify.mockReset();
    listPublicMoviesFromAmplify.mockReset();
  });

  it("includes undated movies, future releases, and titles marked coming soon", async () => {
    listPublicMoviesFromAmplify.mockResolvedValue({
      data: [
        createMovieRecord({
          id: "undated",
          slug: "undated",
          title: "Undated",
          releaseDate: null,
        }),
        createMovieRecord({
          id: "future-release",
          slug: "future-release",
          title: "Future Release",
          releaseDate: "2026-06-01",
        }),
        createMovieRecord({
          id: "flagged-coming-soon",
          slug: "flagged-coming-soon",
          title: "Flagged Coming Soon",
          status: "comingSoon",
          releaseDate: "2026-01-01",
        }),
        createMovieRecord({
          id: "already-playing",
          slug: "already-playing",
          title: "Already Playing",
          releaseDate: "2026-01-01",
        }),
      ],
      errors: undefined,
    });

    const movies = await getComingSoonMovies();

    expect(movies.map((movie) => movie.slug)).toEqual([
      "undated",
      "future-release",
      "flagged-coming-soon",
    ]);
  });
});

describe("getHomepageFeaturedMovies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z"));
    listPublicBookingsFromAmplify.mockReset();
    listPublicMoviesFromAmplify.mockReset();
  });

  it("prefers the next booked movie and falls back to the most recent past booking", async () => {
    listPublicMoviesFromAmplify.mockResolvedValue({
      data: [
        createMovieRecord({
          id: "movie-past",
          slug: "past-movie",
          title: "Past Movie",
        }),
        createMovieRecord({
          id: "movie-next",
          slug: "next-movie",
          title: "Next Movie",
        }),
        createMovieRecord({
          id: "movie-later",
          slug: "later-movie",
          title: "Later Movie",
        }),
      ],
      errors: undefined,
    });
    listPublicBookingsFromAmplify.mockResolvedValue({
      data: [
        createBookingRecord({
          id: "booking-past",
          movieId: "movie-past",
          runStartsOn: "2026-05-01",
          runEndsOn: "2026-05-10",
        }),
        createBookingRecord({
          id: "booking-next",
          movieId: "movie-next",
          runStartsOn: "2026-05-20",
          runEndsOn: "2026-05-27",
        }),
        createBookingRecord({
          id: "booking-later",
          movieId: "movie-later",
          runStartsOn: "2026-06-01",
          runEndsOn: "2026-06-07",
        }),
      ],
      errors: undefined,
    });

    const movies = await getHomepageFeaturedMovies();

    expect(movies.map((movie) => movie.slug)).toEqual([
      "next-movie",
      "later-movie",
    ]);
  });

  it("uses the most recent past booking when there are no current or future bookings", async () => {
    listPublicMoviesFromAmplify.mockResolvedValue({
      data: [
        createMovieRecord({
          id: "movie-earlier",
          slug: "earlier-movie",
          title: "Earlier Movie",
        }),
        createMovieRecord({
          id: "movie-latest",
          slug: "latest-movie",
          title: "Latest Movie",
        }),
      ],
      errors: undefined,
    });
    listPublicBookingsFromAmplify.mockResolvedValue({
      data: [
        createBookingRecord({
          id: "booking-earlier",
          movieId: "movie-earlier",
          runStartsOn: "2026-04-01",
          runEndsOn: "2026-04-07",
        }),
        createBookingRecord({
          id: "booking-latest",
          movieId: "movie-latest",
          runStartsOn: "2026-05-01",
          runEndsOn: "2026-05-12",
        }),
      ],
      errors: undefined,
    });

    const movies = await getHomepageFeaturedMovies();

    expect(movies.map((movie) => movie.slug)).toEqual(["latest-movie", "earlier-movie"]);
  });
});

describe("getEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
    vi.mocked(listPublicEventsFromAmplify).mockReset();
    vi.mocked(listPublicScreensFromAmplify).mockReset();
    vi.mocked(listPublicTheatersFromAmplify).mockReset();
    vi.mocked(resolvePublicStorageUrl).mockReset();
  });

  it("formats public event times in America/Chicago instead of server UTC", async () => {
    vi.mocked(listPublicEventsFromAmplify).mockResolvedValue({
      data: [
        {
          id: "event-1",
          slug: "summer-gala",
          theaterId: "theater-1",
          title: "Summer Gala",
          summary: "An evening event.",
          description: "An evening event.",
          image: null,
          status: "published",
          startsAt: "2026-07-11T00:30:00.000Z",
          endsAt: "2026-07-11T01:00:00.000Z",
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
      errors: undefined,
    });
    vi.mocked(listPublicTheatersFromAmplify).mockResolvedValue({
      data: [
        {
          id: "theater-1",
          sortOrder: 1,
          slug: "jackson",
          name: "Jackson Theater",
          city: "Jackson",
          state: "MN",
          district: "Downtown",
          established: 1928,
          status: "active",
          address: "1248 North Main Street",
          phone: null,
          contactEmail: null,
          manager: null,
          heroImage: null,
          descriptionParagraphs: null,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
      errors: undefined,
    });
    vi.mocked(listPublicScreensFromAmplify).mockResolvedValue({
      data: [],
      errors: undefined,
    });
    vi.mocked(resolvePublicStorageUrl).mockResolvedValue(null);

    const [event] = await getEvents();

    expect(event.startsAtLabel).toBe("Jul 10, 2026, 7:30 PM");
    expect(event.endsAtLabel).toBe("Jul 10, 2026, 8:00 PM");
  });
});
