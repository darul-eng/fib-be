/**
 * Seed kategori awal SIAF (barang umum kantor fakultas) + atribut dinamisnya.
 * Jalankan: npm run seed   (atau: npx prisma db seed)
 *
 * Idempoten: aman dijalankan berulang (upsert per kategori & field).
 */
import { PrismaClient, FieldType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type FieldDef = {
  label: string;
  key: string;
  tipe: FieldType;
  wajib?: boolean;
  opsi?: string[];
};
type CategoryDef = {
  nama: string;
  deskripsi?: string;
  fields: FieldDef[];
};

const RAM = ['4 GB', '8 GB', '16 GB', '32 GB'];
const OS = ['Windows', 'Linux', 'macOS'];

const categories: CategoryDef[] = [
  {
    nama: 'Laptop',
    deskripsi: 'Komputer jinjing',
    fields: [
      { label: 'CPU', key: 'cpu', tipe: 'text' },
      { label: 'RAM', key: 'ram', tipe: 'select', opsi: RAM },
      { label: 'Storage', key: 'storage', tipe: 'text' },
      { label: 'Sistem Operasi', key: 'os', tipe: 'select', opsi: OS },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
      { label: 'Garansi Sampai', key: 'garansi_sampai', tipe: 'date' },
    ],
  },
  {
    nama: 'Komputer Desktop (PC)',
    fields: [
      { label: 'CPU', key: 'cpu', tipe: 'text' },
      { label: 'RAM', key: 'ram', tipe: 'select', opsi: RAM },
      { label: 'Storage', key: 'storage', tipe: 'text' },
      { label: 'Sistem Operasi', key: 'os', tipe: 'select', opsi: OS },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'Monitor',
    fields: [
      { label: 'Ukuran (inci)', key: 'ukuran_inci', tipe: 'number' },
      { label: 'Resolusi', key: 'resolusi', tipe: 'text' },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'Printer',
    fields: [
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Laser', 'Inkjet', 'Dot Matrix'] },
      { label: 'Berwarna', key: 'berwarna', tipe: 'boolean' },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'Scanner',
    fields: [
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Flatbed', 'ADF'] },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'Proyektor (LCD Projector)',
    fields: [
      { label: 'Lumens', key: 'lumens', tipe: 'number' },
      { label: 'Resolusi', key: 'resolusi', tipe: 'text' },
      { label: 'Jam Pakai Lampu', key: 'jam_pakai_lampu', tipe: 'number' },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'UPS / Stabilizer',
    fields: [
      { label: 'Kapasitas (VA)', key: 'kapasitas_va', tipe: 'number' },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'Perangkat Jaringan (Router/Switch)',
    fields: [
      { label: 'Merk', key: 'merk', tipe: 'text' },
      { label: 'Jumlah Port', key: 'jumlah_port', tipe: 'number' },
      { label: 'MAC Address', key: 'mac_address', tipe: 'text' },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'CCTV / Kamera Pengawas',
    fields: [
      { label: 'Resolusi', key: 'resolusi', tipe: 'text' },
      { label: 'Penempatan', key: 'penempatan', tipe: 'select', opsi: ['Indoor', 'Outdoor'] },
      { label: 'Nomor Seri', key: 'serial_number', tipe: 'text' },
    ],
  },
  {
    nama: 'AC (Pendingin Ruangan)',
    fields: [
      { label: 'Merk', key: 'merk', tipe: 'text' },
      { label: 'PK', key: 'pk', tipe: 'select', opsi: ['0.5', '1', '1.5', '2'] },
      { label: 'Tipe Freon', key: 'tipe_freon', tipe: 'text' },
    ],
  },
  {
    nama: 'Kipas Angin',
    fields: [
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Berdiri', 'Dinding', 'Plafon', 'Meja'] },
      { label: 'Merk', key: 'merk', tipe: 'text' },
    ],
  },
  {
    nama: 'Dispenser Air',
    fields: [
      { label: 'Merk', key: 'merk', tipe: 'text' },
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Galon Atas', 'Galon Bawah'] },
    ],
  },
  {
    nama: 'Meja',
    fields: [
      { label: 'Bahan', key: 'bahan', tipe: 'select', opsi: ['Kayu', 'Besi', 'Partikel'] },
      { label: 'Ukuran', key: 'ukuran', tipe: 'text' },
      { label: 'Warna', key: 'warna', tipe: 'text' },
    ],
  },
  {
    nama: 'Kursi',
    fields: [
      { label: 'Bahan', key: 'bahan', tipe: 'text' },
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Kerja', 'Tamu', 'Rapat'] },
      { label: 'Warna', key: 'warna', tipe: 'text' },
    ],
  },
  {
    nama: 'Lemari / Filing Cabinet',
    fields: [
      { label: 'Bahan', key: 'bahan', tipe: 'select', opsi: ['Kayu', 'Besi'] },
      { label: 'Jumlah Pintu/Laci', key: 'jumlah_pintu_laci', tipe: 'number' },
    ],
  },
  {
    nama: 'Rak Buku',
    fields: [
      { label: 'Bahan', key: 'bahan', tipe: 'text' },
      { label: 'Jumlah Tingkat', key: 'jumlah_tingkat', tipe: 'number' },
    ],
  },
  {
    nama: 'Whiteboard',
    fields: [{ label: 'Ukuran', key: 'ukuran', tipe: 'text' }],
  },
  {
    nama: 'Sofa',
    fields: [
      { label: 'Bahan', key: 'bahan', tipe: 'text' },
      { label: 'Jumlah Dudukan', key: 'jumlah_dudukan', tipe: 'number' },
    ],
  },
  {
    nama: 'Telepon',
    fields: [
      { label: 'Tipe', key: 'tipe', tipe: 'select', opsi: ['Analog', 'IP Phone'] },
      { label: 'Nomor Ekstensi', key: 'nomor_ekstensi', tipe: 'text' },
    ],
  },
  {
    nama: 'Sound System / Speaker',
    fields: [
      { label: 'Daya (Watt)', key: 'daya_watt', tipe: 'number' },
      { label: 'Tipe', key: 'tipe', tipe: 'text' },
    ],
  },
  {
    nama: 'Peralatan Lain-lain',
    deskripsi: 'Aset tanpa atribut khusus',
    fields: [],
  },
];

// Tema default (warna primer & warna lain-lain). Bisa diubah admin via API/menu Pengaturan.
const defaultTheme = {
  primary: '#059669',      // warna primer
  primaryDark: '#047857',  // header / area gelap
  accent: '#10B981',       // aksen
  ink: '#0F172A',          // teks utama
  muted: '#64748B',        // teks sekunder
  surface: '#FFFFFF',      // latar kartu
  tint: '#ECFDF5',         // latar lembut
  border: '#E2E8F0',       // garis
  danger: '#DC2626',       // error / bahaya
  bg: '#F8FAFC',           // latar halaman
};

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'admin12345';
  const nama = process.env.ADMIN_NAMA ?? 'Administrator';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`  Akun admin "${username}" sudah ada, lewati.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { nama, username, passwordHash, role: 'admin' },
  });
  console.log(`  ✓ Akun admin awal "${username}" dibuat.`);
}

async function main() {
  console.log('Seeding akun admin awal...');
  await seedAdmin();

  console.log('Seeding tema default...');
  await prisma.setting.upsert({
    where: { key: 'theme' },
    update: {}, // jangan timpa tema yang mungkin sudah diubah admin
    create: { key: 'theme', value: defaultTheme },
  });

  console.log('Seeding kategori awal...');
  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { nama: c.nama },
      update: { deskripsi: c.deskripsi ?? null },
      create: { nama: c.nama, deskripsi: c.deskripsi ?? null },
    });

    for (let i = 0; i < c.fields.length; i++) {
      const f = c.fields[i];
      await prisma.categoryField.upsert({
        where: { categoryId_key: { categoryId: category.id, key: f.key } },
        update: {
          label: f.label,
          tipe: f.tipe,
          wajib: f.wajib ?? false,
          opsi: f.opsi ?? undefined,
          urutan: i,
        },
        create: {
          categoryId: category.id,
          label: f.label,
          key: f.key,
          tipe: f.tipe,
          wajib: f.wajib ?? false,
          opsi: f.opsi ?? undefined,
          urutan: i,
        },
      });
    }
    console.log(`  ✓ ${c.nama} (${c.fields.length} field)`);
  }
  console.log(`Selesai. ${categories.length} kategori.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
