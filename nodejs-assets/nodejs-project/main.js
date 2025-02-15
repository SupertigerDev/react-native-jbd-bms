const http = require('http');
const rn_bridge = require('rn-bridge');
const fs = require('fs');
const path = require('path');

function send(json) {
  rn_bridge.channel.send(JSON.stringify(json));
}

let idIndex = 0;
function genId() {
  idIndex++;
  return idIndex;
}

/**
 * @type {Object.<number, [http.IncomingMessage, http.ServerResponse]>}
 */
let waitingRequests = {};

rn_bridge.channel.on('message', msg => {
  const {id, status, json} = JSON.parse(msg);
  const requestResponse = waitingRequests[id];
  if (!requestResponse) {
    return;
  }

  const [req, res] = requestResponse;

  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status || 200);
  res.end(JSON.stringify(json, null, 3));

  delete waitingRequests[id];
});

const server = new http.createServer((req, res) => {
  if (req.url === '/') {
    // send html
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8'));

    return;
  }
  if (req.url === '/chart.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.writeHead(200);
    res.end(fs.readFileSync(path.join(__dirname, 'chart.js'), 'utf-8'));

    return;
  }

  const id = genId();
  req.on('close', () => {
    delete waitingRequests[id];
  });

  waitingRequests[id] = [req, res];
  send({path: req.url, id});
});

server.listen({port: 12345, host: '0.0.0.0', reuseAddress: true}, () => {
  //send({test: "http://192.168.1.190:12345'"});
});
