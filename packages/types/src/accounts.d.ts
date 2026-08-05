import { z } from 'zod';
/**
 * User-monitored wallet configuration
 */
export declare const MonitoredWalletSchema: z.ZodObject<{
    id: z.ZodString;
    publicKey: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    network: z.ZodEnum<["PUBLIC", "TESTNET", "FUTURENET", "SANDBOX"]>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
} & {
    userId: z.ZodString;
    notificationEnabled: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lastSyncedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    publicKey: string;
    network: "PUBLIC" | "TESTNET" | "FUTURENET" | "SANDBOX";
    isActive: boolean;
    userId: string;
    notificationEnabled: boolean;
    tags: string[];
    label?: string | undefined;
    lastSyncedAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    publicKey: string;
    network: "PUBLIC" | "TESTNET" | "FUTURENET" | "SANDBOX";
    userId: string;
    label?: string | undefined;
    isActive?: boolean | undefined;
    notificationEnabled?: boolean | undefined;
    tags?: string[] | undefined;
    lastSyncedAt?: string | undefined;
}>;
export type MonitoredWallet = z.infer<typeof MonitoredWalletSchema>;
/**
 * Account activity summary
 */
export declare const AccountActivitySummarySchema: z.ZodObject<{
    accountId: z.ZodString;
    totalTransactions: z.ZodNumber;
    totalPaymentsReceived: z.ZodNumber;
    totalPaymentsSent: z.ZodNumber;
    totalContractInteractions: z.ZodNumber;
    firstActivity: z.ZodOptional<z.ZodString>;
    lastActivity: z.ZodOptional<z.ZodString>;
    balances: z.ZodArray<z.ZodObject<{
        assetCode: z.ZodString;
        assetIssuer: z.ZodOptional<z.ZodString>;
        balance: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        assetCode: string;
        balance: string;
        assetIssuer?: string | undefined;
    }, {
        assetCode: string;
        balance: string;
        assetIssuer?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    accountId: string;
    totalTransactions: number;
    totalPaymentsReceived: number;
    totalPaymentsSent: number;
    totalContractInteractions: number;
    balances: {
        assetCode: string;
        balance: string;
        assetIssuer?: string | undefined;
    }[];
    firstActivity?: string | undefined;
    lastActivity?: string | undefined;
}, {
    accountId: string;
    totalTransactions: number;
    totalPaymentsReceived: number;
    totalPaymentsSent: number;
    totalContractInteractions: number;
    balances: {
        assetCode: string;
        balance: string;
        assetIssuer?: string | undefined;
    }[];
    firstActivity?: string | undefined;
    lastActivity?: string | undefined;
}>;
export type AccountActivitySummary = z.infer<typeof AccountActivitySummarySchema>;
