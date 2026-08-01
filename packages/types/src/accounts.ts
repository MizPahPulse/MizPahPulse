import { z } from 'zod';
import { WalletAccountSchema } from './stellar';

/**
 * User-monitored wallet configuration
 */
export const MonitoredWalletSchema = WalletAccountSchema.extend({
  userId: z.string(),
  notificationEnabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  lastSyncedAt: z.string().datetime().optional(),
});

export type MonitoredWallet = z.infer<typeof MonitoredWalletSchema>;

/**
 * Account activity summary
 */
export const AccountActivitySummarySchema = z.object({
  accountId: z.string(),
  totalTransactions: z.number().int().nonnegative(),
  totalPaymentsReceived: z.number().int().nonnegative(),
  totalPaymentsSent: z.number().int().nonnegative(),
  totalContractInteractions: z.number().int().nonnegative(),
  firstActivity: z.string().datetime().optional(),
  lastActivity: z.string().datetime().optional(),
  balances: z.array(
    z.object({
      assetCode: z.string(),
      assetIssuer: z.string().optional(),
      balance: z.string(),
    }),
  ),
});

export type AccountActivitySummary = z.infer<typeof AccountActivitySummarySchema>;
