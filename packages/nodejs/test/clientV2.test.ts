import { credentials, Metadata } from '@grpc/grpc-js/';
import ConcordiumNodeClient from '../src/clientV2';
import { testnetBulletproofGenerators } from './resources/bulletproofgenerators';
import {
    AccountAddress,
    CredentialRegistrationId,
    buildBasicAccountSigner,
    TransactionExpiry,
    AccountTransactionHeader as AccountTransactionHeaderLocal,
    SimpleTransferPayload,
    CcdAmount,
    AccountTransactionType,
    AccountTransaction as AccountTransactionLocal,
    AccountTransactionSignature as AccountTransactionSignatureLocal,
    signTransaction,
    getAccountTransactionHandler,
    calculateEnergyCost,
    serializeAccountTransactionPayload,
    VerifyKey,
    AttributeKey,
    CredentialDeploymentTransaction,
    createCredentialDeploymentTransaction,
    getCredentialDeploymentSignDigest,
    CryptographicParameters as CryptographicParametersLocal,
    IdentityInput,
    sha256,
} from '@concordium/common-sdk';
import {
    AccountInfo,
    BlockItemStatus,
    InstanceInfo,
    InvokeInstanceResponse,
    AccountTransactionHeader,
    AccountStakingInfo,
    PreAccountTransaction,
} from '../grpc/v2/concordium/types';
import { getModuleBuffer, getIdentityInput } from './testHelpers';
import * as ed from '@noble/ed25519';
import { serializeAccountTransaction } from '@concordium/common-sdk/lib/serialization';
import * as expected from './resources/expectedJsons';
//import AbortController from "abort-controller"

/**
 * Creates a client to communicate with a local concordium-node
 * used for automatic tests.
 */

export function getNodeClient(
    address = 'service.internal.testnet.concordium.com',
    port = 20000
): ConcordiumNodeClient {
    const metadata = new Metadata();
    return new ConcordiumNodeClient(
        address,
        port,
        credentials.createInsecure(),
        metadata,
        15000
    );
}

const client = getNodeClient();

const testAccount = new AccountAddress(
    '3kBx2h5Y2veb4hZgAJWPrr8RyQESKm5TjzF3ti1QQ4VSYLwK1G'
);
const testBlockHash = Buffer.from(
    'fe88ff35454079c3df11d8ae13d5777babd61f28be58494efe51b6593e30716e',
    'hex'
);

test('getCryptographicParameters', async () => {
    const parameters = await client.getCryptographicParameters(testBlockHash);
    expect(parameters.genesisString).toEqual('Concordium Testnet Version 5');
    expect(parameters.onChainCommitmentKey).toEqual(
        Buffer.from(
            'sUy/5EoCxrH3hxEXbV9DcpU2eqTyqMJVHuENJaA63GnWGjMqBYlxkZ2tcxLh/JTFqNReZLb5F8VA7uFslww9S388r0indGKEh44qziHILqRL+EYJg0Ylvh8wmYisUj+s',
            'base64'
        )
    );

    expect(parameters.bulletproofGenerators).toEqual(
        Buffer.from(testnetBulletproofGenerators, 'base64')
    );
});

test('getNextAccountSequenceNumber', async () => {
    const nextAccountSequenceNumber = await client.getNextAccountSequenceNumber(
        testAccount
    );
    expect(
        nextAccountSequenceNumber.sequenceNumber?.value
    ).toBeGreaterThanOrEqual(19n);
    expect(nextAccountSequenceNumber.allFinal).toBeDefined();
});

test('getAccountInfo', async () => {
    const accountInfo = await client.getAccountInfo(testAccount, testBlockHash);

    expect(AccountInfo.toJson(accountInfo)).toEqual(expected.accountInfo);
});

test('getAccountInfo: Invalid hash throws error', async () => {
    const invalidBlockHash = Buffer.from('1010101010', 'hex');
    await expect(
        client.getAccountInfo(testAccount, invalidBlockHash)
    ).rejects.toEqual(
        new Error(
            'The input was not a valid hash, must be 32 bytes: ' +
                Buffer.from(invalidBlockHash).toString('hex')
        )
    );
});

test('getAccountInfo for baker', async () => {
    const accountInfo = await client.getAccountInfo(5n, testBlockHash);

    if (accountInfo.stake) {
        expect(AccountStakingInfo.toJson(accountInfo.stake)).toEqual(
            expected.stakingInfoBaker
        );
    } else {
        throw Error('Stake field not found in accountInfo.');
    }
});

test('getAccountInfo for delegator', async () => {
    const delegator = '3bFo43GiPnkk5MmaSdsRVboaX2DNSKaRkLseQbyB3WPW1osPwh';
    const accountInfo = await client.getAccountInfo(
        new AccountAddress(delegator),
        testBlockHash
    );

    if (accountInfo.stake) {
        expect(AccountStakingInfo.toJson(accountInfo.stake)).toEqual(
            expected.stakingInfoDelegator
        );
    } else {
        throw Error('Stake field not found in accountInfo.');
    }
});

test('getAccountInfo: Account Address and CredentialRegistrationId is equal', async () => {
    const credId =
        'aa730045bcd20bb5c24349db29d949f767e72f7cce459dc163c4b93c780a7d7f65801dda8ff7e4fc06fdf1a1b246276f';
    const accountInfoAddress = await client.getAccountInfo(
        new CredentialRegistrationId(credId),
        testBlockHash
    );

    const accountInfoCredId = await client.getAccountInfo(
        new CredentialRegistrationId(credId),
        testBlockHash
    );

    expect(accountInfoAddress).toEqual(accountInfoCredId);
});

test('getBlockItemStatus', async () => {
    const transactionHash = Buffer.from(
        '3de823b876d05cdd33a311a0f84124079f5f677afb2534c4943f830593edc650',
        'hex'
    );
    const blockItemStatus = await client.getBlockItemStatus(transactionHash);

    expect(BlockItemStatus.toJson(blockItemStatus)).toEqual(
        expected.blockItemStatus
    );
});

test('getInstanceInfo', async () => {
    const contractAddress = {
        index: 0n,
        subindex: 0n,
    };
    const instanceInfo = await client.getInstanceInfo(
        contractAddress,
        testBlockHash
    );

    expect(InstanceInfo.toJson(instanceInfo)).toEqual(expected.instanceInfo);
});

test('invokeInstance on v0 contract', async () => {
    const contractAddress = {
        index: 6n,
        subindex: 0n,
    };

    const invokeInstanceResponse = await client.invokeInstance(
        contractAddress,
        new CcdAmount(42n),
        'PiggyBank.insert',
        new Uint8Array(),
        30000n,
        undefined,
        testBlockHash
    );

    const responseJson = InvokeInstanceResponse.toJson(invokeInstanceResponse);
    expect(responseJson).toEqual(expected.invokeInstanceResponseV0);
});

test('getModuleSource', async () => {
    const localModuleBytes = getModuleBuffer('test/resources/piggy_bank.wasm');
    const moduleRef = Buffer.from(
        'foOYrcQGqX202GnD/XrcgToxg2Z6On2weOuub33OX2Q=',
        'base64'
    );

    const versionedModuleSource = await client.getModuleSource(
        moduleRef,
        testBlockHash
    );

    if (versionedModuleSource.module.oneofKind == 'v0') {
        const localModuleHex = Buffer.from(localModuleBytes).toString('hex');
        const chainModuleHex = Buffer.from(
            versionedModuleSource.module.v0.value
        ).toString('hex');

        expect(localModuleHex).toEqual(chainModuleHex);
    } else {
        throw new Error('Expected module to have version 0.');
    }
});

test('getConsensusInfo', async () => {
    const genesisBlock = Buffer.from(
        'QiEzLTThaUFowqDAs/0PJzgJYSyxPQANXC4A6F9Q95Y=',
        'base64'
    );

    const consensusInfo = await client.getConsensusInfo();

    expect(consensusInfo.blocksReceivedCount).toBeGreaterThan(9571n);
    expect(consensusInfo.blocksVerifiedCount).toBeGreaterThan(9571n);
    expect(consensusInfo.finalizationCount).toBeGreaterThan(8640n);
    expect(consensusInfo.genesisBlock?.value).toEqual(genesisBlock);
    expect(consensusInfo.lastFinalizedTime?.value).toBeGreaterThan(
        1669214033937n
    );
    expect(consensusInfo.lastFinalizedBlockHeight?.value).toBeGreaterThan(
        1395315n
    );
});

test('sendBlockItem', async () => {
    const senderAccount = new AccountAddress(
        '37TRfx9PqFX386rFcNThyA3zdoWsjF8Koy6Nh3i8VrPy4duEsA'
    );
    const privateKey =
        '1f7d20585457b542b22b51f218f0636c8e05ead4b64074e6eafd1d418b04e4ac';
    const sequenceNumber = (
        await client.getNextAccountSequenceNumber(senderAccount)
    ).sequenceNumber;
    if (sequenceNumber?.value === undefined) {
        throw Error('Failed getting next sequence number!');
    }

    // Create local transaction
    const header: AccountTransactionHeaderLocal = {
        expiry: new TransactionExpiry(new Date(Date.now() + 3600000)),
        nonce: sequenceNumber.value,
        sender: senderAccount,
    };
    const simpleTransfer: SimpleTransferPayload = {
        amount: new CcdAmount(10000000000n),
        toAddress: testAccount,
    };
    const accountTransaction: AccountTransactionLocal = {
        header: header,
        payload: simpleTransfer,
        type: AccountTransactionType.Transfer,
    };

    // Sign transaction
    const signer = buildBasicAccountSigner(privateKey);
    const signature: AccountTransactionSignatureLocal = await signTransaction(
        accountTransaction,
        signer
    );

    expect(
        client.sendAccountTransaction(accountTransaction, signature)
    ).rejects.toThrow(
        '3 INVALID_ARGUMENT: The sender did not have enough funds to cover the costs'
    );
});

test('transactionHash', async () => {
    const senderAccount = new AccountAddress(
        '37TRfx9PqFX386rFcNThyA3zdoWsjF8Koy6Nh3i8VrPy4duEsA'
    );
    const privateKey =
        '1f7d20585457b542b22b51f218f0636c8e05ead4b64074e6eafd1d418b04e4ac';
    const sequenceNumber = (
        await client.getNextAccountSequenceNumber(senderAccount)
    ).sequenceNumber;
    if (sequenceNumber?.value === undefined) {
        throw Error('Failed getting next sequence number!');
    }

    // Create local transaction
    const headerLocal: AccountTransactionHeaderLocal = {
        expiry: new TransactionExpiry(new Date(Date.now() + 3600000)),
        nonce: sequenceNumber.value,
        sender: senderAccount,
    };
    const simpleTransfer: SimpleTransferPayload = {
        amount: new CcdAmount(10000000000n),
        toAddress: testAccount,
    };
    const transaction: AccountTransactionLocal = {
        header: headerLocal,
        payload: simpleTransfer,
        type: AccountTransactionType.Transfer,
    };

    const rawPayload = serializeAccountTransactionPayload(transaction);

    // Energy cost
    const accountTransactionHandler = getAccountTransactionHandler(
        transaction.type
    );
    const baseEnergyCost = accountTransactionHandler.getBaseEnergyCost(
        transaction.payload
    );
    const energyCost = calculateEnergyCost(
        1n,
        BigInt(rawPayload.length),
        baseEnergyCost
    );

    // Sign transaction
    const signer = buildBasicAccountSigner(privateKey);
    const signature: AccountTransactionSignatureLocal = await signTransaction(
        transaction,
        signer
    );

    // Put together sendBlockItemRequest
    const header: AccountTransactionHeader = {
        sender: { value: transaction.header.sender.decodedAddress },
        sequenceNumber: { value: transaction.header.nonce },
        energyAmount: { value: energyCost },
        expiry: { value: transaction.header.expiry.expiryEpochSeconds },
    };
    const accountTransaction: PreAccountTransaction = {
        header: header,
        payload: {
            payload: { oneofKind: 'rawPayload', rawPayload: rawPayload },
        },
    };

    const serializedAccountTransaction = serializeAccountTransaction(
        transaction,
        signature
    ).slice(71);
    const localHash = Buffer.from(
        sha256([serializedAccountTransaction])
    ).toString('hex');
    const nodeHash = await client.getAccountTransactionSignHash(
        accountTransaction
    );

    expect(localHash).toEqual(Buffer.from(nodeHash).toString('hex'));
});

// Todo: verify that accounts can actually be created.
test('createAccount', async () => {
    // Get information from node
    const lastFinalizedBlockHash = (await client.getConsensusInfo())
        .lastFinalizedBlock;
    if (!lastFinalizedBlockHash) {
        throw new Error('Could not find latest finalized block.');
    }
    const cryptoParams = await client.getCryptographicParameters(
        lastFinalizedBlockHash.value
    );
    if (!cryptoParams) {
        throw new Error(
            'Cryptographic parameters were not found on a block that has been finalized.'
        );
    }

    const cryptographicParameters: CryptographicParametersLocal = {
        genesisString: cryptoParams.genesisString,
        bulletproofGenerators: Buffer.from(
            cryptoParams.bulletproofGenerators
        ).toString('hex'),
        onChainCommitmentKey: Buffer.from(
            cryptoParams.onChainCommitmentKey
        ).toString('hex'),
    };

    // Create credentialDeploymentTransaction
    const identityInput: IdentityInput = getIdentityInput();
    const threshold = 1;
    const credentialIndex = 1;
    const expiry = new TransactionExpiry(new Date(Date.now() + 3600000));
    const revealedAttributes: AttributeKey[] = [];
    const publicKeys: VerifyKey[] = [
        {
            schemeId: 'Ed25519',
            verifyKey:
                'c8cd7623c5a9316d8e2fccb51e1deee615bdb5d324fb4a6d33801848fb5e459e',
        },
    ];

    const credentialDeploymentTransaction: CredentialDeploymentTransaction =
        createCredentialDeploymentTransaction(
            identityInput,
            cryptographicParameters,
            threshold,
            publicKeys,
            credentialIndex,
            revealedAttributes,
            expiry
        );

    // Sign transaction
    const hashToSign = getCredentialDeploymentSignDigest(
        credentialDeploymentTransaction
    );
    const signingKey1 =
        '1053de23867e0f92a48814aabff834e2ca0b518497abaef71cad4e1be506334a';
    const signature = Buffer.from(
        await ed.sign(hashToSign, signingKey1)
    ).toString('hex');
    const signatures: string[] = [signature];

    expect(
        client.sendCredentialDeploymentTransaction(
            credentialDeploymentTransaction,
            signatures
        )
    ).rejects.toThrow(
        '3 INVALID_ARGUMENT: The credential deployment was expired'
    );
});

// Sometimes fails as there is no guarantee that a new block comes within 30 seconds,
// although one usually does
test('getFinalizedBlocks', async () => {
    const ac = new AbortController();
    const client2 = getNodeClient();
    const blockStream = client2.getFinalizedBlocks(ac.signal);
    const nextBlock = await blockStream[Symbol.asyncIterator]().next();
    const height = await nextBlock.value.height.value;

    expect(height).toBeGreaterThan(1553503n);

    ac.abort();
}, 30000);
