/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const args = process.argv;
const peer = args[2];

let PORT: number;
let channelName: string;
let chaincodeName: string;
let mspId: string;
let cryptoPath: string; // Path to crypto materials.
let keyDirectoryPath: string; // Path to user private key directory.
let certPath: string; // Path to user certificate.
let tlsCertPath: string; // Path to peer tls certificate.
let peerEndpoint: string; // Gateway peer endpoint.
let peerHostAlias: string;  // Gateway peer SSL host name override.

switch(peer){
    case "1":
        PORT = 3001;
        channelName = 'mychannel';
        chaincodeName = 'basic';
        mspId = 'Org1MSP';
        cryptoPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
        keyDirectoryPath =  path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
        certPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'cert.pem');
        tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
        peerEndpoint = 'localhost:7051';
        peerHostAlias = 'peer0.org1.example.com';
        break;
    case "2":
        PORT = 3002;
        channelName = 'mychannel';
        chaincodeName = 'basic';
        mspId = 'Org2MSP';
        cryptoPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com');
        keyDirectoryPath =  path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'keystore');
        certPath = path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'signcerts', 'cert.pem');
        tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org2.example.com', 'tls', 'ca.crt');
        peerEndpoint = 'localhost:9051';
        peerHostAlias = 'peer0.org2.example.com';
        break;
}


const app = express();
app.use(bodyParser.json());
app.use(cors());

const utf8Decoder = new TextDecoder();
const assetId = `asset${Date.now()}`;

interface Asset {
    ID: string;
    Name: string;
    Img: string;
    Vote: number;
}
 

async function init(): Promise<void> {

    await displayInputParameters();

    //  kết nối gRPC với dịch vụ Fabric Gateway, để giao dịch với mạng blockchain
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        // Default timeouts for different gRPC calls

        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);

        // Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
        await initLedger(contract);

        app.get("/", async (req, res) => {
            const result = await getAllAssets(contract);
            res.type('json');
            res.send(result);
        });
        
        app.post("/", async (req, res) => {
            const id = req.body.id;
            console.log("-------> id is:", id);
            const asset = await readAssetByID(contract, id);
            asset.Vote++;
            await updateAsset(contract, asset);
            res.type('json');
            res.send({
                status: "success",
                data: asset
            })
        });

        app.post("/register", async (req, res) => {
            const id = req.body.id;
            const name = req.body.name;
            const img = req.body.img;

            await createAsset(contract, id, name, img);
            
            res.type('json');
            res.send({
                status: "success",
                data: {
                    id: id,
                    name: name,
                    img: img
                }
            })
        });

        app.listen(PORT, () => {
            console.log(`app run ${PORT}`)
        })
    } finally {
        process.stdin.resume();//so the program will not close instantly

        function exitHandler(options: any, exitCode: any) {
            if (options.cleanup) {
                console.log("----> close");
                gateway.close();
                client.close();
            };
            if (exitCode || exitCode === 0) console.log(exitCode);
            if (options.exit) process.exit();
        }

        //do something when app is closing
        process.on('exit', exitHandler.bind(null,{cleanup:true}));

        //catches ctrl+c event
        process.on('SIGINT', exitHandler.bind(null, {exit:true}));

        // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
        process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

        //catches uncaught exceptions
        process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
    }
}

init().catch(error => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});


async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}


async function newIdentity(): Promise<Identity> {
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner(): Promise<Signer> {
    const files = await fs.readdir(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * This type of transaction would typically only be run once by an application the first time it was started after its
 * initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
 */
async function initLedger(contract: Contract): Promise<void> {
    console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
    await contract.submitTransaction('InitLedger');
    console.log('*** Transaction committed successfully');
}

/**
 * Evaluate a transaction to query ledger state.
 */
async function getAllAssets(contract: Contract): Promise<[Asset]> {
    console.log('\n-->GetAllAssets');

    const resultBytes = await contract.evaluateTransaction('GetAllAssets');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);

    return result;
}

/**
 * Submit a transaction synchronously, blocking until it has been committed to the ledger.
 */
async function createAsset(contract: Contract, id: string, name: string, img: string): Promise<void> {
    console.log('*** create asset', id, name, img);
    const vote = "0";
    await contract.submitTransaction(
        'CreateAsset',
        id,
        name,
        img,
        vote
    );
    console.log('*** Transaction committed successfully');
}

/**
 * Submit transaction asynchronously, allowing the application to process the smart contract response (e.g. update a UI)
 * while waiting for the commit notification.
 */
async function transferAssetAsync(contract: Contract): Promise<void> {
    console.log('\n--> Async Submit Transaction: TransferAsset, updates existing asset owner');

    const commit = await contract.submitAsync('TransferAsset', {
        arguments: [assetId, 'Saptha'],
    });
    const oldOwner = utf8Decoder.decode(commit.getResult());

    console.log(`*** Successfully submitted transaction to transfer ownership from ${oldOwner} to Saptha`);
    console.log('*** Waiting for transaction commit');

    const status = await commit.getStatus();
    if (!status.successful) {
        throw new Error(`Transaction ${status.transactionId} failed to commit with status code ${status.code}`);
    }

    console.log('*** Transaction committed successfully');
}

async function readAssetByID(contract: Contract, id: string): Promise<Asset> {
    console.log('\n--> ReadAsset,');

    const resultBytes = await contract.evaluateTransaction('ReadAsset', id);

    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);

    return result;
}

/**
 * submitTransaction() will throw an error containing details of any error responses from the smart contract.
 */
async function updateAsset(contract: Contract, asset: Asset): Promise<void>{
    console.log("update asset ", asset);
    try {
        await contract.submitTransaction(
            'UpdateAsset',
            asset.ID,
            asset.Name,
            asset.Img,
            asset.Vote.toString()
        );
    } catch (error) {
        console.log(error);
    }
}


async function displayInputParameters(): Promise<void> {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certPath:          ${certPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}