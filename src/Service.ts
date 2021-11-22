// import { _ } from '@feathersjs/commons';
import { NotFound } from '@feathersjs/errors';
import { select, AdapterService } from '@feathersjs/adapter-commons';
import { Database, Entity, Query } from '@deepkit/orm';
import { plainToClass, classToPlain, ClassSchema } from '@deepkit/type';
import { Id, NullableId, Params } from '@feathersjs/feathers';
import { ServiceDeepkitOrmOptions } from '.';
import { ClassType } from '@deepkit/core';

export class Service extends AdapterService {
  options: ServiceDeepkitOrmOptions;
  constructor (options: ServiceDeepkitOrmOptions) {
    super(options);
    this.options = options;
  }

  get Model (): ClassType<Entity> | ClassSchema<Entity> {
    if (!this.options.Model) {
      throw new Error('The Model getter was called with no Model provided in options!');
    }

    return this.options.Model;
  }

  get database (): Database {
    if (!this.options.database) {
      throw new Error('The database getter was called with no database in options!')
    }

    return this.options.database;
  }

  filterQuery (params = {}) {
    const filtered = super.filterQuery(params);
    return filtered
  }

  chainedModel (
    id: Id | null,
    params: Params = {}
  ): { model: Query<Entity>, filters: any, paginate: any } {
    const { filters, query: _query, paginate } = this.filterQuery(params);
    let model = this.database.query(this.Model);

    if (filters.$skip) {
      model = model.skip(filters.$skip);
    }

    /* if (filters.$sort) {
      for (const sort in filters.$sort) {
        const order = (filters.$sort[sort] === -1) ? "desc" : "asc";
        model = model.orderBy(sort, order);
      }
    }*/

    if (filters.$select) {
      const select: string[] = [...filters.$select];
      if (!select.includes(this.id)) {
        select.push(this.id);
      }
      // @ts-ignore
      model = model.select(...select);
    }

    if (id === null) {
      if ('$limit' in filters) {
        model = model.limit(filters.$limit);
      }

      model = model.filter(_query);
    } else {
      const query = Object.assign({}, _query, { [this.id]: id });

      model = model.filter(query);
    }

    return {
      model,
      filters,
      paginate
    }
  }

  async _getOrFind (
    id: Id | null,
    params: Params = {}
  ) {

    const { model, filters, paginate } = this.chainedModel(id, params);

    if (id === null) {

      // @ts-ignore
      if (paginate && paginate.default) {
        const [
          items,
          count
        ] = await Promise.all([model.find(), model.count()]);

        return {
          total: count,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: items
        };
      } else {
        const items = await model.find();

        return items;
      }
    } else {
      const item = await model.findOneOrUndefined();
      if (!item) {
        throw new NotFound(`No record found for id '${id}'`);
      }

      return item;
    }
  }

  async _find (
    params: Params = {}
  ) {
    return await this._getOrFind(null, params);
  }

  async _get (
    id: Id,
    params: Params = {}
  ) {
    return await this._getOrFind(id, params);
  }

  itemsAndIsArray (data) {
    if (!Array.isArray(data)) {
      return {
        items: [data],
        isArray: false
      }
    } else {
      return {
        items: data,
        isArray: true
      }
    }
  }

  async _create (
    data,
    params: Params = {}
  ) {
    const { items, isArray } = this.itemsAndIsArray(data);
    const instances = items.map(item => plainToClass(this.Model, item));
    await this.database.persist(...instances);

    const createdItems = instances.map(instance => classToPlain(this.Model, instance));

    const sel = select(params, this.id);

    return (isArray) ? createdItems.map(sel) : sel(createdItems[0]);
  }

  async _patch (
    id: NullableId,
    data,
    params: Params = {}
  ) {
    const idQuery = Object.assign({}, params.query, { $select: [this.id] });
    const idParams = Object.assign({}, params, { query: idQuery });

    const ids = await this
      ._getOrFind(id, Object.assign({ paginate: false }, idParams))
      .then(result => {
        return (Array.isArray(result)) ? result : [result]
      });

    const findQuery = Object.assign(
      { [this.id]: { $in: ids } },
      this.filterQuery(params).filters
    );

    const findParams = Object.assign({}, params, { query: findQuery });

    const { model } = this.chainedModel(id, findParams);

    if (id === null) {
      // @ts-ignore
      result = await model.patchMany(data);
    } else {
      // @ts-ignore
      result = await model.patchOne(data);
    }

    return await this._getOrFind(id, Object.assign({ paginate: false }, params));
  }

  async _update (id, data, params = {}) {}

  async _remove (
    id: NullableId,
    params: Params = {}
  ) {
    const data = await this._getOrFind(id, Object.assign({ paginate: false }, params));
    const { items, isArray } = this.itemsAndIsArray(data);

    const ids = items.map(item => item[this.id]);

    const model = this.database.query(this.Model).filter({ [this.id]: { $in: ids }});

    if (isArray) {
      await model.deleteMany();
      return items;
    } else {
      await model.deleteOne();
      return items[0];
    }
  }
}
