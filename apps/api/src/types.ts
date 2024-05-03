export type STARKNET_EVENT = {
    block_hash: string;
    block_number: number;
    transaction_hash: string;
    from_address: string;
    keys: string[];
    data: string[];
};

export enum ERewardStatus {
    processing = 'processing',
    setting = 'setting',
    success = 'success',
    failed = 'failed',
}
