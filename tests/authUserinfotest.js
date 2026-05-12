import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = 'https://stagingv2api.smartoffice.ai/api/smart';

const authTime  = new Trend('auth_user_info_time');
const authError = new Rate('auth_user_info_error');

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '1m',  target: 50  },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'auth_user_info_time':  ['p(95)<2000'],
    'auth_user_info_error': ['rate<0.01'],
    'http_req_failed':      ['rate<0.01'],
  },
};

export default function () {

  // ── Step 1: Login ──
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      username: 'migration@byslglobal.com',
      password: '123!@#New',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Appcode':      'people',
        'Origin':       'https://stagingv2.smartoffice.ai',
      },
    }
  );

  check(loginRes, {
    'login 200': (r) => r.status === 200,
  });

  const token = loginRes.json('data.token');

  if (!token) {
    console.error(`❌ Login failed | status: ${loginRes.status} | ${loginRes.body.substring(0,100)}`);
    return;
  }

  sleep(0.5);

  // ── Step 2: Auth User Info ──
  const infoRes = http.get(
    `${BASE}/auth/auth-user-info`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Appcode':       'people',
        'Origin':        'https://stagingv2.smartoffice.ai',
      },
      tags: { name: 'auth_user_info' },
    }
  );

  check(infoRes, {
    'auth-user-info 200':  (r) => r.status === 200,
    'response under 2s':   (r) => r.timings.duration < 2000,
    'body not empty':      (r) => r.body.length > 0,
  });

  authTime.add(infoRes.timings.duration);
  authError.add(infoRes.status !== 200);

  const icon = infoRes.timings.duration > 2000 ? '🐌 SLOW' : '✅ OK  ';
  console.log(`${icon} | auth-user-info | ${infoRes.status} | ${Math.round(infoRes.timings.duration)}ms`);

  sleep(1);
}