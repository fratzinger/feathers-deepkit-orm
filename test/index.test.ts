/* eslint-disable no-unused-expressions */
import 'reflect-metadata';
import assert from 'assert';

import errors from '@feathersjs/errors';
import feathers from '@feathersjs/feathers';
import adaptertests from '@feathersjs/adapter-tests';
import { t } from '@deepkit/type'
import { Database } from '@deepkit/orm'
import { SQLiteDatabaseAdapter } from '@deepkit/sqlite';

import service from '../src';
const testSuite = adaptertests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query',
  '.patch + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id',
  '.get + id + query id'
]);

const People = t.schema({
  id: t.number.primary.autoIncrement,
  name: t.string,
  age: t.number,
  created: t.date.default(() => new Date()),
  time: t.bigint.optional,
  status: t.string.optional,
  order: t.backReference()
}, { name: 'people' });

const Order = t.schema({
  id: t.number.primary.autoIncrement,
  name: t.string,
  people: t.type(() => People).reference()
}, { name: 'orders' })

const CustomId = t.schema({
  customid: t.number.primary.autoIncrement,
  name: t.string,
  age: t.number,
  created: t.date.default(() => new Date()),
  time: t.bigint
}, { name: 'customid' })

const database = new Database(new SQLiteDatabaseAdapter(':memory:'), [People, Order, CustomId]);

describe('Feathers Service', () => {
  before(async () => {
    await database.migrate();
  });

  describe('Common Tests', () => {
    const app = feathers()
      .use('/people', service({
        Model: People,
        database,
        id: 'id',
        events: ['testing']
      }))
      .use('/people-customid', service({
        Model: CustomId,
        database,
        id: 'customid',
        events: ['testing']
      }));

    it('has .Model', () => {
      assert.ok(app.service('people').Model);
    });

    testSuite(app, errors, 'people', 'id');
    testSuite(app, errors, 'people-customid', 'customid');
  });
});
