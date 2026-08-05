/**
 * Database seed script for development and testing.
 * Populates the database with representative sample data.
 *
 * Usage:
 *   npx tsx packages/database/prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const SAMPLE_ACCOUNTS = [
  'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'GHIJ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'GKLM1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'GNOP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
];

const SAMPLE_CONTRACTS = [
  'CA7G1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'CB3X1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'CD9Y1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
];

const EVENT_TYPES = [
  'PAYMENT',
  'CREATE_ACCOUNT',
  'SOROBAN_INVOKE',
  'DEX_TRADE',
  'NFT_TRANSFER',
  'TOKEN_TRANSFER',
  'LIQUIDITY_POOL_DEPOSIT',
  'MANAGE_BUY_OFFER',
  'CLAWBACK',
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.monitoredEvent.deleteMany();
  await prisma.event.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookSubscription.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.monitoredWallet.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notificationPreference.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // Seed assets
  const assets = [
    { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', type: 'CREDIT_ALPHANUM12' },
    { code: 'USDT', issuer: 'GCQTGZQQ5ANDQ6NGTRFNOCN4R5ZOIUM4JBF7AGVYMTEGFY6MOY5KY6CJ', type: 'CREDIT_ALPHANUM12' },
    { code: 'EURMTL', issuer: 'GACS6TAAA65RQCINSOWTR4WVKUCOP7HCC5HV7PXBJEW4MKIAICXPYJWX', type: 'CREDIT_ALPHANUM12' },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { code_issuer: { code: asset.code, issuer: asset.issuer } },
      update: asset,
      create: asset,
    });
  }
  console.log(`  ✓ Created ${assets.length} assets`);

  // Seed a webhook subscription
  const webhook = await prisma.webhookSubscription.create({
    data: {
      userId: 'demo-user',
      endpoint: 'https://example.com/webhooks/stellar',
      secret: `whsec_${uuidv4()}`,
      events: JSON.stringify(['PAYMENT', 'DEX_TRADE', 'SOROBAN_INVOKE']),
      isActive: true,
    },
  });
  console.log('  ✓ Created demo webhook subscription');

  // Seed events
  const now = new Date();
  const events = [];

  for (let i = 0; i < 50; i++) {
    const eventType = EVENT_TYPES[i % EVENT_TYPES.length] || 'PAYMENT';
    const accountId = SAMPLE_ACCOUNTS[i % SAMPLE_ACCOUNTS.length];
    const contractId = eventType === 'SOROBAN_INVOKE' ? SAMPLE_CONTRACTS[i % SAMPLE_CONTRACTS.length] : undefined;
    const timestamp = new Date(now.getTime() - i * 30_000);

    events.push({
      eventType,
      source: i < 30 ? 'HORIZON' : 'SOROBAN_RPC',
      category: eventType === 'PAYMENT' ? 'PAYMENT'
        : eventType === 'SOROBAN_INVOKE' ? 'CONTRACT'
        : eventType === 'DEX_TRADE' ? 'DEX'
        : eventType === 'NFT_TRANSFER' ? 'NFT'
        : eventType === 'TOKEN_TRANSFER' ? 'TOKEN'
        : 'ACCOUNT',
      transactionHash: `0x${uuidv4().replace(/-/g, '')}`,
      ledgerSequence: BigInt(5_000_000 + i),
      pagingToken: `paging-${uuidv4()}`,
      timestamp,
      accountId,
      contractId,
      assetCode: ['PAYMENT', 'TOKEN_TRANSFER'].includes(eventType) ? 'XLM' : undefined,
      amount: ['PAYMENT', 'TOKEN_TRANSFER'].includes(eventType) ? String(Math.floor(Math.random() * 1000) + 1) : undefined,
      payload: {
        type: eventType,
        source_account: accountId,
      },
      processedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  for (const event of events) {
    await prisma.event.create({ data: event });
  }
  console.log(`  ✓ Created ${events.length} events`);

  // Seed audit logs
  const auditActions = ['API_REQUEST', 'WEBHOOK_DELIVERY', 'WALLET_CONNECT', 'CONTRACT_INVOKE'];
  for (let i = 0; i < 20; i++) {
    await prisma.auditLog.create({
      data: {
        userId: 'demo-user',
        action: auditActions[i % auditActions.length] || 'API_REQUEST',
        resource: 'event',
        resourceId: uuidv4(),
        details: { seed: true, index: i },
        ipAddress: '127.0.0.1',
        userAgent: 'SeedScript/1.0',
        createdAt: new Date(now.getTime() - i * 60_000),
      },
    });
  }
  console.log('  ✓ Created 20 audit log entries');

  // Seed notification preferences
  await prisma.notificationPreference.create({
    data: {
      userId: 'demo-user',
      channels: JSON.stringify(['websocket', 'email']),
      events: JSON.stringify(['PAYMENT', 'SOROBAN_INVOKE', 'NFT_TRANSFER']),
      enabled: true,
    },
  });
  console.log('  ✓ Created notification preferences');

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
