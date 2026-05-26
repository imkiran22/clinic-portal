type PgError = { code?: string; message?: string }

export function toUserError(e: unknown): string {
  const err = e as PgError
  const code = err?.code
  const msg = err?.message ?? ''

  if (code === 'P0001') return msg || 'Operation failed.'
  if (code === 'P0002') return 'Record not found.'
  if (code === '23505') {
    // The legacy_client_no unique index is the one staff hit most often
    // — they pick a number from their paper register and it's already
    // in use. Surface a clear, actionable message instead of the
    // generic "duplicate value".
    if (msg.includes('legacy_client_no')) {
      return 'That Client # is already in use — pick a different number.'
    }
    return 'Duplicate value — that record already exists.'
  }
  if (code === '23503') return 'Cannot delete — this record is referenced elsewhere.'
  if (code === '22023') return msg || 'Invalid input.'
  if (code === '42501') return 'Not authorized to perform this action.'
  if (code === '0A000') return 'This record cannot be modified after creation.'

  return msg || 'Something went wrong. Please try again.'
}
