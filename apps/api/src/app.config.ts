import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const appConfig = {
  port: configService.get('PORT') ?? 3000,
  rpc: configService.get('RPC'),
  mainnet: configService.get('IS_MAINNET') === 'true',

  operatorPrivKey: configService.get('OPERATOR_PRIV_KEY'),
  s3Endpoint: configService.get('S3_ENDPOINT'),
  s3Bucket: configService.get('S3_BUCKET'),
  s3AccessKeyId: configService.get('S3_ACCESS_KEY_ID'),
  s3SecretAccessKey: configService.get('S3_SECRET_ACCESS_KEY'),
  ipfsBaseUrl: configService.get('IFPS_BASE_URL'),
  nftAddress: configService.get('NFT_ADDRESS'),
  tokenAddress: configService.get('TOKEN_ADDRESS'),
};

export const dbConfig = {
  type: 'postgres',
  host: configService.get('POSTGRES_HOST'),
  port: parseInt(configService.get('POSTGRES_PORT') ?? '', 10),
  username: configService.get('POSTGRES_USER'),
  password: configService.get('POSTGRES_PASSWORD'),
  database: configService.get('POSTGRES_DB'),
  ssl:
    configService.get('POSTGRES_SSL').toLowerCase() === 'true' ? true : false,
};
