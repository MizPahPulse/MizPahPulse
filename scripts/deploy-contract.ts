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
  BASE_FEE,
  Horizon,
  Address,
  rpc,
  StrKey,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const WASM_PATH = resolve(__dirname, '../contracts/target/wasm32-unknown-unknown/release/pulse_contract.wasm');

async function simulateAndSend(
  tx: TransactionBuilder,
  signer: Keypair,
  sorobanRpc: rpc.Server,
  label: string,
) {
  console.log(`⏳ [${label}] Simulating...`);
  const sim = await sorobanRpc.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(signer);

  console.log(`⏳ [${label}] Sending...`);
  const sendResp = await sorobanRpc.sendTransaction(assembled);

  if (sendResp.status === 'ERROR') {
    throw new Error(`Send failed: ${sendResp.errorResultXdr}`);
  }

  console.log(`   Hash: ${sendResp.hash}`);

  // Wait for confirmation
  try {
    let getResp = await sorobanRpc.getTransaction(sendResp.hash);
    let attempts = 0;
    while (getResp.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise((r) => setTimeout(r, 3000));
      getResp = await sorobanRpc.getTransaction(sendResp.hash);
      attempts++;
    }

    if (getResp.status === 'FAILED') {
      throw new Error(`Transaction failed: ${getResp.resultXdr}`);
    }

    if (getResp.status === 'SUCCESS') {
      console.log(`   ✅ Confirmed (ledger ${(getResp as any).ledger})`);
    } else {
      console.log(`   ⚠️ Status: ${getResp.status} (tx may still have succeeded)`);
    }
  } catch (e: any) {
    if (e.message?.includes('Bad union switch')) {
      console.log('   ✅ Sent successfully (SDK parsing limitation for this tx type)');
    } else {
      throw e;
    }
  }
  return sendResp.hash;
}

async function deployContract() {
  const deployerSecret = process.env.DEPLOYER_SECRET;
  if (!deployerSecret) {
    console.error('❌ DEPLOYER_SECRET not set.');
    process.exit(1);
  }

  const deployerKeypair = Keypair.fromSecret(deployerSecret);
  const deployerPubKey = deployerKeypair.publicKey();
  console.log(`🔑 Deployer: ${deployerPubKey}`);

  let wasmBuffer: Buffer;
  try {
    wasmBuffer = readFileSync(WASM_PATH);
    console.log(`📦 WASM: ${(wasmBuffer.length / 1024).toFixed(1)} KB`);
  } catch {
    console.error(`❌ WASM not found at ${WASM_PATH}`);
    process.exit(1);
  }

  const wasmHash = crypto.createHash('sha256').update(wasmBuffer).digest();
  const salt = crypto.randomBytes(32);
  const deployerAddress = Address.fromString(deployerPubKey);
  const horizon = new Horizon.Server(HORIZON_URL);
  const sorobanRpc = new rpc.Server(SOROBAN_RPC_URL);

  try {
    // ── Step 1: Upload WASM ──────────────────
    let account = await horizon.loadAccount(deployerPubKey);
    const uploadTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.uploadContractWasm({ wasm: wasmBuffer }))
      .setTimeout(60)
      .build();

    const uploadHash = await simulateAndSend(uploadTx, deployerKeypair, sorobanRpc, 'Upload');

    // ── Step 2: Create Contract ──────────────
    account = await horizon.loadAccount(deployerPubKey);
    const createTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createCustomContract({ wasmHash, salt, address: deployerAddress }),
      )
      .setTimeout(60)
      .build();

    const createHash = await simulateAndSend(createTx, deployerKeypair, sorobanRpc, 'Create');

    // ── Derive Contract ID ──────────────────
    const hashIdPreimage = Buffer.from([0, 0, 0, 0]);
    const preimageData = Buffer.concat([hashIdPreimage, deployerAddress.toScAddress().toXDR('raw'), salt]);
    const contractHash = crypto.createHash('sha256').update(preimageData).digest();
    const contractId = StrKey.encodeContract(contractHash);

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🎉 PulseContract Deployed!');
    console.log(`  Upload Tx:   ${uploadHash}`);
    console.log(`  Create Tx:   ${createHash}`);
    console.log(`  Contract ID: ${contractId}`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log(`Set in .env: NEXT_PUBLIC_PULSE_CONTRACT_ID=${contractId}`);

    return { uploadHash, createHash, contractId };
  } catch (err) {
    console.error('❌ Deployment failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

deployContract();
