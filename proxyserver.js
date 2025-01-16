//
// This is not part of the uilicious-cli package.
// It's a standalone proxy for testing to see if the uilicious-cli is properly using the proxy.
// 
// How to use:
// 1. Run the server using `node proxyserver.js`
// 2. Run the cli, e.g. `https_proxy=http://localhost:8000 uilicious-cli project filelist --key <key> <projectName> --trace`
//

const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create an HTTP server that listens to requests on port 8000
const server = http.createServer((req, res) => {
  // Log the request URL
  console.log('Request URL:', req.url);

  // Forward the request to the target server
  proxy.web(req, res, { target: 'https://api.uilicious.com' });
});

// Listen on port 8000
server.listen(8000, () => {
  console.log('Proxy server is running on http://localhost:8000');
});