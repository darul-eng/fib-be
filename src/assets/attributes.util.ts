import { BadRequestException } from '@nestjs/common';
import { CategoryField, FieldType } from '@prisma/client';

// Validasi & bersihkan attributes JSONB sesuai definisi CategoryField:
// - field wajib harus terisi
// - tipe dikoersi (number/boolean) & divalidasi (date/select)
// - key yang tidak terdefinisi di kategori dibuang (whitelist)
export function validateAttributes(
  fields: CategoryField[],
  input: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const raw = input ?? {};
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const value = raw[field.key];
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      if (field.wajib) {
        throw new BadRequestException(`Atribut "${field.label}" wajib diisi`);
      }
      continue;
    }

    result[field.key] = coerceValue(field, value);
  }

  return result;
}

function coerceValue(field: CategoryField, value: unknown): unknown {
  switch (field.tipe) {
    case FieldType.number: {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new BadRequestException(`Atribut "${field.label}" harus berupa angka`);
      }
      return num;
    }
    case FieldType.boolean:
      return value === true || value === 'true';
    case FieldType.date: {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException(`Atribut "${field.label}" harus berupa tanggal valid`);
      }
      return date.toISOString();
    }
    case FieldType.select: {
      const opsi = Array.isArray(field.opsi) ? (field.opsi as string[]) : [];
      if (opsi.length > 0 && !opsi.includes(String(value))) {
        throw new BadRequestException(`Atribut "${field.label}" harus salah satu dari: ${opsi.join(', ')}`);
      }
      return String(value);
    }
    case FieldType.text:
    default:
      return String(value);
  }
}
