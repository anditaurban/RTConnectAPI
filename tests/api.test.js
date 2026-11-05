import http from 'http';
import app from '../src/app.js';
import pool from '../src/config/db.js';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let server;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

async function runTests() {
  console.log('--- Starting RTConnect API Test Suite ---');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    -> ${err.message}`);
      failed++;
    }
  };

  // Start test server
  await new Promise((resolve) => {
    server = http.createServer(app).listen(TEST_PORT, () => {
      console.log(`Test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  try {
    let wargaToken = '';
    let ketuaRtToken = '';
    let bendaharaToken = '';
    let refreshToken = '';

    // 1. Health Check
    await test('GET /health returns 200 and OK status', async () => {
      const res = await request('/health');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Expected success: true');
      assert(res.body.data.status === 'OK', 'Expected status: OK');
    });

    // 2. Auth - Invalid Login
    await test('POST /auth/login with invalid password returns 401', async () => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: 'warga@rtconnect.id', password: 'WrongPassword!' },
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(res.body.success === false, 'Expected success: false');
      assert(res.body.error.code === 'INVALID_CREDENTIALS', `Expected INVALID_CREDENTIALS, got ${res.body.error.code}`);
    });

    // 3. Auth - Valid Logins
    await test('POST /auth/login as Warga returns access and refresh tokens', async () => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: 'warga@rtconnect.id', password: 'Password123!' },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Expected success: true');
      assert(res.body.data.token, 'Expected JWT access token');
      assert(res.body.data.refreshToken, 'Expected JWT refresh token');
      assert(res.body.data.user.role === 'warga', 'Expected role: warga');
      wargaToken = res.body.data.token;
      refreshToken = res.body.data.refreshToken;
    });

    await test('POST /auth/login as Ketua RT returns 200', async () => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: 'ketua.rt01@rtconnect.id', password: 'Password123!' },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.user.role === 'ketua_rt', 'Expected role: ketua_rt');
      ketuaRtToken = res.body.data.token;
    });

    await test('POST /auth/login as Bendahara returns 200', async () => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: 'bendahara@rtconnect.id', password: 'Password123!' },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.user.role === 'bendahara', 'Expected role: bendahara');
      bendaharaToken = res.body.data.token;
    });

    // 4. Token Refresh
    await test('POST /auth/refresh returns new access token', async () => {
      const res = await request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.token, 'Expected new access token');
    });

    // 5. Profile /me
    await test('GET /me returns user profile', async () => {
      const res = await request('/me', {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.email === 'warga@rtconnect.id', 'Expected email to match');
      assert(res.body.data.nik, 'Expected NIK present in profile');
    });

    // 6. Role Protection Check (Warga cannot create resident)
    await test('POST /residents as Warga is rejected with 403 Forbidden', async () => {
      const res = await request('/residents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${wargaToken}` },
        body: {
          nik: '3171019999990001',
          name: 'Ilegal Citizen',
          gender: 'Laki-laki',
          birthPlace: 'Jakarta',
          birthDate: '1995-01-01',
          religion: 'Islam',
          job: 'Swasta',
          maritalStatus: 'Belum Kawin',
          familyRole: 'Anak',
          statusDomisili: 'Tetap',
          address: 'Jl. Mawar',
        },
      });
      assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
      assert(res.body.error.code === 'FORBIDDEN', `Expected FORBIDDEN, got ${res.body.error.code}`);
    });

    // 7. Validation Error Format Check
    await test('POST /residents with missing required fields returns 422 VALIDATION_ERROR', async () => {
      const res = await request('/residents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
        body: { name: 'A' },
      });
      assert(res.status === 422, `Expected 422, got ${res.status}`);
      assert(res.body.error.code === 'VALIDATION_ERROR', `Expected VALIDATION_ERROR, got ${res.body.error.code}`);
      assert(Array.isArray(res.body.error.details), 'Expected details array');
    });

    // 8. Regions
    await test('GET /regions returns accessible regions', async () => {
      const res = await request('/regions', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
      assert(res.body.data.items.length > 0, 'Expected non-empty regions');
    });

    // 9. Dashboard Summary
    await test('GET /dashboard/summary as Ketua RT returns stats', async () => {
      const res = await request('/dashboard/summary', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.body.data.totalWarga === 'number', 'Expected totalWarga number');
      assert(typeof res.body.data.kasSaldo === 'number', 'Expected kasSaldo number');
    });

    // 10. Residents & Families
    await test('GET /residents returns paginated residents list', async () => {
      const res = await request('/residents?page=1&limit=5', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.pagination.page === 1, 'Expected page: 1');
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    await test('GET /families returns list of Kartu Keluarga', async () => {
      const res = await request('/families', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    // 11. Letters Administration Workflow
    let newRequestId = '';
    await test('GET /letters/types returns catalog of letter types', async () => {
      const res = await request('/letters/types', {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.items.length >= 5, 'Expected 5 letter types');
    });

    await test('POST /letters/requests creates new letter application', async () => {
      const res = await request('/letters/requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${wargaToken}` },
        body: {
          letterTypeId: 'lt-01',
          purpose: 'Keperluan pendaftaran rekening tabungan pendidikan anak di bank BNI',
        },
      });
      assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
      assert(res.body.data.reference_no.startsWith('REQ/'), 'Expected REQ/ format reference number');
      assert(res.body.data.status === 'Diajukan', 'Expected status Diajukan');
      newRequestId = res.body.data.id;
    });

    await test('POST /letters/requests/:id/review approves letter with official number', async () => {
      const res = await request(`/letters/requests/${newRequestId}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
        body: {
          action: 'approve',
          notes: 'Dokumen dan identitas pemohon terverifikasi lengkap.',
        },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.status === 'Disetujui', `Expected status Disetujui, got ${res.body.data.status}`);
      assert(res.body.data.letter_number, 'Expected official letter_number generated');
    });

    await test('GET /letters/requests/:id/document returns letter document data', async () => {
      const res = await request(`/letters/requests/${newRequestId}/document`, {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.letter.id === newRequestId, 'Expected matching letter ID');
      assert(res.body.data.letterHeader, 'Expected letter header config');
    });

    // 12. Keuangan & Kas Transactions
    let createdTxId = '';
    await test('POST /finance/transactions records new cash out transaction', async () => {
      const res = await request('/finance/transactions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${bendaharaToken}` },
        body: {
          type: 'out',
          category: 'Kebersihan & Lingkungan',
          amount: 150000,
          description: 'Pembelian 10 buah sapu lidi dan kantong sampah untuk balai warga',
          date: '2026-08-15',
        },
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.data.type === 'out', 'Expected type out');
      assert(res.body.data.transaction_code.startsWith('TRX-'), 'Expected TRX- code');
      createdTxId = res.body.data.id;
    });

    await test('PATCH /finance/transactions/:id with action=void cancels transaction safely', async () => {
      const res = await request(`/finance/transactions/${createdTxId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${bendaharaToken}` },
        body: {
          action: 'void',
          voidReason: 'Salah input nominal nota pengeluaran.',
        },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      // Verify transaction is marked void and NOT deleted
      const checkRes = await request(`/finance/transactions/${createdTxId}`, {
        headers: { Authorization: `Bearer ${bendaharaToken}` },
      });
      assert(checkRes.body.data.status === 'void', 'Expected status to be void');
    });

    // 13. Dues & Payments Integrity
    await test('GET /dues/types returns dues types', async () => {
      const res = await request('/dues/types', {
        headers: { Authorization: `Bearer ${bendaharaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.items.length >= 4, 'Expected dues types');
    });

    await test('POST /dues/payments/:id/verify approves bill and logs kas masuk atomically', async () => {
      // Find a bill with Menunggu Verifikasi
      const billsRes = await request('/dues/bills?status=Menunggu%20Verifikasi', {
        headers: { Authorization: `Bearer ${bendaharaToken}` },
      });
      assert(billsRes.status === 200, 'Expected bills list');
      if (billsRes.body.data.items.length > 0) {
        const targetBill = billsRes.body.data.items[0];
        const res = await request(`/dues/payments/${targetBill.id}/verify`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${bendaharaToken}` },
          body: { action: 'approve', notes: 'Transfer BCA telah masuk ke rekening RT.' },
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        // Verify bill is now Lunas
        const updatedBill = await request(`/dues/bills/${targetBill.id}`, {
          headers: { Authorization: `Bearer ${bendaharaToken}` },
        });
        assert(updatedBill.body.data.status === 'Lunas', 'Expected bill status Lunas');

        // Verify a new cash transaction was automatically created
        const txRes = await request('/finance/transactions?category=Iuran%20Warga&limit=1', {
          headers: { Authorization: `Bearer ${bendaharaToken}` },
        });
        assert(txRes.body.data.items.length > 0, 'Expected automatically created cash transaction');
      }
    });

    // 14. Announcements, Complaints, Events, Assets
    await test('GET /announcements returns announcements', async () => {
      const res = await request('/announcements', {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    let newComplaintId = '';
    await test('POST /complaints allows citizen to report issues', async () => {
      const res = await request('/complaints', {
        method: 'POST',
        headers: { Authorization: `Bearer ${wargaToken}` },
        body: {
          title: 'Tumpukan dahan pohon menghalangi saluran drainase',
          category: 'Kebersihan & Lingkungan',
          location: 'Depan rumah Blok B2 No. 10',
          description: 'Sisa pemangkasan pohon oleh petugas PLN belum diangkut dan rawan menyumbat saat hujan.',
        },
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      newComplaintId = res.body.data.id;
    });

    await test('POST /complaints/:id/responses adds response from pengurus', async () => {
      const res = await request(`/complaints/${newComplaintId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
        body: {
          message: 'Laporan dicatat, petugas kebersihan akan segera mengangkut sore ini.',
        },
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('GET /events returns community schedule', async () => {
      const res = await request('/events', {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    await test('GET /assets returns community inventory', async () => {
      const res = await request('/assets', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    // 15. Settings & Notifications
    await test('GET /settings/region returns bank account and letter header', async () => {
      const res = await request('/settings/region', {
        headers: { Authorization: `Bearer ${ketuaRtToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.bank_account || res.body.data.letter_header, 'Expected settings keys');
    });

    await test('GET /notifications returns in-app alerts', async () => {
      const res = await request('/notifications', {
        headers: { Authorization: `Bearer ${wargaToken}` },
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Expected items array');
    });

    // 16. Audit Log Integrity Check
    await test('Audit logs contain records of critical mutations', async () => {
      const [logs] = await pool.execute(
        'SELECT COUNT(*) as count FROM audit_logs'
      );
      assert(Number(logs[0].count) > 0, 'Expected non-zero audit logs generated during tests');
    });

  } finally {
    // Shutdown server and pool
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    console.log('\n--- Test Summary ---');
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log('---------------------');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
