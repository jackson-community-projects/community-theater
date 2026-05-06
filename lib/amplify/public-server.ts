import { generateClient } from "aws-amplify/data/server";
import { getUrl } from "aws-amplify/storage/server";

import type { Schema } from "@/amplify/data/resource";
import { amplifyConfig } from "@/lib/amplify/runtime-config";
import { listMockRecords } from "@/lib/e2e/admin-mock-store";
import { isE2ETestMode } from "@/lib/e2e/config";
import { runWithGuestServerContext } from "@/lib/auth/server";
import { getAmplifyStoragePathFromUrl } from "@/lib/amplify/storage";

const client = generateClient<Schema>({ config: amplifyConfig });

function getPublicEventModel() {
  const eventModel = (client.models as Record<string, unknown>).Event;

  if (!eventModel) {
    throw new Error(
      "Events are not available right now."
    );
  }

  return eventModel as {
    list: (...args: unknown[]) => unknown;
  };
}

function getPublicVenueItemModel() {
  const venueItemModel = (client.models as Record<string, unknown>).VenueItem;

  if (!venueItemModel) {
    throw new Error(
      "Catalog items are not available right now."
    );
  }

  return venueItemModel as {
    list: (...args: unknown[]) => unknown;
  };
}

function getPublicVenueItemAvailabilityModel() {
  const availabilityModel = (client.models as Record<string, unknown>).VenueItemAvailability;

  if (!availabilityModel) {
    throw new Error(
      "Item availability is not available right now."
    );
  }

  return availabilityModel as {
    list: (...args: unknown[]) => unknown;
  };
}
const publicTheaterSelection = [
  "id",
  "slug",
  "name",
  "city",
  "state",
  "district",
  "established",
  "status",
  "address",
  "phone",
  "contactEmail",
  "manager",
  "heroImage",
  "descriptionParagraphs",
  "createdAt",
  "updatedAt",
] as const;
const publicScreenSelection = [
  "id",
  "theaterId",
  "name",
  "slug",
  "capacity",
  "sortOrder",
  "projection",
  "soundFormat",
  "features",
  "status",
  "createdAt",
  "updatedAt",
] as const;
const publicMovieSelection = [
  "id",
  "slug",
  "title",
  "tagline",
  "rating",
  "runtime",
  "genre",
  "status",
  "director",
  "cast",
  "synopsis",
  "production",
  "score",
  "cinematography",
  "backdrop",
  "poster",
  "releaseDate",
  "audienceScore",
  "originalLanguage",
  "productionCompanies",
  "tmdbId",
  "trailerYouTubeId",
  "createdAt",
  "updatedAt",
] as const;
const publicBookingSelection = [
  "id",
  "slug",
  "theaterId",
  "movieId",
  "screenId",
  "screenName",
  "status",
  "runStartsOn",
  "runEndsOn",
  "ticketPrice",
  "badge",
  "showtimes.day",
  "showtimes.times",
  "exceptions.date",
  "exceptions.label",
  "createdAt",
  "updatedAt",
] as const;
const publicEventSelection = [
  "id",
  "slug",
  "theaterId",
  "title",
  "summary",
  "description",
  "image",
  "status",
  "startsAt",
  "endsAt",
  "createdAt",
  "updatedAt",
] as const;
const publicVenueItemSelection = [
  "id",
  "name",
  "description",
  "image",
  "itemType",
  "category",
  "basePrice",
  "isActive",
  "trackInventory",
  "sku",
  "fulfillmentType",
  "prepRequired",
  "ageRestricted",
  "taxableCategory",
  "variations.id",
  "variations.name",
  "variations.description",
  "variations.priceDelta",
  "variations.sortOrder",
  "createdAt",
  "updatedAt",
] as const;
const publicVenueItemAvailabilitySelection = [
  "id",
  "theaterId",
  "itemId",
  "isAvailable",
  "priceOverride",
  "currentStock",
  "lowStockThreshold",
  "createdAt",
  "updatedAt",
] as const;

export async function listPublicTheatersFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("Theater")) as unknown as Schema["Theater"]["type"][],
      errors: undefined,
    };
  }

  return runWithGuestServerContext((contextSpec) =>
    client.models.Theater.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "ASC",
      selectionSet: publicTheaterSelection,
    })
  );
}

export async function listPublicScreensFromAmplify(theaterId: string) {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords(
        "Screen",
        { theaterId }
      )) as unknown as Schema["Screen"]["type"][],
      errors: undefined,
    };
  }

  return runWithGuestServerContext((contextSpec) =>
    client.models.Screen.listScreensByTheater(
      contextSpec,
      { theaterId },
      {
        authMode: "identityPool",
        selectionSet: publicScreenSelection,
      }
    )
  );
}

export async function listPublicMoviesFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("Movie")) as unknown as Schema["Movie"]["type"][],
      errors: undefined,
    };
  }

  return runWithGuestServerContext((contextSpec) =>
    client.models.Movie.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "DESC",
      selectionSet: publicMovieSelection,
    })
  );
}

export async function listPublicBookingsFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("Booking")) as unknown as Schema["Booking"]["type"][],
      errors: undefined,
    };
  }

  return runWithGuestServerContext((contextSpec) =>
    client.models.Booking.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "ASC",
      selectionSet: publicBookingSelection,
    })
  );
}

export async function listPublicEventsFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("Event")) as unknown as Schema["Event"]["type"][],
      errors: undefined,
    };
  }

  const eventModel = getPublicEventModel();

  return runWithGuestServerContext((contextSpec) =>
    eventModel.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "ASC",
      selectionSet: publicEventSelection,
    })
  ) as Promise<{
    data: Schema["Event"]["type"][];
    errors?: { message: string }[];
  }>;
}

export async function listPublicVenueItemsFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("VenueItem")) as unknown as Schema["VenueItem"]["type"][],
      errors: undefined,
    };
  }

  const venueItemModel = getPublicVenueItemModel();

  return runWithGuestServerContext((contextSpec) =>
    venueItemModel.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "ASC",
      selectionSet: publicVenueItemSelection,
    })
  ) as Promise<{
    data: Schema["VenueItem"]["type"][];
    errors?: { message: string }[];
  }>;
}

export async function listPublicVenueItemAvailabilityFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords(
        "VenueItemAvailability"
      )) as unknown as Schema["VenueItemAvailability"]["type"][],
      errors: undefined,
    };
  }

  const availabilityModel = getPublicVenueItemAvailabilityModel();

  return runWithGuestServerContext((contextSpec) =>
    availabilityModel.list(contextSpec, {
      authMode: "identityPool",
      sortDirection: "ASC",
      selectionSet: publicVenueItemAvailabilitySelection,
    })
  ) as Promise<{
    data: Schema["VenueItemAvailability"]["type"][];
    errors?: { message: string }[];
  }>;
}

export async function resolvePublicStorageUrl(url?: string | null) {
  if (isE2ETestMode()) {
    return url ?? null;
  }

  const path = getAmplifyStoragePathFromUrl(url);

  if (!url || !path) {
    return url ?? null;
  }

  return runWithGuestServerContext(async (contextSpec) => {
    const result = await getUrl(contextSpec, {
      path,
      options: {
        validateObjectExistence: true,
      },
    });

    return result.url.toString();
  });
}
