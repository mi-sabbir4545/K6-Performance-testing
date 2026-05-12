import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Credentials ──
//const USERNAME = 'migration@byslglobal.com';
//const PASSWORD = '123!@#New';
const BASE = 'https://stagingv2api.smartoffice.ai/api/smart';

// ── Custom Metrics ──
const authTime    = new Trend('auth_response_time');
const authErrors  = new Rate('auth_error_rate');
const slowCount   = new Counter('auth_slow_requests');

// ── Load Pattern ──
export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ধীরে ধীরে 10 user
    { duration: '1m',  target: 50  },  // 50 user এ উঠাও
    { duration: '1m',  target: 100 },  // 100 user
    { duration: '30s', target: 0   },  // নামিয়ে আনো
  ],
  thresholds: {
    'auth_response_time':  ['p(95)<2000'],  // 95% request 2s এর মধ্যে
    'auth_error_rate':     ['rate<0.01'],   // error 1% এর কম
    'http_req_failed':     ['rate<0.01'],
  },
};

// ── Login করে token নাও ──
function getToken() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, { 'login 200': (r) => r.status === 200 });

  const token = res.json('data.token');
  if (!token) {
    console.error('❌ Login failed: ' + res.status);
    return null;
  }
  return token;
}

export default function () {

  // ── Step 1: Login ──
  const token = getToken();
  if (!token) return;

  const HEADERS = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Appcode':       'people',
  };

  sleep(0.5);

  // ── Step 2: Auth User Info ──
  group('Auth User Info Load Test', () => {
    const res = http.get(
      `${BASE}/auth/auth-user-info`,
      {
        headers: HEADERS,
        tags: { name: 'auth_user_info' },
      }
    );

    // Response check
    const passed = check(res, {
      'status 200':        (r) => r.status === 200,
      'response under 2s': (r) => r.timings.duration < 2000,
      'body not empty':    (r) => r.body.length > 0,
    });

    // Metrics record
    authTime.add(res.timings.duration);
    authErrors.add(res.status !== 200);

    if (res.timings.duration > 2000) {
      slowCount.add(1);
      console.warn(`🐌 SLOW: auth-user-info | ${Math.round(res.timings.duration)}ms`);
    } else {
      console.log(`✅ OK  : auth-user-info | ${res.status} | ${Math.round(res.timings.duration)}ms`);
    }
  });

  sleep(1);
}
