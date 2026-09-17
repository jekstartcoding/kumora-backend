// Shared error types & mapping DB (PostgREST) errors ke response envelope.
import { fail } from './response';

export class ServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Map error Postgres/PostgREST ke ServiceError supaya pesan validation
// (NOT NULL, check, unique, kolom tidak dikenal) jelas, bukan 500 generik.
const PG_ERROR_MAP: Record<string, { status: number; code: string }> = {
  '23505': { status: 409, code: 'DUPLICATE' },        // unique violation (mis. slug)
  '23514': { status: 400, code: 'CHECK_VIOLATION' },  // check constraint
  '23503': { status: 400, code: 'FK_VIOLATION' },     // foreign key
  '22P02': { status: 400, code: 'INVALID_FORMAT' },   // invalid input syntax (mis. uuid)
  '42703': { status: 400, code: 'UNKNOWN_COLUMN' },   // undefined column
  PGRST204: { status: 400, code: 'UNKNOWN_FIELD' },   // kolom tidak dikenal schema cache
};

export function mapDbError(error: { code?: string; message: string }): ServiceError {
  const mapped = error.code ? PG_ERROR_MAP[error.code] : undefined;
  if (mapped) {
    return new ServiceError(mapped.status, mapped.code, error.message);
  }
  return new ServiceError(500, 'DB_ERROR', error.message);
}
