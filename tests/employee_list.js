import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE = 'https://stagingv2api.smartoffice.ai/api/smart';

export const options = {
  stages: [
    { duration: '30s', target: 2 },
    { duration: '1m',  target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:permissions}':     ['p(95)<30000'],
    'http_req_duration{name:employee_list}':   ['p(95)<30000'],
    'http_req_duration{name:supervisor_list}': ['p(95)<30000'],
    'http_req_failed': ['rate<0.5'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      username: 'migration@byslglobal.com',
      password: '123!@#New',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Appcode': 'people',
        'Origin': 'https://stagingv2.smartoffice.ai',
      },
    }
  );

  const token = res.json('data.token');
  if (!token) {
    throw new Error(`Login failed: ${res.status} | ${res.body.substring(0, 200)}`);
  }
  console.log(`✅ Login ok, token: ${token.substring(0, 20)}...`);
  return { token };
}

export default function ({ token }) {
  const HEADERS = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Appcode': 'people',
    'Origin': 'https://stagingv2.smartoffice.ai',
  };

  group('Permissions Module', () => {
    const res = http.get(
      `${BASE}/core/company/permissions?page=1&per_page=10&order_direction=DESC`,
      { headers: HEADERS, tags: { name: 'permissions' } }
    );
    check(res, { 'permissions 200': (r) => r.status === 200 });
    if (__ITER === 0) console.log(`Permissions: ${res.status} | ${Math.round(res.timings.duration)}ms`);
    sleep(2);
  });

  group('Employee Module', () => {
    const res = http.get(
      `${BASE}/core/employee?page=1&per_page=10&order_direction=DESC`,
      { headers: HEADERS, tags: { name: 'employee_list' } }
    );
    check(res, { 'employee list 200': (r) => r.status === 200 });
    if (__ITER === 0) console.log(`Employee: ${res.status} | ${Math.round(res.timings.duration)}ms`);
    sleep(2);
  });

  group('Supervisor Module', () => {
    const res = http.post(
      `${BASE}/core/company/supervisor-list`,
      JSON.stringify({ page: 1, per_page: 10, order_direction: 'DESC' }),
      { headers: HEADERS, tags: { name: 'supervisor_list' } }
    );
    check(res, { 'supervisor list 200': (r) => r.status === 200 });
    if (__ITER === 0) console.log(`Supervisor: ${res.status} | ${Math.round(res.timings.duration)}ms`);
    sleep(2);
  });
}