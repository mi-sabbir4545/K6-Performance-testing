import http from 'k6/http';
import { check, sleep, group } from 'k6';

const TOKEN = '398286|iVcaoqGUmeEdaUfeQQ2R0DE1WkkGmI0dAqxP7y8T3931cadc';

const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Appcode': 'people',
};

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'http_req_duration{name:permissions}': ['p(95)<3000'],
    'http_req_duration{name:employee_list}': ['p(95)<3000'],
    'http_req_duration{name:supervisor_list}': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {

  // ── 1. PERMISSIONS ──
  group('Permissions Module', () => {
    const permRes = http.get(
      'https://stagingv2api.smartoffice.ai/api/smart/core/company/permissions?page=1&per_page=10&order_direction=DESC&fields=title,module_name,role_count,emp_count,id,company_id,app_id,module_id,name,row_status',
      { headers: HEADERS, tags: { name: 'permissions' } }
    );
    check(permRes, {
      'permissions 200': (r) => r.status === 200,
      'permissions 3s': (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Permissions: ${permRes.status} | ${Math.round(permRes.timings.duration)}ms`);
    sleep(1);
  });

  // ── 2. EMPLOYEE LIST ──
  group('Employee Module', () => {
    const empRes = http.get(
      'https://stagingv2api.smartoffice.ai/api/smart/core/employee?page=1&per_page=10&order_direction=DESC',
      { headers: HEADERS, tags: { name: 'employee_list' } }
    );
    check(empRes, {
      'employee list 200': (r) => r.status === 200,
      'employee list 3s': (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Employee List: ${empRes.status} | ${Math.round(empRes.timings.duration)}ms`);
    sleep(1);

    // ── 3. SUPERVISOR LIST (POST) ──
    const supervisorRes = http.post(
      'https://stagingv2api.smartoffice.ai/api/smart/core/company/supervisor-list',
      JSON.stringify({ page: 1, per_page: 10, order_direction: 'DESC' }),
      { headers: HEADERS, tags: { name: 'supervisor_list' } }
    );
    check(supervisorRes, {
      'supervisor list 200': (r) => r.status === 200,
      'supervisor list 3s': (r) => r.timings.duration < 3000,
    });
    if (__ITER === 0) console.log(`Supervisor List: ${supervisorRes.status} | ${Math.round(supervisorRes.timings.duration)}ms`);
    sleep(1);
  });

}