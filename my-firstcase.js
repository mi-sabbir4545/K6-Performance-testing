import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Token এখানে দেওয়া আছে ──
const TOKEN = '398250|lkEN3LehGLejE8azoSxtK9XKsg01djIadFnLAvEv0db725c2';

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'http_req_duration{name:permissions}': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {

  const permRes = http.get(
    'https://stagingv2api.smartoffice.ai/api/smart/core/company/permissions?page=1&per_page=10&order_direction=DESC&fields=title,module_name,role_count,emp_count,id,company_id,app_id,module_id,name,row_status',
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept':        'application/json',
        'Appcode':       'people',
      },
      tags: { name: 'permissions' },
    }
  );

  check(permRes, {
    'permissions 200':      (r) => r.status === 200,
    'permissions 3s modhe': (r) => r.timings.duration < 3000,
  });

  if (__ITER === 0) {
    console.log('Status: ' + permRes.status);
    console.log('Time: '   + permRes.timings.duration + 'ms');
    console.log('Body: '   + permRes.body.substring(0, 200));
  }

  sleep(1);
}