import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { compareRoom } from '../functions/compare-room/resource';

const schema = a
  .schema({
    Phase: a.enum(['MOVE_IN', 'MOVE_OUT']),
    ComparisonStatus: a.enum(['NOT_STARTED', 'PROCESSING', 'DONE', 'FAILED']),

    // A rented home the tenant is documenting.
    Property: a
      .model({
        name: a.string().required(),
        address: a.string(),
        ownerName: a.string(),
        moveInDate: a.date(),
        moveOutDate: a.date(),
        rooms: a.hasMany('Room', 'propertyId'),
      })
      .authorization((allow) => [allow.owner()]),

    Room: a
      .model({
        propertyId: a.id().required(),
        property: a.belongsTo('Property', 'propertyId'),
        name: a.string().required(),
        photos: a.hasMany('Photo', 'roomId'),
        comparisonStatus: a.ref('ComparisonStatus'),
        comparison: a.json(),
        comparedAt: a.datetime(),
        comparisonError: a.string(),
      })
      .authorization((allow) => [allow.owner()]),

    // One evidence photo. `sha256` is the fingerprint taken at upload time;
    // the compare function re-hashes the stored file to prove it is unchanged.
    Photo: a
      .model({
        roomId: a.id().required(),
        room: a.belongsTo('Room', 'roomId'),
        phase: a.ref('Phase').required(),
        path: a.string().required(),
        sha256: a.string().required(),
        capturedAt: a.datetime().required(),
        note: a.string(),
      })
      .secondaryIndexes((index) => [index('roomId')])
      .authorization((allow) => [allow.owner()]),

    // Starts the AI before/after comparison in the background. The function
    // writes its result back onto the Room, which the app polls.
    compareRoom: a
      .mutation()
      .arguments({ roomId: a.id().required() })
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(compareRoom).async()),
  })
  .authorization((allow) => [allow.resource(compareRoom)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
