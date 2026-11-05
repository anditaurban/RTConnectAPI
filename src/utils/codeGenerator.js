export const generateReferenceNo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REQ/${year}/${month}/${random}`;
};

export const generateTransactionCode = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(100 + Math.random() * 900);
  return `TRX-${year}${month}-${random}`;
};

export const generateBillNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TAG-${year}${month}-${random}`;
};

export const generateLetterNumber = (rtCode = '01', rwCode = '05', seq = 1) => {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const now = new Date();
  const year = now.getFullYear();
  const romanMonth = romanMonths[now.getMonth()];
  const paddedSeq = String(seq).padStart(3, '0');
  return `470/${paddedSeq}/RT.${rtCode}-RW.${rwCode}/${romanMonth}/${year}`;
};

