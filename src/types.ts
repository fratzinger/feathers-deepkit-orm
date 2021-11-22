import { AbstractClassType, ClassType } from '@deepkit/core';
import { Database, Entity } from '@deepkit/orm';
import { ClassSchema } from '@deepkit/type';
import { ServiceOptions } from '@feathersjs/adapter-commons';

export interface ServiceDeepkitOrmOptions extends ServiceOptions {
  database: Database
  Model: ClassType<Entity> | ClassSchema<Entity>
}
