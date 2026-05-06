import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { adminEvents } from "@/lib/admin/mock-data";
import { movies as siteMovies } from "@/lib/data/movies";
import type {
  MockBookingRecord,
  MockEventRecord,
  MockMovieRecord,
  MockScreenRecord,
  MockTheaterRecord,
  MockVenueItemAvailabilityRecord,
  MockVenueItemRecord,
} from "./admin-mock-types";

export type MockModelName =
  | "Theater"
  | "Screen"
  | "Movie"
  | "Booking"
  | "Event"
  | "VenueItem"
  | "VenueItemAvailability";

type MockRecordMap = {
  Theater: MockTheaterRecord;
  Screen: MockScreenRecord;
  Movie: MockMovieRecord;
  Booking: MockBookingRecord;
  Event: MockEventRecord;
  VenueItem: MockVenueItemRecord;
  VenueItemAvailability: MockVenueItemAvailabilityRecord;
};

type MockDb = {
  theaters: MockTheaterRecord[];
  screens: MockScreenRecord[];
  movies: MockMovieRecord[];
  bookings: MockBookingRecord[];
  events: MockEventRecord[];
  venueItems: MockVenueItemRecord[];
  venueItemAvailability: MockVenueItemAvailabilityRecord[];
};

const DB_DIR = path.join(process.cwd(), ".tmp");
const DB_PATH = path.join(DB_DIR, "e2e-admin-db.json");
const DB_TEMP_PATH = path.join(DB_DIR, "e2e-admin-db.tmp.json");

function nowIso() {
  return new Date().toISOString();
}

function clone<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

function createDefaultDb(): MockDb {
  const seedMovie = siteMovies[0];
  const seedEvent = adminEvents[0];
  const createdAt = nowIso();

  return {
    theaters: [
      {
        id: "theater-seed",
        sortOrder: 1,
        slug: "seed-theater",
        name: "Seed Theater",
        city: "Fairmont",
        state: "MN",
        district: "Main Street",
        established: 1946,
        status: "active",
        address: "100 Main Street",
        phone: "(555) 010-2001",
        contactEmail: "seed@smalltowntheater.org",
        manager: "Jordan Ellis",
        notes: "Seed theater for e2e flows.",
        heroImage: "/next.svg",
        descriptionParagraphs: ["Seed theater intro.", "Seed theater second paragraph."],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    screens: [
      {
        id: "screen-seed",
        theaterId: "theater-seed",
        name: "Main Screen",
        slug: "main-screen",
        capacity: 120,
        sortOrder: 1,
        projection: "4K Laser",
        soundFormat: "Dolby 7.1",
        features: ["Wheelchair seating row", "Assisted listening available"],
        status: "active",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    movies: [
      {
        id: "movie-seed",
        slug: seedMovie.slug,
        title: seedMovie.title,
        tagline: seedMovie.tagline,
        rating: seedMovie.rating,
        runtime: seedMovie.runtime,
        genre: seedMovie.genre,
        status: "nowPlaying",
        director: seedMovie.director,
        cast: seedMovie.cast,
        synopsis: seedMovie.synopsis,
        production: seedMovie.production,
        score: seedMovie.score,
        cinematography: seedMovie.cinematography,
        backdrop: seedMovie.backdrop,
        poster: seedMovie.poster,
        releaseDate: "2023-04-05",
        audienceScore: seedMovie.audienceScore,
        originalLanguage: seedMovie.originalLanguage,
        productionCompanies: seedMovie.productionCompanies,
        tmdbId: seedMovie.tmdbId ?? null,
        trailerYouTubeId: seedMovie.trailerYouTubeId ?? null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    bookings: [],
    events: [
      {
        id: "event-seed",
        slug: seedEvent.slug,
        theaterId: "theater-seed",
        title: seedEvent.title,
        summary: seedEvent.summary,
        description: seedEvent.description,
        image: seedEvent.image,
        status: seedEvent.status,
        startsAt: "2026-05-10T19:00:00.000Z",
        endsAt: "2026-05-10T21:00:00.000Z",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    venueItems: [
      {
        id: "item-seed",
        name: "Classic Popcorn",
        description: "Fresh popped popcorn with sea salt and butter topping.",
        image: "/next.svg",
        itemType: "concession",
        category: "Popcorn",
        basePrice: 8.5,
        isActive: true,
        trackInventory: true,
        sku: "CON-POP-001",
        fulfillmentType: "counter",
        prepRequired: false,
        ageRestricted: false,
        taxableCategory: "prepared-food",
        variations: [],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    venueItemAvailability: [
      {
        id: "availability-seed",
        theaterId: "theater-seed",
        itemId: "item-seed",
        isAvailable: true,
        priceOverride: null,
        currentStock: 12,
        lowStockThreshold: 5,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

async function ensureDb() {
  await mkdir(DB_DIR, { recursive: true });

  try {
    const raw = await readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as MockDb;
  } catch {
    const db = createDefaultDb();
    await writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return db;
  }
}

async function saveDb(db: MockDb) {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_TEMP_PATH, JSON.stringify(db, null, 2));
  await rename(DB_TEMP_PATH, DB_PATH);
}

export async function resetMockAdminDb() {
  const db = createDefaultDb();
  await saveDb(db);
  return clone(db);
}

function getCollection<Model extends MockModelName>(
  db: MockDb,
  model: Model
): MockRecordMap[Model][] {
  switch (model) {
    case "Theater":
      return db.theaters as MockRecordMap[Model][];
    case "Screen":
      return db.screens as MockRecordMap[Model][];
    case "Movie":
      return db.movies as MockRecordMap[Model][];
    case "Booking":
      return db.bookings as MockRecordMap[Model][];
    case "Event":
      return db.events as MockRecordMap[Model][];
    case "VenueItem":
      return db.venueItems as MockRecordMap[Model][];
    case "VenueItemAvailability":
      return db.venueItemAvailability as MockRecordMap[Model][];
  }
}

export async function listMockRecords<Model extends MockModelName>(
  model: Model,
  params?: Record<string, unknown>
): Promise<MockRecordMap[Model][]> {
  const db = await ensureDb();
  const collection = getCollection(db, model);

  if (model === "Screen" && typeof params?.theaterId === "string") {
    return clone(
      (collection as MockScreenRecord[]).filter(
        (record) => record.theaterId === params.theaterId
      )
    ) as MockRecordMap[Model][];
  }

  return clone(collection);
}

export async function getMockRecord<Model extends MockModelName>(
  model: Model,
  id: string
): Promise<MockRecordMap[Model] | null> {
  const db = await ensureDb();
  const collection = getCollection(db, model);
  return clone(collection.find((record) => record.id === id) ?? null);
}

export async function createMockRecord<Model extends MockModelName>(
  model: Model,
  input: Record<string, unknown>
): Promise<MockRecordMap[Model]> {
  const db = await ensureDb();
  const collection = getCollection(db, model);
  const createdAt = nowIso();
  const record = {
    id: typeof input.id === "string" && input.id !== "new-item"
      ? input.id
      : `${model.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
    ...input,
    createdAt,
    updatedAt: createdAt,
  };

  collection.push(record as MockRecordMap[Model]);
  await saveDb(db);

  return clone(record as MockRecordMap[Model]);
}

export async function updateMockRecord<Model extends MockModelName>(
  model: Model,
  input: Record<string, unknown>
): Promise<MockRecordMap[Model] | null> {
  const id = typeof input.id === "string" ? input.id : "";
  if (!id) {
    return null;
  }

  const db = await ensureDb();
  const collection = getCollection(db, model);
  const index = collection.findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const nextRecord = {
    ...collection[index],
    ...input,
    updatedAt: nowIso(),
  };

  collection[index] = nextRecord as MockRecordMap[Model];
  await saveDb(db);

  return clone(nextRecord as MockRecordMap[Model]);
}

export async function deleteMockRecord<Model extends MockModelName>(
  model: Model,
  id: string
): Promise<MockRecordMap[Model] | null> {
  const db = await ensureDb();
  const collection = getCollection(db, model);
  const index = collection.findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const [deleted] = collection.splice(index, 1);

  if (model === "VenueItem") {
    db.venueItemAvailability = db.venueItemAvailability.filter(
      (record) => record.itemId !== id
    );
  }

  await saveDb(db);

  return clone(deleted);
}
