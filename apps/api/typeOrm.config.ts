import { DataSource, DataSourceOptions } from 'typeorm';
import { dbConfig } from './src/app.config';
import { Chain, NFT, Reward, TxnLog, User, Withdraw } from './src/db/entities';
import { Card } from './src/db/entities/card.entity';
import { InitDB1711457017552 } from './src/db/migrations/1711457017552-InitDB';
import { AddWithdraw1713510498409 } from './src/db/migrations/1713510498409-AddWithdraw';
import { AddAccumulateCol1713946311193 } from './src/db/migrations/1713946311193-AddAccumulateCol';
import { ChangeColType1713956599342 } from './src/db/migrations/1713956599342-ChangeColType';
import { AddRewardTable1714280599030 } from './src/db/migrations/1714280599030-AddRewardTable';
import { AddTxnLog1714282864962 } from './src/db/migrations/1714282864962-AddTxnLog';
import { AddTxnLogIndex1714282958682 } from './src/db/migrations/1714282958682-AddTxnLogIndex';
import { UpdateAccType1714284351110 } from './src/db/migrations/1714284351110-UpdateAccType';

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,
    entities: [Chain, NFT, User, Card, Withdraw, Reward, TxnLog],
    migrations: [
        InitDB1711457017552,
        AddWithdraw1713510498409,
        AddAccumulateCol1713946311193,
        ChangeColType1713956599342,
        AddRewardTable1714280599030,
        AddTxnLog1714282864962,
        AddTxnLogIndex1714282958682,
        UpdateAccType1714284351110,
    ],
};

export default new DataSource(dataSourceOptions);
