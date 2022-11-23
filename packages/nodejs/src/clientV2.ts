import { ChannelCredentials, Metadata } from '@grpc/grpc-js';
import {
    AccountAddress as AccountAddressLocal,
    getAccountTransactionHandler,
    AccountTransactionSignature as AccountTransactionSignatureLocal,
    AccountTransaction as AccountTransactionLocal,
    calculateEnergyCost,
    CredentialDeploymentTransaction,
    serializeAccountTransactionPayload,
    serializeCredentialDeploymentPayload,
    CcdAmount,
} from '@concordium/common-sdk';
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
    SendBlockItemRequest,
    PreAccountTransaction,
    AccountTransactionSignature,
    AccountTransactionHeader,
    AccountTransaction,
    CredentialDeployment,
} from '../grpc/v2/concordium/types';
import { QueriesClient } from '../grpc/v2/concordium/service.client';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';
import {
    getBlockHashInput,
    getAccountIdentifierInput,
    assertValidHash,
    assertValidModuleRef,
    translateSignature,
} from './util';
import { AccountIdentifierInput as AccountIdentifierInputLocal } from './types';
import { countSignatures } from '@concordium/common-sdk/src/util';

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
     * @param port the port to use when econnecting to the node.
     * @param credentials credentials to use to connect to the node.
     * @param timeout milliseconds to wait before timing out.
     * @param options optional options for the P2PClient.
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
     * @param accountAddress base58 account address to get the next account nonce for.
     * @returns the next account nonce, and a boolean indicating if the nonce is reliable.
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
     * @param blockHash optional block hash to get the account info at, otherwise retrieves from last finalized block.
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
     * @param accountIdentifier base58 account address, or a credential registration id or account index to get the account info for.
     * @param blockHash optional block hash to get the account info at, otherwise retrieves from last finalized block.
     * @returns the account info for the provided account address, undefined if the account does not exist.
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

    /**
     * Retrieves a status for the given transaction/block item.
     * @param transactionHash the transaction/block item to get a status for.
     * @returns the status for the given transaction/block item, or undefined if it does not exist.
     */
    async getBlockItemStatus(
        transactionHash: Uint8Array
    ): Promise<BlockItemStatus> {
        assertValidHash(transactionHash);

        return await this.client.getBlockItemStatus({ value: transactionHash })
            .response;
    }

    /**
     * Retrieves the consensus status information from the node. Note that the optional
     * fields will only be unavailable for a newly started node that has not processed
     * enough data yet.
     */
    async getConsensusInfo(): Promise<ConsensusInfo> {
        return await this.client.getConsensusInfo(Empty).response;
    }

    /**
     * Retrieves the source of the given module at
     * the provided block.
     * @param moduleRef the module's reference, hash of the source represented as a bytearray.
     * @param blockHash the block to get the module source at.
     * @returns the source of the module as raw bytes.
     */
    async getModuleSource(
        moduleRef: Uint8Array,
        blockHash?: Uint8Array
    ): Promise<VersionedModuleSource> {
        assertValidModuleRef(moduleRef);

        const moduleSourceRequest: ModuleSourceRequest = {
            blockHash: getBlockHashInput(blockHash),
            moduleRef: { value: moduleRef },
        };

        return await this.client.getModuleSource(moduleSourceRequest).response;
    }

    /**
     * Retrieve information about a given smart contract instance.
     * @param contractAddress the address of the smart contract.
     * @param blockHash the block hash to get the smart contact instances at.
     * @returns An object with information about the contract instance.
     */
    async getInstanceInfo(
        contractAddress: ContractAddress,
        blockHash?: Uint8Array
    ): Promise<InstanceInfo> {
        const instanceInfoRequest: InstanceInfoRequest = {
            blockHash: getBlockHashInput(blockHash),
            address: contractAddress,
        };

        return await this.client.getInstanceInfo(instanceInfoRequest).response;
    }

    /**
     * Invokes a smart contract.
     * @param instance The address of the smart contract that shall be evoked.
     * @param amount The amount of microCCD to invoke the contract with.
     * @param entrypoint The entrypoint (receive function) that shall be invoked.
     * @param parameter The serialized parameters that the contract will be invoked with.
     * @param energy The maximum amount of energy to allow for execution.
     * @param invoker The address of the invoker, if undefined uses the zero account address.
     * @param blockHash the block hash at which the contract should be invoked at. The contract is invoked in the state at the end of this block.
     * @returns If the node was able to invoke, then a object describing the outcome is returned.
     * The outcome is determined by the `tag` field, which is either `success` or `failure`.
     * The `usedEnergy` field will always be present, and is the amount of NRG was used during the execution.
     * If the tag is `success`, then an `events` field is present, and it contains the events that would have been generated.
     * If invoking a V1 contract and it produces a return value, it will be present in the `returnValue` field.
     * If the tag is `failure`, then a `reason` field is present, and it contains the reason the update would have been rejected.
     * If either the block does not exist, or then node fails to parse of any of the inputs, then undefined is returned.
     */
    async invokeInstance(
        instance: ContractAddress,
        amount: CcdAmount,
        entrypoint: string,
        parameter: Uint8Array,
        energy: bigint,
        invoker?: Address,
        blockHash?: Uint8Array
    ): Promise<InvokeInstanceResponse> {
        const blockHashInput = getBlockHashInput(blockHash);

        const invokeInstanceRequest: InvokeInstanceRequest = {
            blockHash: blockHashInput,
            invoker: invoker,
            instance: instance,
            amount: { value: amount.microCcdAmount },
            entrypoint: { value: entrypoint },
            parameter: { value: parameter },
            energy: { value: energy },
        };

        return await this.client.invokeInstance(invokeInstanceRequest).response;
    }

    /**
     * Get the hash to be signed for an account transaction. The hash returned
     * can be signed and the signatures included as an
     * AccountTransactionSignature when calling `SendBlockItem`. This function should only serve
     * for verification and in most cases the local method with the same name should be prefered
     * @param PreAccountTransaction The account transaction which hash should be returned.
     * @returns The account transaction hash to be signed as a byte array.
     */
    async getAccountTransactionSignHash(
        preAccountTransaction: PreAccountTransaction
    ): Promise<Uint8Array> {
        const response = await this.client.getAccountTransactionSignHash(
            preAccountTransaction
        ).response;
        return response.value;
    }

    /**
     * Serializes and sends an account transaction to the node to be
     * put in a block on the chain.
     *
     * Note that a transaction can still fail even if it was accepted by the node.
     * To keep track of the transaction use getTransactionStatus.
     * @param transaction the transaction to send to the node
     * @param signatures the signatures on the signing digest of the transaction
     * @returns The transaction hash as a byte array
     */
    async sendAccountTransaction(
        transaction: AccountTransactionLocal,
        signature: AccountTransactionSignatureLocal
    ): Promise<Uint8Array> {
        const rawPayload = serializeAccountTransactionPayload(transaction);
        const transactionSignature: AccountTransactionSignature =
            translateSignature(signature);

        // Energy cost
        const accountTransactionHandler = getAccountTransactionHandler(
            transaction.type
        );
        const baseEnergyCost = accountTransactionHandler.getBaseEnergyCost(
            transaction.payload
        );
        const energyCost = calculateEnergyCost(
            countSignatures(signature),
            BigInt(rawPayload.length),
            baseEnergyCost
        );

        // Put together sendBlockItemRequest
        const header: AccountTransactionHeader = {
            sender: { value: transaction.header.sender.decodedAddress },
            sequenceNumber: { value: transaction.header.nonce },
            energyAmount: { value: energyCost },
            expiry: { value: transaction.header.expiry.expiryEpochSeconds },
        };
        const accountTransaction: AccountTransaction = {
            signature: transactionSignature,
            header: header,
            payload: {
                payload: { oneofKind: 'rawPayload', rawPayload: rawPayload },
            },
        };
        const sendBlockItemRequest: SendBlockItemRequest = {
            blockItem: {
                oneofKind: 'accountTransaction',
                accountTransaction: accountTransaction,
            },
        };

        const response = await this.client.sendBlockItem(sendBlockItemRequest)
            .response;
        return response.value;
    }

    /**
     * Sends a credential deployment transaction, for creating a new account,
     * to the node to be put in a block on the chain.
     *
     * Note that a transaction can still fail even if it was accepted by the node.
     * To keep track of the transaction use getTransactionStatus.
     * @param credentialDeploymentTransaction the credential deployment transaction to send to the node
     * @param signatures the signatures on the hash of the serialized unsigned credential deployment information, in order
     * @returns The transaction hash as a byte array
     */
    async sendCredentialDeploymentTransaction(
        credentialDeploymentTransaction: CredentialDeploymentTransaction,
        signatures: string[]
    ): Promise<Uint8Array> {
        const payloadHex = serializeCredentialDeploymentPayload(
            signatures,
            credentialDeploymentTransaction
        );

        const credentialDeployment: CredentialDeployment = {
            messageExpiry: {
                value: credentialDeploymentTransaction.expiry
                    .expiryEpochSeconds,
            },
            payload: {
                oneofKind: 'rawPayload',
                rawPayload: payloadHex,
            },
        };
        const sendBlockItemRequest: SendBlockItemRequest = {
            blockItem: {
                oneofKind: 'credentialDeployment',
                credentialDeployment: credentialDeployment,
            },
        };

        const response = await this.client.sendBlockItem(sendBlockItemRequest)
            .response;
        return response.value;
    }
}
