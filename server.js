const http = require('http');
const https = require('https');
const fs = require('fs');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

const directoryToServe = './';
const serve = serveStatic(directoryToServe);

const httpPort = 8002;
http.createServer(function(req, res) {
    serve(req, res, finalhandler(req, res));
}).listen(httpPort, '0.0.0.0', () => {
    console.log(`HTTP server listening on port ${httpPort}`);
});

const httpsPort = 8003;
https.createServer(options, function(req, res) {
    serve(req, res, finalhandler(req, res));
}).listen(httpsPort, '0.0.0.0', () => {
    console.log(`HTTPS server listening on port ${httpsPort}`);
});
