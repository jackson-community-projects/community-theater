export type TheaterStatus = "active" | "inactive" | "seasonal";
export type ScreenStatus = "active" | "inactive";
export type BookingStatus = "draft" | "published" | "archived";
export type BookingDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface Movie {
  slug: string;
  title: string;
  tagline: string;
  rating: string;
  runtime: string;
  genre: string;
  status: "now-playing" | "coming-soon";
  director: string;
  cast: string[];
  synopsis: string;
  production: string;
  score: string;
  cinematography: string;
  backdrop: string;
  poster: string;
  releaseDate?: string;
  audienceScore?: string;
  originalLanguage?: string;
  productionCompanies?: string[];
  tmdbId?: number;
  trailerYouTubeId?: string;
}

export interface BookingShowtime {
  day: BookingDay;
  times: string[];
}

export interface BookingTimeSlot {
  day: BookingDay;
  dayShort: string;
  time: string;
}

export interface BookingException {
  date: string;
  label: string;
}

export interface Booking {
  id: string;
  slug: string;
  theaterId: string;
  screenId: string;
  movieSlug: string;
  status: BookingStatus;
  runStartsOn: string;
  runEndsOn: string;
  ticketPrice: string;
  badge: string | null;
  showtimes: BookingShowtime[];
  exceptions: BookingException[];
  note: string;
}

export interface TheaterSpec {
  label: string;
  value: string;
}

export interface ConcessionItem {
  name: string;
  price: string;
  note: string;
  image: string;
}

export interface Theater {
  id: string;
  sortOrder: number;
  slug: string;
  name: string;
  city: string;
  state: string;
  district: string;
  established: number;
  status: TheaterStatus;
  address: string;
  phone: string;
  contactEmail: string;
  manager: string;
  notes: string;
  heroImage: string;
  descriptionParagraphs: string[];
  specs: TheaterSpec[];
  concessions: ConcessionItem[];
}

export interface Screen {
  id: string;
  theaterId: string;
  name: string;
  slug: string;
  capacity: number;
  sortOrder: number;
  projection: string;
  soundFormat: string;
  features: string[];
  status: ScreenStatus;
}

export interface Event {
  id: string;
  slug: string;
  theaterId: string;
  theaterName: string;
  theaterSlug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  startsAt: string;
  endsAt: string;
  startsAtLabel: string;
  endsAtLabel: string;
  status: "draft" | "published" | "archived";
}

export interface MembershipProgram {
  id: string;
  name: string;
  blurb: string;
  benefits: string[];
  ctaLabel: string;
  ctaHref: string;
}

/** Joined shape used by the showtimes UI */
export interface TheaterWithBookings {
  id: string;
  name: string;
  district: string;
  bookings: {
    bookingId: string;
    slug: string;
    screenName: string;
    runStartsOn: string;
    runEndsOn: string;
    title: string;
    rating: string;
    runtime: string;
    synopsis: string;
    poster: string;
    badge: string | null;
    times: BookingTimeSlot[];
    price: string;
  }[];
}

export interface MovieShowtime {
  bookingId: string;
  theaterId: string;
  theaterSlug: string;
  theaterName: string;
  screenId: string;
  screenName: string;
  runStartsOn: string;
  runEndsOn: string;
  status: BookingStatus;
  badge: string | null;
  times: BookingTimeSlot[];
  price: string;
}

/** Joined shape used by a theater detail page */
export interface TheaterWithShowtimes extends Theater {
  currentBookings: {
    bookingId: string;
    slug: string;
    screenName: string;
    runStartsOn: string;
    runEndsOn: string;
    title: string;
    rating: string;
    runtime: string;
    synopsis: string;
    poster: string;
    badge: string | null;
    times: BookingTimeSlot[];
    price: string;
    isNew: boolean;
  }[];
}
