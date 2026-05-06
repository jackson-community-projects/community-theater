import { generateClient } from "aws-amplify/data/server";
import { getUrl, remove } from "aws-amplify/storage/server";

import type { Schema } from "@/amplify/data/resource";
import { amplifyConfig } from "@/lib/amplify/runtime-config";
import {
  createMockRecord,
  deleteMockRecord,
  getMockRecord,
  listMockRecords,
  updateMockRecord,
} from "@/lib/e2e/admin-mock-store";
import { isE2ETestMode } from "@/lib/e2e/config";
import { runWithAuthServerContext } from "@/lib/auth/server";
import { getAmplifyStoragePathFromUrl } from "@/lib/amplify/storage";

const client = generateClient<Schema>({ config: amplifyConfig });

const adminTheaterSelection = [
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
  "notes",
  "heroImage",
  "descriptionParagraphs",
  "createdAt",
  "updatedAt",
] as const;

function getEventModel() {
  const eventModel = (client.models as Record<string, unknown>).Event;

  if (!eventModel) {
    throw new Error(
      "Events are not available right now."
    );
  }

  return eventModel as {
    list: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
    create: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    delete: (...args: unknown[]) => unknown;
  };
}

export async function listTheatersFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: await listMockRecords("Theater"),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Theater.list(contextSpec, {
      authMode: "userPool",
      sortDirection: "ASC",
      selectionSet: adminTheaterSelection,
    })
  );
}

export async function getTheaterFromAmplify(theaterId: string) {
  if (isE2ETestMode()) {
    return {
      data: await getMockRecord("Theater", theaterId),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Theater.get(
      contextSpec,
      { id: theaterId },
      {
        authMode: "userPool",
        selectionSet: adminTheaterSelection,
      }
    )
  );
}

export async function listScreensFromAmplify(theaterId?: string) {
  if (isE2ETestMode()) {
    return {
      data: await listMockRecords("Screen", theaterId ? { theaterId } : undefined),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    theaterId
      ? client.models.Screen.listScreensByTheater(
          contextSpec,
          { theaterId },
          { authMode: "userPool" }
        )
      : client.models.Screen.list(contextSpec, {
          authMode: "userPool",
          sortDirection: "ASC",
        })
  );
}

export async function getScreenFromAmplify(screenId: string) {
  if (isE2ETestMode()) {
    return {
      data: await getMockRecord("Screen", screenId),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Screen.get(contextSpec, { id: screenId }, { authMode: "userPool" })
  );
}

export async function listMoviesFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: await listMockRecords("Movie"),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Movie.list(contextSpec, {
      authMode: "userPool",
      sortDirection: "DESC",
    })
  );
}

export async function getMovieFromAmplify(movieId: string) {
  if (isE2ETestMode()) {
    return {
      data: await getMockRecord("Movie", movieId),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Movie.get(contextSpec, { id: movieId }, { authMode: "userPool" })
  );
}

export async function updateMovieInAmplify(
  input: Schema["Movie"]["updateType"]
) {
  if (isE2ETestMode()) {
    return {
      data: (await updateMockRecord(
        "Movie",
        input as Record<string, unknown>
      )) as unknown as Schema["Movie"]["type"] | null,
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Movie.update(contextSpec, input, { authMode: "userPool" })
  );
}

export async function deleteMovieInAmplify(id: string) {
  if (isE2ETestMode()) {
    return {
      data: (await deleteMockRecord(
        "Movie",
        id
      )) as unknown as Schema["Movie"]["type"] | null,
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Movie.delete(contextSpec, { id }, { authMode: "userPool" })
  );
}

export async function listBookingsFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: await listMockRecords("Booking"),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Booking.list(contextSpec, {
      authMode: "userPool",
      sortDirection: "ASC",
    })
  );
}

export async function getBookingFromAmplify(bookingId: string) {
  if (isE2ETestMode()) {
    return {
      data: await getMockRecord("Booking", bookingId),
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Booking.get(contextSpec, { id: bookingId }, { authMode: "userPool" })
  );
}

export async function listEventsFromAmplify() {
  if (isE2ETestMode()) {
    return {
      data: (await listMockRecords("Event")) as unknown as Schema["Event"]["type"][],
      errors: undefined,
    };
  }

  const eventModel = getEventModel();

  return runWithAuthServerContext((contextSpec) =>
    eventModel.list(contextSpec, {
      authMode: "userPool",
      sortDirection: "ASC",
    })
  ) as Promise<{
    data: Schema["Event"]["type"][];
    errors?: { message: string }[];
  }>;
}

export async function getEventFromAmplify(eventId: string) {
  if (isE2ETestMode()) {
    return {
      data: (await getMockRecord(
        "Event",
        eventId
      )) as unknown as Schema["Event"]["type"] | null,
      errors: undefined,
    };
  }

  const eventModel = getEventModel();

  return runWithAuthServerContext((contextSpec) =>
    eventModel.get(contextSpec, { id: eventId }, { authMode: "userPool" })
  ) as Promise<{
    data: Schema["Event"]["type"] | null;
    errors?: { message: string }[];
  }>;
}

export async function createEventInAmplify(
  input: Schema["Event"]["createType"]
) {
  if (isE2ETestMode()) {
    return {
      data: (await createMockRecord(
        "Event",
        input as Record<string, unknown>
      )) as unknown as Schema["Event"]["type"] | null,
      errors: undefined,
    };
  }

  const eventModel = getEventModel();

  return runWithAuthServerContext((contextSpec) =>
    eventModel.create(contextSpec, input, { authMode: "userPool" })
  ) as Promise<{
    data: Schema["Event"]["type"] | null;
    errors?: { message: string }[];
  }>;
}

export async function updateEventInAmplify(
  input: Schema["Event"]["updateType"]
) {
  if (isE2ETestMode()) {
    return {
      data: (await updateMockRecord(
        "Event",
        input as Record<string, unknown>
      )) as unknown as Schema["Event"]["type"] | null,
      errors: undefined,
    };
  }

  const eventModel = getEventModel();

  return runWithAuthServerContext((contextSpec) =>
    eventModel.update(contextSpec, input, { authMode: "userPool" })
  ) as Promise<{
    data: Schema["Event"]["type"] | null;
    errors?: { message: string }[];
  }>;
}

export async function deleteEventInAmplify(id: string) {
  if (isE2ETestMode()) {
    return {
      data: (await deleteMockRecord(
        "Event",
        id
      )) as unknown as Schema["Event"]["type"] | null,
      errors: undefined,
    };
  }

  const eventModel = getEventModel();

  return runWithAuthServerContext((contextSpec) =>
    eventModel.delete(contextSpec, { id }, { authMode: "userPool" })
  ) as Promise<{
    data: Schema["Event"]["type"] | null;
    errors?: { message: string }[];
  }>;
}

export async function resolveProtectedStorageUrl(url?: string | null) {
  if (isE2ETestMode()) {
    return url ?? null;
  }

  const path = getAmplifyStoragePathFromUrl(url);

  if (!url || !path) {
    return url ?? null;
  }

  return runWithAuthServerContext(async (contextSpec) => {
    const result = await getUrl(contextSpec, {
      path,
      options: {
        validateObjectExistence: true,
      },
    });

    return result.url.toString();
  });
}

export async function deleteManagedStorageObjectByUrl(url?: string | null) {
  if (isE2ETestMode()) {
    return;
  }

  const path = getAmplifyStoragePathFromUrl(url);

  if (!url || !path) {
    return;
  }

  await runWithAuthServerContext(async (contextSpec) => {
    await remove(contextSpec, { path }).result;
  });
}

export async function createBookingInAmplify(
  input: Schema["Booking"]["createType"]
) {
  if (isE2ETestMode()) {
    return {
      data: (await createMockRecord(
        "Booking",
        input as Record<string, unknown>
      )) as unknown as Schema["Booking"]["type"] | null,
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Booking.create(contextSpec, input, { authMode: "userPool" })
  );
}

export async function updateBookingInAmplify(
  input: Schema["Booking"]["updateType"]
) {
  if (isE2ETestMode()) {
    return {
      data: (await updateMockRecord(
        "Booking",
        input as Record<string, unknown>
      )) as unknown as Schema["Booking"]["type"] | null,
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Booking.update(contextSpec, input, { authMode: "userPool" })
  );
}

export async function deleteBookingInAmplify(id: string) {
  if (isE2ETestMode()) {
    return {
      data: (await deleteMockRecord(
        "Booking",
        id
      )) as unknown as Schema["Booking"]["type"] | null,
      errors: undefined,
    };
  }

  return runWithAuthServerContext((contextSpec) =>
    client.models.Booking.delete(contextSpec, { id }, { authMode: "userPool" })
  );
}
