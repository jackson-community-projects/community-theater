import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  TheaterStatus: a.enum(['active', 'inactive', 'seasonal']),
  ScreenStatus: a.enum(['active', 'inactive']),
  MovieStatus: a.enum(['draft', 'comingSoon', 'nowPlaying', 'archived']),
  BookingStatus: a.enum(['draft', 'published', 'archived']),
  EventStatus: a.enum(['draft', 'published', 'archived']),
  VenueItemType: a.enum(['concession', 'meal', 'alcohol', 'combo', 'merch']),
  FulfillmentType: a.enum(['counter', 'kitchen', 'bar']),
  BookingDay: a.enum([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]),

  BookingShowtime: a.customType({
    day: a.ref('BookingDay').required(),
    times: a.string().array().required(),
  }),

  BookingException: a.customType({
    date: a.date().required(),
    label: a.string().required(),
  }),

  VenueItemVariation: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    description: a.string(),
    priceDelta: a.float(),
    sortOrder: a.integer().required(),
  }),

  Theater: a
    .model({
      sortOrder: a.integer(),
      slug: a.string().required(),
      name: a.string().required(),
      city: a.string().required(),
      state: a.string().required(),
      district: a.string().required(),
      established: a.integer(),
      status: a.ref('TheaterStatus').required(),
      address: a.string().required(),
      phone: a.phone(),
      contactEmail: a.email(),
      manager: a.string(),
      notes: a.string().authorization((allow) => [allow.group('ADMINS')]),
      heroImage: a.url(),
      descriptionParagraphs: a.string().array(),
      screens: a.hasMany('Screen', 'theaterId'),
      bookings: a.hasMany('Booking', 'theaterId'),
      events: a.hasMany('Event', 'theaterId'),
      venueItemAvailability: a.hasMany('VenueItemAvailability', 'theaterId'),
    })
    .secondaryIndexes((index) => [
      index('slug').queryField('listTheatersBySlug'),
      index('status').sortKeys(['city']).queryField('listTheatersByStatus'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read', 'create']),
    ]),

  Screen: a
    .model({
      theaterId: a.id().required(),
      name: a.string().required(),
      slug: a.string().required(),
      capacity: a.integer().required(),
      sortOrder: a.integer().required(),
      projection: a.string().required(),
      soundFormat: a.string().required(),
      features: a.string().array().required(),
      status: a.ref('ScreenStatus').required(),
      theater: a.belongsTo('Theater', 'theaterId'),
    })
    .secondaryIndexes((index) => [
      index('theaterId').sortKeys(['sortOrder']).queryField('listScreensByTheater'),
      index('slug').queryField('listScreensBySlug'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read']),
    ]),

  Movie: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      tagline: a.string(),
      rating: a.string(),
      runtime: a.string(),
      genre: a.string(),
      status: a.ref('MovieStatus').required(),
      director: a.string(),
      cast: a.string().array(),
      synopsis: a.string(),
      production: a.string(),
      score: a.string(),
      cinematography: a.string(),
      backdrop: a.url(),
      poster: a.url(),
      releaseDate: a.date(),
      audienceScore: a.string(),
      originalLanguage: a.string(),
      productionCompanies: a.string().array(),
      tmdbId: a.integer(),
      trailerYouTubeId: a.string(),
      bookings: a.hasMany('Booking', 'movieId'),
    })
    .secondaryIndexes((index) => [
      index('slug').queryField('listMoviesBySlug'),
      index('status').sortKeys(['releaseDate']).queryField('listMoviesByStatus'),
      index('tmdbId').queryField('listMoviesByTmdbId'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read']),
    ]),

  Booking: a
    .model({
      slug: a.string().required(),
      theaterId: a.id().required(),
      movieId: a.id().required(),
      screenId: a.string().required(),
      screenName: a.string().required(),
      status: a.ref('BookingStatus').required(),
      runStartsOn: a.date().required(),
      runEndsOn: a.date().required(),
      ticketPrice: a.string(),
      badge: a.string(),
      showtimes: a.ref('BookingShowtime').array().required(),
      exceptions: a.ref('BookingException').array(),
      note: a.string().authorization((allow) => [allow.group('ADMINS')]),
      publishedAt: a
        .datetime()
        .authorization((allow) => [allow.group('ADMINS')]),
      expiresAtEpoch: a
        .integer()
        .authorization((allow) => [allow.group('ADMINS')]),
      theater: a.belongsTo('Theater', 'theaterId'),
      movie: a.belongsTo('Movie', 'movieId'),
    })
    .secondaryIndexes((index) => [
      index('slug').queryField('listBookingsBySlug'),
      index('theaterId')
        .sortKeys(['runStartsOn'])
        .queryField('listBookingsByTheater'),
      index('movieId').sortKeys(['runStartsOn']).queryField('listBookingsByMovie'),
      index('status').sortKeys(['runStartsOn']).queryField('listBookingsByStatus'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      // Native public reads keep the public site simple; the UI should filter to
      // published records until a dedicated public projection is added.
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read']),
    ]),

  Event: a
    .model({
      slug: a.string().required(),
      theaterId: a.id().required(),
      title: a.string().required(),
      summary: a.string().required(),
      description: a.string(),
      image: a.url(),
      status: a.ref('EventStatus').required(),
      startsAt: a.datetime().required(),
      endsAt: a.datetime().required(),
      theater: a.belongsTo('Theater', 'theaterId'),
    })
    .secondaryIndexes((index) => [
      index('slug').queryField('listEventsBySlug'),
      index('theaterId').sortKeys(['startsAt']).queryField('listEventsByTheater'),
      index('status').sortKeys(['startsAt']).queryField('listEventsByStatus'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read']),
    ]),

  VenueItem: a
    .model({
      name: a.string().required(),
      description: a.string(),
      image: a.url(),
      itemType: a.ref('VenueItemType').required(),
      category: a.string().required(),
      basePrice: a.float().required(),
      isActive: a.boolean().required(),
      trackInventory: a.boolean().required(),
      sku: a.string().required(),
      fulfillmentType: a.ref('FulfillmentType').required(),
      prepRequired: a.boolean().required(),
      ageRestricted: a.boolean().required(),
      taxableCategory: a.string().required(),
      variations: a.ref('VenueItemVariation').array(),
      availability: a.hasMany('VenueItemAvailability', 'itemId'),
    })
    .secondaryIndexes((index) => [
      index('sku').queryField('listVenueItemsBySku'),
      index('itemType').sortKeys(['category']).queryField('listVenueItemsByType'),
      index('category').sortKeys(['name']).queryField('listVenueItemsByCategory'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read', 'create', 'update', 'delete']),
    ]),

  VenueItemAvailability: a
    .model({
      theaterId: a.id().required(),
      itemId: a.id().required(),
      isAvailable: a.boolean().required(),
      priceOverride: a.float(),
      currentStock: a.integer(),
      lowStockThreshold: a.integer(),
      theater: a.belongsTo('Theater', 'theaterId'),
      item: a.belongsTo('VenueItem', 'itemId'),
    })
    .secondaryIndexes((index) => [
      index('theaterId').queryField('listVenueItemAvailabilityByTheater'),
      index('itemId').queryField('listVenueItemAvailabilityByItem'),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.guest().to(['read']),
      allow.publicApiKey().to(['read', 'create', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      description: `Public read access for the ${process.env.NEXT_PUBLIC_APP_NAME || "Community Theater"} website`,
      expiresInDays: 30,
    },
  },
});
