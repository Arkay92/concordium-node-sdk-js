import { AccountAddress } from './types/accountAddress';
import { GtuAmount } from './types/gtuAmount';
import { TransactionExpiry } from './types/transactionExpiry';

/**
 * A reward fraction with a resolution of 1/100000, i.e. the
 * denominator is implicitly 100000, and the interface therefore
 * only contains the numerator value which can be in the interval
 * [1, 100000].
 */
export type RewardFraction = number;

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Versioned<T> {
    v: number;
    value: T;
}

export enum AttributesKeys {
    firstName,
    lastName,
    sex,
    dob,
    countryOfResidence,
    nationality,
    idDocType,
    idDocNo,
    idDocIssuer,
    idDocIssuedAt,
    idDocExpiresAt,
    nationalIdNo,
    taxIdNo,
}
export type Attributes = {
    [P in keyof typeof AttributesKeys]: string;
};
export type AttributeKey = keyof Attributes;

export enum TransactionStatusEnum {
    Received = 'received',
    Finalized = 'finalized',
    Committed = 'committed',
}

export interface AddressAccount {
    type: 'AddressAccount';
    address: string;
}

export interface TransactionEvent {
    tag:
        | 'ModuleDeployed'
        | 'ContractInitialized'
        | 'AccountCreated'
        | 'CredentialDeployed'
        | 'BakerAdded'
        | 'BakerRemoved'
        | 'BakerStakeIncreased'
        | 'BakerStakeDecreased'
        | 'BakerSetRestakeEarnings'
        | 'BakerKeysUpdated'
        | 'CredentialKeysUpdated'
        | 'NewEncryptedAmount'
        | 'EncryptedAmountsRemoved'
        | 'AmountAddedByDecryption'
        | 'EncryptedSelfAmountAdded'
        | 'UpdateEnqueued'
        | 'TransferredWithSchedule'
        | 'CredentialsUpdated'
        | 'DataRegistered';
}

export interface ContractAddress {
    index: bigint;
    subindex: bigint;
}

export interface UpdatedEvent {
    tag: 'Updated';
    address: ContractAddress;
    instigator: AddressAccount;
    amount: bigint;
    message: string;
    receiveName: string;
    events: [string];
}

export interface TransferredEvent {
    tag: 'Transferred';
    amount: bigint;
    to: AddressAccount;
    from: AddressAccount;
}

/**
 * An enum containing all the possible reject reasons that can be
 * received from a node as a response to a transaction submission.
 *
 * This should be kept in sync with the list of reject reasons
 * found here: https://github.com/Concordium/concordium-base/blob/main/haskell-src/Concordium/Types/Execution.hs
 */
export enum RejectReasonTag {
    ModuleNotWF = 'ModuleNotWF',
    ModuleHashAlreadyExists = 'ModuleHashAlreadyExists',
    InvalidAccountReference = 'InvalidAccountReference',
    InvalidInitMethod = 'InvalidInitMethod',
    InvalidReceiveMethod = 'InvalidReceiveMethod',
    InvalidModuleReference = 'InvalidModuleReference',
    InvalidContractAddress = 'InvalidContractAddress',
    RuntimeFailure = 'RuntimeFailure',
    AmountTooLarge = 'AmountTooLarge',
    SerializationFailure = 'SerializationFailure',
    OutOfEnergy = 'OutOfEnergy',
    RejectedInit = 'RejectedInit',
    RejectedReceive = 'RejectedReceive',
    NonExistentRewardAccount = 'NonExistentRewardAccount',
    InvalidProof = 'InvalidProof',
    AlreadyABaker = 'AlreadyABaker',
    NotABaker = 'NotABaker',
    InsufficientBalanceForBakerStake = 'InsufficientBalanceForBakerStake',
    StakeUnderMinimumThresholdForBaking = 'StakeUnderMinimumThresholdForBaking',
    BakerInCooldown = 'BakerInCooldown',
    DuplicateAggregationKey = 'DuplicateAggregationKey',
    NonExistentCredentialID = 'NonExistentCredentialID',
    KeyIndexAlreadyInUse = 'KeyIndexAlreadyInUse',
    InvalidAccountThreshold = 'InvalidAccountThreshold',
    InvalidCredentialKeySignThreshold = 'InvalidCredentialKeySignThreshold',
    InvalidEncryptedAmountTransferProof = 'InvalidEncryptedAmountTransferProof',
    InvalidTransferToPublicProof = 'InvalidTransferToPublicProof',
    EncryptedAmountSelfTransfer = 'EncryptedAmountSelfTransfer',
    InvalidIndexOnEncryptedTransfer = 'InvalidIndexOnEncryptedTransfer',
    ZeroScheduledAmount = 'ZeroScheduledAmount',
    NonIncreasingSchedule = 'NonIncreasingSchedule',
    FirstScheduledReleaseExpired = 'FirstScheduledReleaseExpired',
    ScheduledSelfTransfer = 'ScheduledSelfTransfer',
    InvalidCredentials = 'InvalidCredentials',
    DuplicateCredIDs = 'DuplicateCredIDs',
    NonExistentCredIDs = 'NonExistentCredIDs',
    RemoveFirstCredential = 'RemoveFirstCredential',
    CredentialHolderDidNotSign = 'CredentialHolderDidNotSign',
    NotAllowedMultipleCredentials = 'NotAllowedMultipleCredentials',
    NotAllowedToReceiveEncrypted = 'NotAllowedToReceiveEncrypted',
    NotAllowedToHandleEncrypted = 'NotAllowedToHandleEncrypted',
}

export interface RejectReason {
    tag: RejectReasonTag;
    // TODO: Figure out the type of contents.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contents: any;
}

export interface EventResult {
    outcome: string;
    // TODO Resolve the types completely.
    events: (TransactionEvent | TransferredEvent | UpdatedEvent)[];
    rejectReason?: RejectReason;
}

interface TransactionSummaryType {
    type:
        | 'accountTransaction'
        | 'credentialDeploymentTransaction'
        | 'updateTransaction';
    // TODO: Figure out if contents is always just a string.
    contents: string;
}

export interface TransactionSummary {
    sender?: string;
    hash: string;

    cost: bigint;
    energyCost: bigint;
    index: bigint;

    type: TransactionSummaryType;

    result: EventResult;
}

export interface TransactionStatus {
    status: TransactionStatusEnum;
    outcomes?: Record<string, TransactionSummary>;
}

export interface PartyInfo {
    bakerId: bigint;
    weight: bigint;
    signed: boolean;
}

export interface FinalizationData {
    finalizationIndex: bigint;
    finalizationDelay: bigint;
    finalizationBlockPointer: string;
    finalizers: PartyInfo[];
}

export interface ExchangeRate {
    numerator: bigint;
    denominator: bigint;
}

export interface TransactionFeeDistribution {
    baker: RewardFraction;
    gasAccount: RewardFraction;
}

export interface MintDistribution {
    mintPerSlot: number;
    bakingReward: RewardFraction;
    finalizationReward: RewardFraction;
}

export interface GasRewards {
    baker: RewardFraction;
    finalizationProof: RewardFraction;
    accountCreation: RewardFraction;
    chainUpdate: RewardFraction;
}

export interface RewardParameters {
    transactionFeeDistribution: TransactionFeeDistribution;
    mintDistribution: MintDistribution;
    gASRewards: GasRewards;
}

export interface ChainParameters {
    electionDifficulty: number;
    euroPerEnergy: ExchangeRate;
    microGTUPerEuro: ExchangeRate;
    accountCreationLimit: number;
    bakerCooldownEpochs: bigint;
    minimumThresholdForBaking: bigint;
    rewardParameters: RewardParameters;
    foundationAccountIndex: bigint;
}

export interface Authorization {
    threshold: number;
    authorizedKeys: number[];
}

export interface Authorizations {
    emergency: Authorization;
    microGTUPerEuro: Authorization;
    euroPerEnergy: Authorization;
    transactionFeeDistribution: Authorization;
    foundationAccount: Authorization;
    mintDistribution: Authorization;
    protocol: Authorization;
    paramGASRewards: Authorization;
    bakerStakeThreshold: Authorization;
    electionDifficulty: Authorization;
    addAnonymityRevoker: Authorization;
    addIdentityProvider: Authorization;
    keys: VerifyKey[];
}

export interface KeysWithThreshold {
    keys: VerifyKey[];
    threshold: number;
}

export interface Keys {
    rootKeys: KeysWithThreshold;
    level1Keys: KeysWithThreshold;
    level2Keys: Authorizations;
}

export interface UpdateQueueQueue {
    effectiveTime: Date;
    // TODO Update the type of update to a generic update transaction when
    // update types have been added.
    // Information about the actual update.
    update: unknown;
}

export interface UpdateQueue {
    nextSequenceNumber: bigint;
    queue: UpdateQueueQueue;
}

interface UpdateQueues {
    microGTUPerEuro: UpdateQueue;
    euroPerEnergy: UpdateQueue;
    transactionFeeDistribution: UpdateQueue;
    foundationAccount: UpdateQueue;
    electionDifficulty: UpdateQueue;
    mintDistribution: UpdateQueue;
    protocol: UpdateQueue;
    gasRewards: UpdateQueue;
    bakerStakeThreshold: UpdateQueue;
    addAnonymityRevoker: UpdateQueue;
    addIdentityProvider: UpdateQueue;
    rootKeys: UpdateQueue;
    level1Keys: UpdateQueue;
    level2Keys: UpdateQueue;
}

export interface Updates {
    chainParameters: ChainParameters;
    keys: Keys;
    updateQueues: UpdateQueues;
}

export interface BlockSummary {
    finalizationData: FinalizationData;
    transactionSummaries: TransactionSummary[];
    updates: Updates;
}

export interface BlockInfo {
    blockParent: string;
    blockHash: string;
    blockStateHash: string;
    blockLastFinalized: string;

    blockHeight: bigint;
    blockBaker: bigint;
    blockSlot: bigint;

    blockArriveTime: Date;
    blockReceiveTime: Date;
    blockSlotTime: Date;

    finalized: boolean;

    transactionCount: bigint;
    transactionsSize: bigint;
    transactionEnergyCost: bigint;
}

export interface ConsensusStatus {
    bestBlock: string;
    genesisBlock: string;
    lastFinalizedBlock: string;

    epochDuration: bigint;
    slotDuration: bigint;
    bestBlockHeight: bigint;
    lastFinalizedBlockHeight: bigint;

    finalizationCount: bigint;
    blocksVerifiedCount: bigint;
    blocksReceivedCount: bigint;

    blockArriveLatencyEMA: number;
    blockArriveLatencyEMSD: number;

    blockReceiveLatencyEMA: number;
    blockReceiveLatencyEMSD: number;

    transactionsPerBlockEMA: number;
    transactionsPerBlockEMSD: number;

    blockReceivePeriodEMA?: number;
    blockReceivePeriodEMSD?: number;

    blockArrivePeriodEMA?: number;
    blockArrivePeriodEMSD?: number;

    finalizationPeriodEMA?: number;
    finalizationPeriodEMSD?: number;

    genesisTime: Date;
    blockLastReceivedTime?: Date;
    blockLastArrivedTime?: Date;
    lastFinalizedTime?: Date;
}

export interface NextAccountNonce {
    nonce: bigint;
    allFinal: boolean;
}

export interface ReleaseSchedule {
    timestamp: Date;
    amount: bigint;
    transactions: any;
}

export interface AccountReleaseSchedule {
    total: bigint;
    schedule: ReleaseSchedule[];
}

export interface AccountEncryptedAmount {
    selfAmount: EncryptedAmount;
    startIndex: bigint;
    incomingAmounts: EncryptedAmount[];
    numAggregated: number;
}

export interface VerifyKey {
    schemeId: string;
    verifyKey: string;
}

export interface CredentialPublicKeys {
    keys: Record<number, VerifyKey>;
    threshold: number;
}

export interface ChainArData {
    encIdCredPubShare: string;
}

export interface Policy {
    validTo: string; // "YYYYMM"
    createdAt: string; // "YYYYMM"
    revealedAttributes: Record<AttributeKey, string>;
}

interface SharedCredentialDeploymentValues {
    ipIdentity: number;
    credentialPublicKeys: CredentialPublicKeys;
    policy: Policy;
}

export interface CredentialDeploymentValues
    extends SharedCredentialDeploymentValues {
    credId: string;
    revocationThreshold: number;
    arData: Record<string, ChainArData>;
    commitments: CredentialDeploymentCommitments;
}

export interface InitialCredentialDeploymentValues
    extends SharedCredentialDeploymentValues {
    regId: string;
}

export interface CredentialDeploymentCommitments {
    cmmPrf: string;
    cmmCredCounter: string;
    cmmIdCredSecSharingCoeff: string[];
    cmmAttributes: Record<AttributeKey, string>;
    cmmMaxAccounts: string;
}

export interface NormalAccountCredential {
    type: 'normal';
    contents: CredentialDeploymentValues;
}

export interface InitialAccountCredential {
    type: 'initial';
    contents: InitialCredentialDeploymentValues;
}

export type BakerPendingChange =
    | {
          change: 'ReduceStake';
          newStake: bigint;
          epoch: number;
      }
    | {
          change: 'RemoveBaker';
          epoch: number;
      };

export interface AccountBakerDetails {
    restakeEarnings: boolean;
    bakerId: number;
    bakerAggregationVerifyKey: string;
    bakerElectionVerifyKey: string;
    bakerSignatureVerifyKey: string;
    stakedAmount: bigint;
    pendingChange?: BakerPendingChange;
}

export interface AccountInfo {
    accountNonce: bigint;
    accountAmount: bigint;
    accountIndex: bigint;

    accountThreshold: number;

    accountEncryptionKey: string;
    accountEncryptedAmount: AccountEncryptedAmount;

    accountReleaseSchedule: AccountReleaseSchedule;

    accountCredentials: Record<
        number,
        Versioned<InitialAccountCredential | NormalAccountCredential>
    >;

    accountBaker?: AccountBakerDetails;
}

export enum BlockItemKind {
    AccountTransactionKind = 0,
    CredentialDeploymentKind = 1,
    UpdateInstructionKind = 2,
}

/**
 * The different types of account transactions. The number value
 * is important as it is part of the serialization of a particular
 * transaction.
 */
export enum AccountTransactionType {
    DeployModule = 0,
    InitializeSmartContractInstance = 1,
    UpdateSmartContractInstance = 2,
    SimpleTransfer = 3,
    AddBaker = 4,
    RemoveBaker = 5,
    UpdateBakerStake = 6,
    UpdateBakerRestakeEarnings = 7,
    UpdateBakerKeys = 8,
    UpdateCredentialKeys = 13,
    EncryptedTransfer = 16,
    TransferToEncrypted = 17,
    TransferToPublic = 18,
    TransferWithSchedule = 19,
    UpdateCredentials = 20,
    RegisterData = 21,
    SimpleTransferWithMemo = 22,
    EncryptedTransferWithMemo = 23,
    TransferWithScheduleWithMemo = 24,
}

export interface AccountTransactionHeader {
    /** account address that is source of this transaction */
    sender: AccountAddress;

    /**
     * the nonce for the transaction, usually acquired by
     * getting the next account nonce from the node
     */
    nonce: bigint;

    /** expiration of the transaction */
    expiry: TransactionExpiry;
}

export interface SimpleTransfer {
    /** µGTU amount to transfer */
    amount: GtuAmount;

    /** the recipient of the transfer*/
    toAddress: AccountAddress;
}

export interface SchedulePoint {
    timestamp: Date;
    amount: GtuAmount;
}
export type Schedule = SchedulePoint[];

export interface TransferWithSchedule {
    /** Schedule */
    schedule: Schedule;

    /** the recipient of the transfer*/
    toAddress: AccountAddress;
}

export interface TransferToEncrypted {
    /** µGTU amount to transfer to the shielded balance */
    amount: GtuAmount;
}

type Hex = string;
// TODO: Do we need a class for this? (or some other way to show it is expected to be a HEX string)
type EncryptedAmount = Hex;

export interface TransferToPublic {
    /** µGTU amount to transfer to public balance */
    amount: GtuAmount;
    /** encrypted µGTU amount remaining in shielded balance */
    remainingEncryptedAmount: EncryptedAmount;

    index: bigint;
    /** Proof string for the transaction */
    proof: Hex;
}

export interface EncryptedTransfer {
    /** the recipient of the transfer*/
    toAddress: AccountAddress;
    /** encrypted µGTU amount to transfer */
    transferAmount: EncryptedAmount;
    /** encrypted µGTU amount remaining in shielded balance */
    remainingEncryptedAmount: EncryptedAmount;

    index: bigint;
    /** Proof string for the transaction */
    proof: Hex;
}

// TODO: Should we add a memo class?
type WithMemo<T> = T & {
    // The provided memo of the transaction
    memo: string;
};

export type SimpleTransferWithMemo = WithMemo<SimpleTransfer>;
export type EncryptedTransferWithMemo = WithMemo<EncryptedTransfer>;
export type TransferWithScheduleWithMemo = WithMemo<TransferWithSchedule>;


export type BakerVerifyKeys = {
    electionVerifyKey: Hex;
    signatureVerifyKey: Hex;
    aggregationVerifyKey: Hex;
};

export type BakerKeyProofs = {
    proofElection: Hex;
    proofSignature: Hex;
    proofAggregation: Hex;
};

export type AddBaker = BakerVerifyKeys &
    BakerKeyProofs & {
        bakingStake: GtuAmount;
        restakeEarnings: boolean;
    };

export type UpdateBakerKeys = BakerVerifyKeys & BakerKeyProofs;

export type RemoveBaker = {};

export type UpdateBakerStake = {
    stake: GtuAmount;
};

export type UpdateBakerRestakeEarnings = {
    restakeEarnings: boolean;
};

export type AccountTransactionPayload =
    | SimpleTransfer
    | SimpleTransferWithMemo
    | TransferWithSchedule
    | TransferToEncrypted
    | TransferToPublic
    | EncryptedTransfer
    | SimpleTransferWithMemo
    | EncryptedTransferWithMemo
    | TransferWithScheduleWithMemo
    | AddBaker
    | RemoveBaker
    | UpdateBakerKeys
    | UpdateBakerStake
    | UpdateBakerRestakeEarnings;

export interface AccountTransaction {
    type: AccountTransactionType;
    header: AccountTransactionHeader;
    payload: AccountTransactionPayload;
}

export type CredentialSignature = Record<number, string>;
export type AccountTransactionSignature = Record<number, CredentialSignature>;