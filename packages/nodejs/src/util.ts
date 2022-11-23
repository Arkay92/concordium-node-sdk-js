import * as fs from 'fs';
import { Buffer } from 'buffer/';
import { BoolResponse, JsonResponse } from '../grpc/concordium_p2p_rpc_pb';
import {
    BlockHashInput,
    Empty,
    AccountIdentifierInput,
    AccountTransactionSignature,
} from '../grpc/v2/concordium/types';
import {
    AccountAddress,
    CredentialRegistrationId as CredRegId,
    AccountTransactionSignature as AccountTransactionSignatureLocal,
} from '@concordium/common-sdk';
import { AccountIdentifierInput as AccountIdentifierInputLocal } from './types';

export function intListToStringList(jsonStruct: string): string {
    return jsonStruct.replace(/(\-?[0-9]+)/g, '"$1"');
}

/**
 * Unwraps a serialized bool response to the corresponding boolean/
 */
export function unwrapBoolResponse(serializedResponse: Uint8Array): boolean {
    return BoolResponse.deserializeBinary(serializedResponse).getValue();
}

/**
 * Unwraps a serialized JSON response.
 * @param serializedResponse the JSON response in bytes as received from the gRPC call
 * @param reviver JSON reviver function to change types while parsing
 * @param transformer a function to transform the JSON string prior to parsing the JSON
 * @returns the unwrapped, transformed and parsed JSON object
 */
export function unwrapJsonResponse<T>(
    serializedResponse: Uint8Array,
    reviver?: (this: unknown, key: string, value: unknown) => unknown,
    transformer?: (json: string) => string
): T | undefined {
    const jsonString =
        JsonResponse.deserializeBinary(serializedResponse).getValue();

    if (jsonString === 'null') {
        return undefined;
    }

    if (transformer) {
        const transformedJson = transformer(jsonString);
        return JSON.parse(transformedJson, reviver);
    }

    return JSON.parse(jsonString, reviver);
}

/**
 * Loads the module as a buffer, given the given filePath.
 * @param filepath the location of the module
 * @returns the module as a buffer
 */
export function getModuleBuffer(filePath: string): Buffer {
    return Buffer.from(fs.readFileSync(filePath));
}

export function getBlockHashInput(blockHash?: Uint8Array): BlockHashInput {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let blockHashInput: any = {};

    if (blockHash) {
        assertValidHash(blockHash);
        blockHashInput = {
            oneofKind: 'given',
            given: { value: blockHash },
        };
    } else {
        blockHashInput = {
            oneofKind: 'lastFinal',
            lastFinal: Empty,
        };
    }

    return { blockHashInput: blockHashInput };
}

/**
 * Gets an GRPCv2 AccountIdentifierInput from a GRPCv1 AccountIdentifierInput.
 * @param accountIdentifier a GRPCv1 AccountIdentifierInput.
 * @returns a GRPCv2 AccountIdentifierInput.
 */
export function getAccountIdentifierInput(
    accountIdentifier: AccountIdentifierInputLocal
): AccountIdentifierInput {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const returnIdentifier: any = {};

    if ((<AccountAddress>accountIdentifier).decodedAddress !== undefined) {
        const address = (<AccountAddress>accountIdentifier).decodedAddress;
        returnIdentifier.oneofKind = 'address';
        returnIdentifier.address = { value: address };
    } else if ((<CredRegId>accountIdentifier).credId !== undefined) {
        const credId = (<CredRegId>accountIdentifier).credId;
        returnIdentifier.oneofKind = 'credId';
        returnIdentifier.credId = { value: Buffer.from(credId, 'hex') };
    } else {
        returnIdentifier.oneofKind = 'accountIndex';
        returnIdentifier.accountIndex = { value: accountIdentifier };
    }

    return { accountIdentifierInput: returnIdentifier };
}

export function assertValidHash(hash: Uint8Array): void {
    if (hash.length !== 32) {
        throw new Error(
            'The input was not a valid hash, must be 32 bytes: ' +
                Buffer.from(hash).toString('hex')
        );
    }
}

export function assertValidModuleRef(moduleRef: Uint8Array): void {
    if (moduleRef.length !== 32) {
        throw new Error(
            'The input was not a valid module reference, must be 32 bytes: ' +
                Buffer.from(moduleRef).toString('hex')
        );
    }
}

/**
 * Gets an GRPCv2 AccountTransactionSignature from a GRPCv1 AccountTransactionSignature.
 * @param accountIdentifier a GRPCv1 AccountTransactionSignature.
 * @returns a GRPCv2 AccountTransactionSignature.
 */
export function translateSignature(
    signature: AccountTransactionSignatureLocal
): AccountTransactionSignature {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountTransactionSignature: any = { signatures: {} };

    for (const i in signature) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accountSignatureMap: any = { signatures: {} };

        for (const j in signature[i]) {
            accountSignatureMap.signatures[i] = {
                value: Buffer.from(signature[i][j], 'hex'),
            };
        }
        accountTransactionSignature.signatures[i] = accountSignatureMap;
    }

    return accountTransactionSignature;
}
