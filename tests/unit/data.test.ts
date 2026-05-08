import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicMoviesFromAmplify } = vi.hoisted(() => ({
  listPublicMoviesFromAmplify: vi.fn(),
}));

vi.mock("@/lib/amplify/public-server", () => ({
  listPublicBookingsFromAmplify: vi.fn(),
  listPublicEventsFromAmplify: vi.fn(),
  listPublicMoviesFromAmplify,
  listPublicScreensFromAmplify: vi.fn(),
  listPublicTheatersFromAmplify: vi.fn(),
  listPublicVenueItemAvailabilityFromAmplify: vi.fn(),
  listPublicVenueItemsFromAmplify: vi.fn(),
  resolvePublicStorageUrl: vi.fn(),
}));

import { getComingSoonMovies } from "@/lib/data";

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

describe("getComingSoonMovies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T12:00:00Z"));
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
