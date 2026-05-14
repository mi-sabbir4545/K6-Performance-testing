const fs = require('fs');
const path = require('path');

function generateHTMLReport(jsonFilePath, htmlOutputPath) {
  try {
    // JSON file পড়ো
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
    const lines = jsonData.trim().split('\n');

    // Initialize metrics
    const metrics = {
      totalRequests: 0,
      failedRequests: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      p95Duration: 0,
      errorRate: 0,
      timestamp: new Date().toISOString(),
    };

    const durations = [];

    // Parse JSON lines
    lines.forEach((line) => {
      if (!line.trim()) return;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'Point') {
          if (obj.metric === 'http_reqs') metrics.totalRequests++;
          if (obj.metric === 'http_req_failed' && obj.data.value > 0) metrics.failedRequests++;
          if (obj.metric === 'http_req_duration') {
            const duration = obj.data.value;
            durations.push(duration);
            metrics.avgDuration += duration;
            metrics.minDuration = Math.min(metrics.minDuration, duration);
            metrics.maxDuration = Math.max(metrics.maxDuration, duration);
          }
        }
      } catch (e) {}
    });

    if (durations.length > 0) {
      metrics.avgDuration = metrics.avgDuration / durations.length;
      durations.sort((a, b) => a - b);
      metrics.p95Duration = durations[Math.floor(durations.length * 0.95)];
      metrics.errorRate = (metrics.failedRequests / metrics.totalRequests * 100).toFixed(2);
    }

    const status = metrics.errorRate < 5 ? '✅ PASS' : '❌ FAIL';
    const statusColor = metrics.errorRate < 5 ? '#00ff9d' : '#ff4757';

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>k6 Performance Report</title>
  <style>
    :root {
      --bg:#080c14; --bg2:#0e1420; --border:#1e2d45; --cyan:#00e5ff;
      --green:#00ff9d; --red:#ff4757; --text:#e8f0fe; --text2:#8ba3c7;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:var(--bg); color:var(--text); font-family:Arial,sans-serif; }
    .container { max-width:1200px; margin:0 auto; padding:40px 20px; }
    .header { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:32px; margin-bottom:32px; }
    .header h1 { font-size:28px; margin-bottom:8px; }
    .status { display:inline-block; padding:4px 12px; border-radius:4px; background:${statusColor}22; color:${statusColor}; font-weight:bold; margin-left:12px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px; }
    .kpi { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:20px; border-top:3px solid ${statusColor}; }
    .kpi-label { font-size:11px; color:var(--text2); text-transform:uppercase; }
    .kpi-value { font-size:24px; font-weight:bold; color:${statusColor}; margin-top:8px; }
    .section { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:24px; margin-bottom:24px; }
    .section h2 { font-size:16px; color:var(--cyan); margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; }
    th { background:var(--bg); padding:10px; text-align:left; font-size:11px; color:var(--text2); border-bottom:1px solid var(--border); }
    td { padding:10px; border-bottom:1px solid var(--border); }
    .footer { text-align:center; padding:20px; color:var(--text2); border-top:1px solid var(--border); margin-top:32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>k6 Performance Report <span class="status">${status}</span></h1>
      <p style="color:var(--text2)">SmartPeople API Performance Testing</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Total Requests</div>
        <div class="kpi-value">${metrics.totalRequests}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Failed</div>
        <div class="kpi-value">${metrics.failedRequests}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Avg Response</div>
        <div class="kpi-value">${metrics.avgDuration.toFixed(0)}ms</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Error Rate</div>
        <div class="kpi-value">${metrics.errorRate}%</div>
      </div>
    </div>

    <div class="section">
      <h2>Performance Metrics</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Status</td><td><strong>${status}</strong></td></tr>
        <tr><td>Total Requests</td><td>${metrics.totalRequests}</td></tr>
        <tr><td>Failed Requests</td><td>${metrics.failedRequests}</td></tr>
        <tr><td>Error Rate</td><td>${metrics.errorRate}%</td></tr>
        <tr><td>Avg Response Time</td><td>${metrics.avgDuration.toFixed(0)}ms</td></tr>
        <tr><td>p95 Response Time</td><td>${metrics.p95Duration.toFixed(0)}ms</td></tr>
        <tr><td>Min Response Time</td><td>${metrics.minDuration.toFixed(0)}ms</td></tr>
        <tr><td>Max Response Time</td><td>${metrics.maxDuration.toFixed(0)}ms</td></tr>
        <tr><td>Generated At</td><td>${new Date(metrics.timestamp).toLocaleString()}</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>Generated by k6 Performance Testing Suite</p>
      <p>SmartPeople API Performance Monitoring</p>
    </div>
  </div>
</body>
</html>`;

    // Write file
    fs.writeFileSync(htmlOutputPath, html);
    console.log('✅ HTML Report Generated:', htmlOutputPath);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Command line থেকে call করা যায়
const inputFile = process.argv[2];
const outputFile = process.argv[3];
if (inputFile && outputFile) {
  generateHTMLReport(inputFile, outputFile);
}

module.exports = { generateHTMLReport };