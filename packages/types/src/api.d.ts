import { z } from 'zod';
/**
 * Standard API response wrapper
 */
export declare const ApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        version: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        version: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }>>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }>>;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        version: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }, {
        timestamp: string;
        version: string;
        requestId?: string | undefined;
    }>>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        timestamp: string;
        version: string;
        requestId?: string;
    };
};
/**
 * API key authentication
 */
export declare const ApiKeySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    key: z.ZodString;
    name: z.ZodString;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    lastUsedAt: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    isActive: boolean;
    userId: string;
    key: string;
    name: string;
    permissions: string[];
    lastUsedAt?: string | undefined;
    expiresAt?: string | undefined;
}, {
    id: string;
    createdAt: string;
    userId: string;
    key: string;
    name: string;
    isActive?: boolean | undefined;
    permissions?: string[] | undefined;
    lastUsedAt?: string | undefined;
    expiresAt?: string | undefined;
}>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
/**
 * SSE event sent to clients
 */
export declare const LiveEventSchema: z.ZodObject<{
    channel: z.ZodString;
    eventType: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    timestamp: z.ZodString;
    sequence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    eventType: string;
    timestamp: string;
    data: Record<string, unknown>;
    channel: string;
    sequence: number;
}, {
    eventType: string;
    timestamp: string;
    data: Record<string, unknown>;
    channel: string;
    sequence: number;
}>;
export type LiveEvent = z.infer<typeof LiveEventSchema>;
