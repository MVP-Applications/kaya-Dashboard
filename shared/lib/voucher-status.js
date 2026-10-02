/**
 * Voucher statuses — the values mirror kaya-nest-api's Prisma `VoucherStatus`
 * enum. The backend owns the lifecycle: which statuses exist, their order
 * and which moves are allowed come from GET /admin/voucher-requests/statuses
 * (and each request's `allowedNextStatuses`), never from here. This file
 * holds only what the UI needs to *say* about them, plus a copy of the flow
 * for preview mode, where there's no backend to ask.
 *
 * Backend source of truth: src/modules/voucher-requests/voucher-status.flow.ts
 */
export const VOUCHER_STATUS = {
  REQUESTED: 'REQUESTED',
  PAYMENT_LINK_SENT: 'PAYMENT_LINK_SENT',
  PAID: 'PAID',
  FULFILLED: 'FULFILLED',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
}

export const VOUCHER_STATUS_LABELS = {
  REQUESTED: 'Requested',
  PAYMENT_LINK_SENT: 'Payment link sent',
  PAID: 'Paid',
  FULFILLED: 'Voucher issued',
  REDEEMED: 'Redeemed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

/** What moving *to* a status means — shown in the confirm step. */
export const VOUCHER_STATUS_CONSEQUENCES = {
  PAYMENT_LINK_SENT: 'Confirms a payment link has been sent to the customer.',
  PAID: 'Confirms the payment has been received.',
  FULFILLED: 'Issues the voucher: a unique code and an expiry date are generated. This can’t be undone.',
  CANCELLED: 'Cancels the request. A cancelled voucher can’t be reopened.',
}

/** A readable label for any status value, including ones added later. */
export function voucherStatusLabel(status) {
  return VOUCHER_STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ').toLowerCase()
}

/**
 * Preview-mode copy of the backend flow (store-local only). Keep in step
 * with voucher-status.flow.ts.
 */
export const VOUCHER_STATUS_FLOW = [
  { status: 'REQUESTED', next: ['PAYMENT_LINK_SENT', 'CANCELLED'], final: false },
  { status: 'PAYMENT_LINK_SENT', next: ['PAID', 'CANCELLED'], final: false },
  { status: 'PAID', next: ['FULFILLED', 'CANCELLED'], final: false },
  { status: 'FULFILLED', next: [], final: false },
  { status: 'REDEEMED', next: [], final: true },
  { status: 'EXPIRED', next: [], final: true },
  { status: 'CANCELLED', next: [], final: true },
]
