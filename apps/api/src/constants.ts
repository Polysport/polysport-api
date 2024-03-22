import { appConfig } from './app.config';
const sample = require('lodash/sample');

export const INDEXER_QUEUE_NAME = 'POLYSPORT_INDEXER_QUEUE';
export const INDEXER_PROCESS_NAME = 'POLYSPORT_INDEXER_PROCESS';

export const randomRPC = (): string => sample(appConfig.rpc.split(','));

export const DEFAULT_BLOCK_NUMBER = 47320848;
export const CHUNK_BLOCK_NUMBER = 1000;
