import { ChannelCredentials, Metadata } from '@grpc/grpc-js';
import { AccountAddress as AccountAddressLocal } from '@concordium/common-sdk';
import {
    Address,
    AccountAddress,
    AccountInfo,
    AccountInfoRequest,
    BlockItemStatus,
    ConsensusInfo,
    CryptographicParameters,
    NextAccountSequenceNumber,
    VersionedModuleSource,
    ContractAddress,
    InstanceInfo,
    InvokeInstanceResponse,
    InstanceInfoRequest,
    Empty,
    ModuleSourceRequest,
    InvokeInstanceRequest,
} from '../grpc/v2/concordium/types';
import { QueriesClient } from '../grpc/v2/concordium/service.client';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';
import {
    getBlockHashInput,
    getAccountIdentifierInput,
    assertValidHash,
    assertValidModuleRef,
    assertAmount,
} from './util';
import { AccountIdentifierInput as AccountIdentifierInputLocal } from './types';

/**
 * A concordium-node specific gRPC client wrapper.
 *
 * @example
 * import ConcordiumNodeClient from "..."
 * const client = new ConcordiumNodeClient('127.0.0.1', 20000, credentials, metadata, 15000);
 */
export default class ConcordiumNodeClient {
    client: QueriesClient;

    metadata: Metadata;

    address: string;

    port: number;

    timeout: number;

    /**
     * Initialize a gRPC client for a specific concordium node.
     * @param address the ip address of the node, e.g. 127.0.0.1
     * @param port the port to use when econnecting to the node
     * @param credentials credentials to use to connect to the node
     * @param timeout milliseconds to wait before timing out
     * @param options optional options for the P2PClient
     */
    constructor(
        address: string,
        port: number,
        credentials: ChannelCredentials,
        metadata: Metadata,
        timeout: number,
        options?: Record<string, unknown>
    ) {
        if (timeout < 0 || !Number.isSafeInteger(timeout)) {
            throw new Error(
                'The timeout must be a positive integer, but was: ' + timeout
            );
        }

        const grpcTransport = new GrpcTransport({
            host: `${address}:${port}`,
            channelCredentials: credentials,
            options: options,
        });

        this.address = address;
        this.port = port;
        this.timeout = timeout;
        this.metadata = metadata;
        this.client = new QueriesClient(grpcTransport);
    }

    /**
     * Retrieves the next account nonce for the given account. The account nonce is
     * used in all account transactions as part of their header.
     * @param accountAddress base58 account address to get the next account nonce for
     * @returns the next account nonce, and a boolean indicating if the nonce is reliable
     */
    async getNextAccountSequenceNumber(
        accountAddress: AccountAddressLocal
    ): Promise<NextAccountSequenceNumber> {
        const address: AccountAddress = {
            value: new Uint8Array(accountAddress.decodedAddress),
        };
        return await this.client.getNextAccountSequenceNumber(address).response;
    }

    /**
     * Retrieves the consensus status information from the node. Note that the optional
     * fields will only be unavailable for a newly started node that has not processed
     * enough data yet.
     * @param blockHash optional block hash to get the account info at, otherwise retrieves from last finalized block
     * @returns the global cryptographic parameters at the given block, or undefined it the block does not exist.
     */
    async getCryptographicParameters(
        blockHash?: Uint8Array
    ): Promise<CryptographicParameters> {
        const blockHashInput = getBlockHashInput(blockHash);
        return await this.client.getCryptographicParameters(blockHashInput)
            .response;
    }

    /**
     * Retrieves the account info for the given account. If the provided block
     * hash is in a block prior to the finalization of the account, then the account
     * information will not be available.
     * A credential registration id can also be provided, instead of an address. In this case
     * the node will return the account info of the account, which the corresponding credential
     * is (or was) deployed to. An account index can also be provided.
     * @param accountIdentifier base58 account address, or a credential registration id or account index to get the account info for
     * @param blockHash optional block hash to get the account info at, otherwise retrieves from last finalized block
     * @returns the account info for the provided account address, undefined if the account does not exist
     */
    async getAccountInfo(
        accountIdentifier: AccountIdentifierInputLocal,
        blockHash?: Uint8Array
    ): Promise<AccountInfo> {
        const accountInfoRequest: AccountInfoRequest = {
            blockHash: getBlockHashInput(blockHash),
            accountIdentifier: getAccountIdentifierInput(accountIdentifier),
        };

        return await this.client.getAccountInfo(accountInfoRequest).response;
    }

    async getBlockItemStatus(
        transactionHash: Uint8Array
    ): Promise<BlockItemStatus> {
        assertValidHash(transactionHash);

        return await this.client.getBlockItemStatus({ value: transactionHash })
            .response;
    }

    async getConsensusInfo(): Promise<ConsensusInfo> {
        return await this.client.getConsensusInfo(Empty).response;
    }

    async getModuleSource(
        moduleRef: Uint8Array,
        blockHash?: Uint8Array
    ): Promise<VersionedModuleSource> {
        const blockHashInput = getBlockHashInput(blockHash);
        assertValidModuleRef(moduleRef);

        const moduleSourceRequest: ModuleSourceRequest = {
            blockHash: blockHashInput,
            moduleRef: { value: moduleRef },
        };

        return await this.client.getModuleSource(moduleSourceRequest).response;
    }

    async getInstanceInfo(
        contractAddress: ContractAddress,
        blockHash?: Uint8Array
    ): Promise<InstanceInfo> {
        const blockHashInput = getBlockHashInput(blockHash);

        const instanceInfoRequest: InstanceInfoRequest = {
            blockHash: blockHashInput,
            address: contractAddress,
        };

        return await this.client.getInstanceInfo(instanceInfoRequest).response;
    }

    async invokeInstance(
        instance: ContractAddress,
        amount: bigint,
        entrypoint: string,
        parameter: Uint8Array,
        energy: bigint,
        invoker?: Address,
        blockHash?: Uint8Array
    ): Promise<InvokeInstanceResponse> {
        const blockHashInput = getBlockHashInput(blockHash);
        assertAmount(amount);

        const invokeInstanceRequest: InvokeInstanceRequest = {
            blockHash: blockHashInput,
            invoker: invoker,
            instance: instance,
            amount: { value: amount },
            entrypoint: { value: entrypoint },
            parameter: { value: parameter },
            energy: { value: energy },
        };

        return await this.client.invokeInstance(invokeInstanceRequest).response;
    }
}
