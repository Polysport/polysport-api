import { DataSource, DataSourceOptions } from 'typeorm';
import { dbConfig } from './src/app.config';
import { Chain, NFT } from './src/db/entities';
import { InitDB1711057239275 } from './src/db/migrations/1711057239275-InitDB';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  ssl: dbConfig.ssl,
  entities: [Chain, NFT],
  migrations: [InitDB1711057239275],
};

export default new DataSource(dataSourceOptions);
