# k6 Performance Tests: SmartPeople Staging API

Load tests for the SmartPeople (SmartOffice) staging API at
`https://stagingv2api.smartoffice.ai/api/smart`, written for [k6](https://k6.io/).
A GitHub Actions workflow runs them on every push and pull request to `main`, nightly, and on demand. It builds an HTML report and emails the results.

## What the suite tests

| Script | What it does | Run in CI as |
| --- | --- | --- |
| `tests/auth-load-test.js` | Logs in each iteration, then calls `GET /auth/auth-user-info`. Tracks custom metrics `auth_response_time`, `auth_error_rate` and `auth_slow_requests` (responses over 2s). | Smoke Test |
| `tests/authUserinfotest.js` | Logs in each iteration, then calls `GET /auth/auth-user-info`. Tracks `auth_user_info_time` and `auth_user_info_error`. | Auth Test |
| `tests/employee_list.js` | Logs in once in `setup()`, then each VU hits the Permissions list, the Employee list and the Supervisor list. | Employee Test |
| `test` | Calls the company permissions endpoint using a pre-issued bearer token rather than a login. | Not run in CI |

## Load stages and thresholds

**`auth-load-test.js` and `authUserinfotest.js`**, about 3 minutes in total:

| Stage | Duration | Target VUs |
| --- | --- | --- |
| Ramp up | 30s | 10 |
| Ramp up | 1m | 50 |
| Peak | 1m | 100 |
| Ramp down | 30s | 0 |

Thresholds: p95 of the auth-user-info response time under 10s, custom error rate under 1%, and `http_req_failed` under 1%.

**`employee_list.js`**, about 2 minutes in total:

| Stage | Duration | Target VUs |
| --- | --- | --- |
| Ramp up | 30s | 2 |
| Hold | 1m | 5 |
| Ramp down | 30s | 0 |

Thresholds: p95 under 30s for each of `permissions`, `employee_list` and `supervisor_list`, and `http_req_failed` under 50%.

**`test`**: 30s → 5 VUs, 1m → 10 VUs, 30s → 0. Thresholds: p95 of `permissions` under 3s and `http_req_failed` under 5%.

## Credentials

No credentials are stored in this repo. The scripts read them from environment variables and stop with a clear error if any are missing:

| Variable | Used by |
| --- | --- |
| `K6_USERNAME` | login-based scripts in `tests/` |
| `K6_PASSWORD` | login-based scripts in `tests/` |
| `K6_TOKEN` | `test` (bearer token) |

## Running locally

Install k6 first; see the [k6 installation guide](https://grafana.com/docs/k6/latest/set-up/install-k6/). Then pass credentials with `-e`:

```bash
k6 run -e K6_USERNAME=you@example.com -e K6_PASSWORD='your-password' tests/authUserinfotest.js
```

You can also export them in your shell. k6 exposes system environment variables through `__ENV`:

```bash
export K6_USERNAME=you@example.com
export K6_PASSWORD='your-password'
k6 run tests/employee_list.js
```

On PowerShell:

```powershell
$env:K6_USERNAME = "you@example.com"
$env:K6_PASSWORD = "your-password"
k6 run tests/employee_list.js
```

To save raw results in the same format CI uses:

```bash
k6 run --out json=results/auth-result.json tests/authUserinfotest.js
```

`.env` files, `results/` and `*.json` are git-ignored, so local credentials and result dumps stay out of the repo.

## CI and reports

The workflow is `.github/workflows/k6.yml`. It runs on push and pull requests to `main`, daily at 18:00 UTC, and by manual dispatch.

1. **Smoke Test, Auth Test and Employee Test** run in parallel. Each installs k6 and runs one script with `--out json=reports/<name>-result.json`. Credentials come from the repository secrets `K6_USERNAME`, `K6_PASSWORD` and `K6_TOKEN`. These steps are `continue-on-error`, so a failed threshold doesn't block the reporting jobs. The raw JSON is uploaded as the artifacts `smoke-test-results`, `auth-test-results` and `employee-test-results`.
2. **Generate HTML Report** downloads the artifacts. It runs `.github/scripts/generate-html-report.js` on the auth test results to compute total requests, error rate, and avg/min/max/p95 duration. The result is uploaded as the artifact `html-report` (`report.html`).
3. **Send Email Report** emails `report.html` as an attachment through Gmail SMTP. The email includes a link to the workflow run and the Grafana dashboard. It needs the secrets `EMAIL_FROM`, `EMAIL_PASSWORD` (a Gmail app password) and `EMAIL_TO`.

To see a run's reports, open **Actions**, select the run, and download the artifacts at the bottom of the summary page.
