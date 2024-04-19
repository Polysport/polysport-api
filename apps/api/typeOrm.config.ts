import { DataSource, DataSourceOptions } from 'typeorm';
import { dbConfig } from './src/app.config';
import { Chain, NFT, User, Withdraw } from './src/db/entities';
import { Card } from './src/db/entities/card.entity';
import { InitDB1711457017552 } from './src/db/migrations/1711457017552-InitDB';
import { AddWithdraw1713510498409 } from './src/db/migrations/1713510498409-AddWithdraw';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  ssl: dbConfig.ssl,
  entities: [Chain, NFT, User, Card, Withdraw],
  migrations: [InitDB1711457017552, AddWithdraw1713510498409],
};

export default new DataSource(dataSourceOptions);
