/**
 * Deploy the PulseContract Soroban smart contract to Stellar Testnet.
 *
 * Prerequisites:
 *   1. Build the contract: `cd contracts && cargo build --target wasm32-unknown-unknown --release`
 *   2. Set DEPLOYER_SECRET in .env (a funded Testnet account secret key)
 *
 * Usage:
 *   DEPLOYER_SECRET=S... npx tsx scripts/deploy-contract.ts
 */

import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Server as HorizonServer,
  SorobanRpc,
  xdr,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-rpc.testnet.stellar.org';
const WASM_PATH = resolve(__dirname, '../contracts/target/wasm32-unknown-unknown/release/pulse_contract.wasm');

async function deployContract() {
  const deployerSecret = process.env.DEPLOYER_SECRET;
  if (!deployerSecret) {
    console.error('❌ DEPLOYER_SECRET not set in environment.');
    console.error('   Set it to a funded Testnet account secret key.');
    process.exit(1);
  }

  const deployerKeypair = Keypair.fromSecret(deployerSecret);
  const deployerPubKey = deployerKeypair.publicKey();
  console.log(`🔑 Deployer: ${deployerPubKey}`);

  // Load WASM
  let wasmBuffer: Buffer;
  try {
    wasmBuffer = readFileSync(WASM_PATH);
    console.log(`📦 WASM loaded: ${(wasmBuffer.length / 1024).toFixed(1)} KB`);
  } catch {
    console.error(`❌ WASM not found at ${WASM_PATH}`);
    console.error('   Build with: cd contracts && cargo build --target wasm32-unknown-unknown --release');
    process.exit(1);
  }

  const horizon = new HorizonServer(HORIZON_URL);
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

  try {
    // Load deployer account
    const sourceAccount = await horizon.loadAccount(deployerPubKey);
    console.log(`📊 Current sequence: ${sourceAccount.sequence}`);

    // Create the upload + deploy transaction
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.uploadContractWasm({ wasm: wasmBuffer }))
      .setTimeout(60)
      .build();

    // Sign and submit
    tx.sign(deployerKeypair);
    const uploadResult = await horizon.submitTransaction(tx);
    console.log(`✅ WASM uploaded: ${uploadResult.hash}`);

    // Wait for confirmation and extract the wasm hash
    // The WASM hash is needed to instantiate the contract
    console.log('⏳ Waiting for upload confirmation...');
    await new Promise((r) => setTimeout(r, 5000));

    // Deploy the contract by creating a contract instance
    // Build a create contract operation using the WASM hash from the upload
    console.log('⏳ Instantiating contract from uploaded WASM...');

    // Extract wasmId from the upload result
    const wasmId = uploadResult.hash;
    console.log(`   WASM ID: ${wasmId}`);

    // Reload account for the next transaction
    const updatedAccount = await horizon.loadAccount(deployerPubKey);

    // Create the contract
    const createTx = new TransactionBuilder(updatedAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.hostFunctionTypeCreateContract(
            xdr.ContractExecutable.contractExecutableWasm(wasmBuffer),
          ),
          auth: [],
        }),
      )
      .setTimeout(60)
      .build();

    createTx.sign(deployerKeypair);
    const deployResult = await horizon.submitTransaction(createTx);
    console.log(`✅ Contract deployed: ${deployResult.hash}`);
  } catch (err) {
    console.error('❌ Deployment failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

deployContract();
