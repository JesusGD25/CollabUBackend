import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * DataSource para la CLI de TypeORM (migration:generate/run/revert) — separado del
 * `databaseConfig()` que usa Nest en runtime, porque la CLI no pasa por el ciclo de vida
 * de NestJS. `synchronize` se deja siempre en `false` aquí: las migraciones son la única
 * vía para cambiar el schema a través de esta DataSource.
 */
export const AnalyticsDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5435', 10),
  username: process.env.DATABASE_USER || 'collabu_admin',
  password: process.env.DATABASE_PASSWORD || 'collabu_secret_2025',
  database: process.env.DATABASE_NAME || 'analytics_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AnalyticsDataSource;
