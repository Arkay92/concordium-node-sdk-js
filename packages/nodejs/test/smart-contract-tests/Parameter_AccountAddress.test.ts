import {
    AccountTransaction,
    AccountTransactionHeader,
    AccountTransactionSignature,
    AccountTransactionType,
    InitContractPayload,
    getAccountTransactionSignDigest,
    AccountAddress,
    CcdAmount,
    TransactionExpiry,
    ModuleReference,
    serializeInitContractParameters,
} from '@concordium/common-sdk';
import * as ed from '@noble/ed25519';
import { getNodeClient, getModuleBuffer } from '../testHelpers';
import { Buffer } from 'buffer/';
const client = getNodeClient();
const senderAccountAddress =
    '4ZJBYQbVp3zVZyjCXfZAAYBVkJMyVj8UKUNj9ox5YqTCBdBq2M';
const wrongPrivateKey =
    'ce432f6cca0d47caec1f45739331dc354b6d749fdb8ab7c2b7f6cb24db39ca0c';
// test case for init contract
// Source of module: test/resources/smartcontracts/UserAddress
test('Parameter of AccountAddress with the wrong private key', async () => {
    const nextAccountNonce = await client.getNextAccountNonce(
        new AccountAddress(senderAccountAddress)
    );
    if (!nextAccountNonce) {
        throw new Error('Nonce not found!');
    }
    const header: AccountTransactionHeader = {
        expiry: new TransactionExpiry(new Date(Date.now() + 3600000)),
        nonce: nextAccountNonce.nonce,
        sender: new AccountAddress(senderAccountAddress),
    };

    const contractName = 'UserAddress';
    const userInput = '4ZJBYQbVp3zVZyjCXfZAAYBVkJMyVj8UKUNj9ox5YqTCBdBq2M';

    const baseEnergy = 300000n;
    const moduleFileBuffer = getModuleBuffer(
        'test/resources/schemaFiles/schema14.bin'
    );
    const inputParams = serializeInitContractParameters(
        contractName,
        userInput,
        moduleFileBuffer,
        0
    );
    const initModule: InitContractPayload = {
        amount: new CcdAmount(0n),
        moduleRef: new ModuleReference(
            '3116f9792bf412e273d10a52bf42b78dddb9833d0c51c6cf79831f3b96866569'
        ),
        contractName: contractName,
        parameter: inputParams,
        maxContractExecutionEnergy: baseEnergy,
    } as InitContractPayload;

    const initContractTransaction: AccountTransaction = {
        header: header,
        payload: initModule,
        type: AccountTransactionType.InitializeSmartContractInstance,
    };

    const hashToSign = getAccountTransactionSignDigest(initContractTransaction);
    const signature = Buffer.from(
        await ed.sign(hashToSign, wrongPrivateKey)
    ).toString('hex');
    const signatures: AccountTransactionSignature = {
        0: {
            0: signature,
        },
    };

    const result = await client.sendAccountTransaction(
        initContractTransaction,
        signatures
    );

    expect(result).toBeTruthy();
}, 300000);
