export type MockTheaterRecord = {
  id: string;
  sortOrder?: number | null;
  slug: string;
  name: string;
  city: string;
  state: string;
  district: string;
  established?: number | null;
  status: "active" | "inactive" | "seasonal";
  address: string;
  phone?: string | null;
  contactEmail?: string | null;
  manager?: string | null;
  notes?: string | null;
  heroImage?: string | null;
  descriptionParagraphs?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MockScreenRecord = {
  id: string;
  theaterId: string;
  name: string;
  slug: string;
  capacity: number;
  sortOrder: number;
  projection: string;
  soundFormat: string;
  features?: string[] | null;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type MockMovieRecord = {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  rating?: string | null;
  runtime?: string | null;
  genre?: string | null;
  status: "draft" | "comingSoon" | "nowPlaying" | "archived";
  director?: string | null;
  cast?: string[] | null;
  synopsis?: string | null;
  production?: string | null;
  score?: string | null;
  cinematography?: string | null;
  backdrop?: string | null;
  poster?: string | null;
  releaseDate?: string | null;
  audienceScore?: string | null;
  originalLanguage?: string | null;
  productionCompanies?: string[] | null;
  tmdbId?: number | null;
  trailerYouTubeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MockBookingShowtime = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  times: string[];
};

export type MockBookingException = {
  date: string;
  label: string;
};

export type MockBookingRecord = {
  id: string;
  slug: string;
  theaterId: string;
  movieId: string;
  screenId: string;
  screenName: string;
  status: "draft" | "archived" | "published";
  runStartsOn: string;
  runEndsOn: string;
  ticketPrice?: string | null;
  badge?: string | null;
  showtimes?: MockBookingShowtime[] | null;
  exceptions?: MockBookingException[] | null;
  note?: string | null;
  publishedAt?: string | null;
  expiresAtEpoch?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MockEventRecord = {
  id: string;
  slug: string;
  theaterId: string;
  title: string;
  summary: string;
  description?: string | null;
  image?: string | null;
  status: "draft" | "archived" | "published";
  startsAt: string;
  endsAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MockVenueItemVariation = {
  id: string;
  name: string;
  description?: string | null;
  priceDelta?: number | null;
  sortOrder: number;
};

export type MockVenueItemRecord = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  itemType: "concession" | "meal" | "alcohol" | "combo" | "merch";
  category: string;
  basePrice: number;
  isActive: boolean;
  trackInventory: boolean;
  sku: string;
  fulfillmentType: "counter" | "kitchen" | "bar";
  prepRequired: boolean;
  ageRestricted: boolean;
  taxableCategory: string;
  variations?: MockVenueItemVariation[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MockVenueItemAvailabilityRecord = {
  id: string;
  theaterId: string;
  itemId: string;
  isAvailable: boolean;
  priceOverride?: number | null;
  currentStock?: number | null;
  lowStockThreshold?: number | null;
  createdAt?: string;
  updatedAt?: string;
};
