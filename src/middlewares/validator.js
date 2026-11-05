import { errorResponse } from '../utils/response.js';

export const validate = (rules) => {
  return (req, res, next) => {
    const details = [];
    const source = req.method === 'GET' ? req.query : req.body;

    for (const [field, rule] of Object.entries(rules)) {
      const val = source[field];

      if (rule.required && (val === undefined || val === null || val === '')) {
        details.push({
          field,
          message: rule.message || `${field} wajib diisi.`,
        });
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (rule.type === 'number' && isNaN(Number(val))) {
          details.push({
            field,
            message: `${field} harus berupa angka.`,
          });
        }
        if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            details.push({
              field,
              message: `${field} harus berupa alamat email yang valid.`,
            });
          }
        }
        if (rule.enum && !rule.enum.includes(val)) {
          details.push({
            field,
            message: `${field} harus salah satu dari: ${rule.enum.join(', ')}.`,
          });
        }
        if (rule.minLength && String(val).length < rule.minLength) {
          details.push({
            field,
            message: `${field} minimal ${rule.minLength} karakter.`,
          });
        }
        if (rule.maxLength && String(val).length > rule.maxLength) {
          details.push({
            field,
            message: `${field} maksimal ${rule.maxLength} karakter.`,
          });
        }
      }
    }

    if (details.length > 0) {
      return errorResponse(res, 422, 'VALIDATION_ERROR', 'Periksa kembali data yang dikirim.', details);
    }

    next();
  };
};

