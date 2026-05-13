import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE = 'https://stagingv2api.smartoffice.ai/api/smart';

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'http_req_duration{name:permissions}':     ['p(95)<3000'],
    'http_req_duration{name:employee_list}':   ['p(95)<3000'],
    'http_req_duration{name:supervisor_list}': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
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
  check(res, { 'login 200': (r) => r.status === 200 });
  const token = res.json('data.token');
  if (!token) {
    throw new Error(`Login failed: ${res.status} | ${res.body.substring(0, 100)}`);
  }
  return { token };
}

export default function ({ token }) {
  const HEADERS = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Appcode': 'people',
  };

  // ── 1. PERMISSIONS ──
  group('Permissions Module', () => {
    const permRes = http.get(
      `${BASE}/core/company/permissions?page=1&per_page=10&order_direction=DESC&fields=title,module_name,role_count,emp_count,id,company_id,app_id,module_id,name,row_status`,
      { headers: HEADERS, tags: { name: 'permissions' } }
    );
    check(permRes, {
      'permissions 200': (r) => r.status === 200,
      'permissions 3s':  (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Permissions: ${permRes.status} | ${Math.round(permRes.timings.duration)}ms`);
    sleep(1);
  });

  // ── 2. EMPLOYEE LIST ──
  group('Employee Module', () => {
    const empRes = http.get(
      `${BASE}/core/employee?page=1&per_page=10&order_direction=DESC`,
      { headers: HEADERS, tags: { name: 'employee_list' } }
    );
    check(empRes, {
      'employee list 200': (r) => r.status === 200,
      'employee list 3s':  (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Employee List: ${empRes.status} | ${Math.round(empRes.timings.duration)}ms`);
    sleep(1);

    // ── 3. SUPERVISOR LIST (POST) ──
    const supervisorRes = http.post(
      `${BASE}/core/company/supervisor-list`,
      JSON.stringify({ page: 1, per_page: 10, order_direction: 'DESC' }),
      { headers: HEADERS, tags: { name: 'supervisor_list' } }
    );
    check(supervisorRes, {
      'supervisor list 200': (r) => r.status === 200,
      'supervisor list 3s':  (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Supervisor List: ${supervisorRes.status} | ${Math.round(supervisorRes.timings.duration)}ms`);
    sleep(1);
  });
}