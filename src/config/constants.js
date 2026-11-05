export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  KETUA_RW: 'ketua_rw',
  KETUA_RT: 'ketua_rt',
  SEKRETARIS: 'sekretaris',
  BENDAHARA: 'bendahara',
  PETUGAS: 'petugas',
  WARGA: 'warga',
};

export const PENGURUS_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.KETUA_RW,
  ROLES.KETUA_RT,
  ROLES.SEKRETARIS,
  ROLES.BENDAHARA,
  ROLES.PETUGAS,
];

export const LETTER_STATUSES = {
  DRAFT: 'Draft',
  DIAJUKAN: 'Diajukan',
  PERLU_REVISI: 'Perlu Revisi',
  DIPROSES: 'Diproses',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  SELESAI: 'Selesai',
};

export const BILL_STATUSES = {
  BELUM_DIBAYAR: 'Belum Dibayar',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  LUNAS: 'Lunas',
  TERLAMBAT: 'Terlambat',
  DITOLAK: 'Ditolak',
  DIBATALKAN: 'Dibatalkan',
};

export const COMPLAINT_STATUSES = {
  BARU: 'Baru',
  DITINJAU: 'Ditinjau',
  DITINDAKLANJUTI: 'Ditindaklanjuti',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

