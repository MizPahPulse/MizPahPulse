-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "transactionHash" TEXT NOT NULL,
    "ledgerSequence" BIGINT NOT NULL,
    "pagingToken" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "contractId" TEXT,
    "assetCode" TEXT,
    "assetIssuer" TEXT,
    "amount" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "hash" TEXT NOT NULL,
    "sourceAccount" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "operationCount" INTEGER NOT NULL,
    "memo" TEXT,
    "memoType" TEXT,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "resultCode" TEXT,
    "ledgerSequence" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "envelopeXdr" TEXT,
    "resultXdr" TEXT,
    "signatures" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "MonitoredWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "label" TEXT,
    "network" TEXT NOT NULL DEFAULT 'TESTNET',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredEvent" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoredEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '["read"]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelayMs" INTEGER NOT NULL DEFAULT 5000,
    "lastDeliveryAt" TIMESTAMP(3),
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusCode" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "response" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuer" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channels" JSONB NOT NULL DEFAULT '["websocket"]',
    "events" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_pagingToken_key" ON "Event"("pagingToken");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- CreateIndex
CREATE INDEX "Event_accountId_idx" ON "Event"("accountId");

-- CreateIndex
CREATE INDEX "Event_contractId_idx" ON "Event"("contractId");

-- CreateIndex
CREATE INDEX "Event_assetCode_assetIssuer_idx" ON "Event"("assetCode", "assetIssuer");

-- CreateIndex
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");

-- CreateIndex
CREATE INDEX "Event_transactionHash_idx" ON "Event"("transactionHash");

-- CreateIndex
CREATE INDEX "Event_ledgerSequence_idx" ON "Event"("ledgerSequence");

-- CreateIndex
CREATE INDEX "Event_pagingToken_idx" ON "Event"("pagingToken");

-- CreateIndex
CREATE INDEX "Transaction_sourceAccount_idx" ON "Transaction"("sourceAccount");

-- CreateIndex
CREATE INDEX "Transaction_ledgerSequence_idx" ON "Transaction"("ledgerSequence");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "MonitoredWallet_userId_idx" ON "MonitoredWallet"("userId");

-- CreateIndex
CREATE INDEX "MonitoredWallet_publicKey_idx" ON "MonitoredWallet"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredWallet_userId_publicKey_key" ON "MonitoredWallet"("userId", "publicKey");

-- CreateIndex
CREATE INDEX "MonitoredEvent_walletId_idx" ON "MonitoredEvent"("walletId");

-- CreateIndex
CREATE INDEX "MonitoredEvent_eventId_idx" ON "MonitoredEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredEvent_walletId_eventId_key" ON "MonitoredEvent"("walletId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "WebhookSubscription_userId_idx" ON "WebhookSubscription"("userId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_endpoint_idx" ON "WebhookSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "WebhookDelivery_subscriptionId_idx" ON "WebhookDelivery"("subscriptionId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "Asset_code_idx" ON "Asset"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_code_issuer_key" ON "Asset"("code", "issuer");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredEvent" ADD CONSTRAINT "MonitoredEvent_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MonitoredWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredEvent" ADD CONSTRAINT "MonitoredEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MonitoredWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

