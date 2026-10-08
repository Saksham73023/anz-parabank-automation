import { createServer, type Server } from 'node:http';

export type PayIdOutcome = 'SETTLED' | 'FAILED' | 'TIMEOUT';
export type PayIdFlow = 'SUCCESS' | 'FAILURE' | 'TIMEOUT';

export interface PayIdMockResponse {
  status: PayIdOutcome;
  paymentId?: string;
  code?: string;
}

export interface PayIdSimulation {
  response: PayIdMockResponse;
  flow: PayIdFlow;
  message: string;
}

export interface PayIdMockServer {
  server: Server;
  url: string;
}

const MOCK_RESPONSES: Record<PayIdOutcome, PayIdMockResponse> = {
  SETTLED: { status: 'SETTLED', paymentId: 'PAYID-MOCK-1001' },
  FAILED: { status: 'FAILED', code: 'PAYMENT_REJECTED' },
  TIMEOUT: { status: 'TIMEOUT', code: 'PAYMENT_TIMEOUT' }
};

const PAYMENT_FLOWS: Record<PayIdOutcome, { flow: PayIdFlow; message: string }> = {
  SETTLED: { flow: 'SUCCESS', message: 'Payment settled successfully' },
  FAILED: { flow: 'FAILURE', message: 'Payment failed. Please try again.' },
  TIMEOUT: { flow: 'TIMEOUT', message: 'Payment timed out. Check your account before retrying.' }
};

const HTTP_STATUS: Record<PayIdOutcome, number> = {
  SETTLED: 200,
  FAILED: 422,
  TIMEOUT: 504
};

/** Builds the deterministic API response returned for a simulated PayID outcome. */
export function mockPayIdPayment(outcome: PayIdOutcome): PayIdSimulation {
  return {
    response: { ...MOCK_RESPONSES[outcome] },
    ...PAYMENT_FLOWS[outcome]
  };
}

/** Maps each simulated payment outcome to its representative HTTP response status. */
export function payIdHttpStatus(outcome: PayIdOutcome): number {
  return HTTP_STATUS[outcome];
}

/** Starts a scenario-local HTTP server that provides the mocked PayID payment API. */
export async function startPayIdMockServer(outcome: PayIdOutcome): Promise<PayIdMockServer> {
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/payments') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Not found' }));
      return;
    }

    void readPaymentRequest(request)
      .then((isValid) => {
        if (!isValid) {
          response.writeHead(400, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ message: 'A PayID and positive amount are required.' }));
          return;
        }

        response.writeHead(payIdHttpStatus(outcome), { 'content-type': 'application/json' });
        response.end(JSON.stringify(mockPayIdPayment(outcome)));
      })
      .catch((error: unknown) => {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          message: error instanceof Error ? error.message : 'Invalid payment request.'
        }));
      });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', onError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await closePayIdMockServer(server);
    throw new Error('The PayID mock API server did not bind to a TCP port.');
  }

  return { server, url: `http://127.0.0.1:${address.port}/api/payments` };
}

/** Shuts down the scenario-local mock API server and surfaces close errors. */
export function closePayIdMockServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function readPaymentRequest(request: AsyncIterable<Buffer>): Promise<boolean> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    return false;
  }
  if (typeof payload !== 'object' || payload === null || !('payId' in payload) || !('amount' in payload)) {
    return false;
  }
  return typeof payload.payId === 'string' && payload.payId.trim().length > 0 &&
    typeof payload.amount === 'number' && Number.isFinite(payload.amount) && payload.amount > 0;
}
