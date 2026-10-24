import crypto from 'crypto';
import { env } from '../config/env.js';

export interface ChapaInitializeParams {
  amount: number;
  currency?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  txRef: string;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface ChapaInitializeResult {
  status: string;
  message: string;
  checkoutUrl: string;
}

export interface ChapaVerifyResult {
  status: string;
  message: string;
  data: {
    status: 'success' | 'failed' | 'pending';
    txRef: string;
    amount: number;
    currency: string;
    reference?: string;
    paymentMethod?: string;
  };
}

export class ChapaClient {
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(
    secretKey = env.CHAPA_SECRET_KEY,
    webhookSecret = env.CHAPA_WEBHOOK_SECRET,
    baseUrl = env.CHAPA_BASE_URL,
  ) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
    this.baseUrl = baseUrl;
  }

  /**
   * Initializes a transaction on Chapa and returns the checkout URL.
   */
  async initialize(params: ChapaInitializeParams): Promise<ChapaInitializeResult> {
    // If in test or dev mock mode without valid live key
    if (this.secretKey === 'dev_chapa_secret_key' || env.NODE_ENV === 'test') {
      return {
        status: 'success',
        message: 'Mock hosted link generated',
        checkoutUrl: `https://checkout.chapa.co/checkout/web/payment/mock-${params.txRef}`,
      };
    }

    const payload = {
      amount: params.amount.toString(),
      currency: params.currency || 'ETB',
      email: params.email,
      first_name: params.firstName || 'Customer',
      last_name: params.lastName || '',
      tx_ref: params.txRef,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
    };

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as any;
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to initialize Chapa transaction');
    }

    return {
      status: data.status,
      message: data.message,
      checkoutUrl: data.data.checkout_url,
    };
  }

  /**
   * Verifies a transaction with Chapa given its txRef.
   */
  async verify(txRef: string): Promise<ChapaVerifyResult> {
    if (this.secretKey === 'dev_chapa_secret_key' || env.NODE_ENV === 'test') {
      return {
        status: 'success',
        message: 'Mock payment verified',
        data: {
          status: 'success',
          txRef,
          amount: 100,
          currency: 'ETB',
          reference: `chapa-ref-${txRef}`,
          paymentMethod: 'telebirr',
        },
      };
    }

    const res = await fetch(`${this.baseUrl}/transaction/verify/${txRef}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(data.message || 'Failed to verify transaction with Chapa');
    }

    return {
      status: data.status,
      message: data.message,
      data: {
        status: data.data?.status === 'success' ? 'success' : 'failed',
        txRef: data.data?.tx_ref || txRef,
        amount: Number(data.data?.amount || 0),
        currency: data.data?.currency || 'ETB',
        reference: data.data?.reference,
        paymentMethod: data.data?.method,
      },
    };
  }

  /**
   * Validates Chapa webhook HMAC SHA256 signature against the raw payload body.
   */
  verifyWebhookSignature(signature: string | undefined, rawBody: string | Buffer): boolean {
    if (!signature) return false;

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const computedHash = hmac.update(rawBody).digest('hex');

      const sigBuffer = Buffer.from(signature, 'hex');
      const compBuffer = Buffer.from(computedHash, 'hex');

      if (sigBuffer.length !== compBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, compBuffer);
    } catch {
      return false;
    }
  }
}

export const chapaClient = new ChapaClient();
