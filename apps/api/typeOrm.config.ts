import { DataSource, DataSourceOptions } from 'typeorm';
import { dbConfig } from './src/app.config';
import { Chain, NFT, User } from './src/db/entities';
import { Card } from './src/db/entities/card.entity';
import { InitDB1711457017552 } from './src/db/migrations/1711457017552-InitDB';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  ssl: dbConfig.ssl,
  entities: [Chain, NFT, User, Card],
  migrations: [InitDB1711457017552],
};

export default new DataSource(dataSourceOptions);
