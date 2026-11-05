export const successResponse = (res, data = {}, meta = {}, statusCode = 200) => {
  if (statusCode === 204) {
    return res.status(204).send();
  }
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
  });
};

export const errorResponse = (res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'Terjadi kesalahan pada server.', details = []) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [details],
    },
  });
};

export const listResponse = (res, items = [], pagination = {}, meta = {}) => {
  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page: Number(pagination.page) || 1,
        limit: Number(pagination.limit) || items.length,
        total: Number(pagination.total) || items.length,
        totalPages: Number(pagination.totalPages) || 1,
      },
    },
    meta: {
      ...meta,
      pagination: {
        page: Number(pagination.page) || 1,
        limit: Number(pagination.limit) || items.length,
        total: Number(pagination.total) || items.length,
        totalPages: Number(pagination.totalPages) || 1,
      },
    },
  });
};

