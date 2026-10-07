import type { Page } from 'playwright';

export type MockPaymentOutcome = 'SETTLED' | 'FAILED' | 'TIMEOUT';

const mockPaymentHtml = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NPP PayID Payment</title></head>
  <body>
    <main>
      <h1>PayID Payment</h1>
      <form id="payment-form">
        <label for="payid">PayID</label>
        <input id="payid" name="payid" type="text" value="utilities@example.test" required>
        <label for="amount">Amount</label>
        <input id="amount" name="amount" type="number" min="0.01" step="0.01" value="12.50" required>
        <button type="submit">Pay now</button>
      </form>
      <p id="payment-status" role="status" aria-live="polite"></p>
    </main>
    <script>
      document.querySelector('#payment-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const status = document.querySelector('#payment-status');
        status.textContent = 'Processing payment';
        try {
          const response = await fetch('/__mock-api/npp/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payid: document.querySelector('#payid').value,
              amount: Number(document.querySelector('#amount').value)
            })
          });
          const result = await response.json();
          const messages = {
            SETTLED: 'Payment settled successfully',
            FAILED: 'Payment failed. Please try again.',
            TIMEOUT: 'Payment timed out. Check your account before retrying.'
          };
          status.dataset.outcome = result.status;
          status.textContent = messages[result.status] || 'Unexpected payment response';
        } catch {
          status.dataset.outcome = 'ERROR';
          status.textContent = 'Payment service is unavailable';
        }
      });
    </script>
  </body>
</html>`;

export async function installPayIdMock(page: Page, outcome: MockPaymentOutcome): Promise<void> {
  await page.route('**/__test__/mock-payment/npp-payid', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: mockPaymentHtml })
  );
  await page.route('**/__mock-api/npp/payments', (route) => {
    const responseByOutcome: Record<MockPaymentOutcome, { status: number; body: object }> = {
      SETTLED: { status: 200, body: { status: 'SETTLED', paymentId: 'NPP-MOCK-1001' } },
      FAILED: { status: 422, body: { status: 'FAILED', code: 'PAYMENT_REJECTED' } },
      TIMEOUT: { status: 504, body: { status: 'TIMEOUT', code: 'PAYMENT_TIMEOUT' } }
    };
    const response = responseByOutcome[outcome];
    return route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body)
    });
  });
}
