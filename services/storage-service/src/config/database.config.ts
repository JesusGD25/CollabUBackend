import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5435', 10),
  username: process.env.DATABASE_USER || 'collabu_admin',
  password: process.env.DATABASE_PASSWORD || 'collabu_secret_2025',
  database: process.env.DATABASE_NAME || 'storage_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});
