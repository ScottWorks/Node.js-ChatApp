const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  mime = require('mime'),
  chatServer = require('./lib/chatServer');

var cache = {};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.write('Error 404: resource not found.');
  res.end();
}

function sendFile(res, filePath, fileContents) {
  res.writeHead(200, { 'content-type': mime.lookup(path.basename(filePath)) });
  res.end(fileContents);
}

// Serves file from cache and/ or adds file to cache
function serveStatic(res, cache, absPath) {
  if (cache[absPath]) {
    sendFile(res, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(res);
          } else {
            cache[absPath] = data;
            sendFile(res, absPath, data);
          }
        });
      } else {
        send404(res);
      }
    });
  }
}

var server = http.createServer(function(req, res) {
  var filePath = false;

  if (req.url === '/') {
    filePath = 'public/index.html';
  } else {
    filePath = `public${req.url}`;
  }

  var absPath = `./${filePath}`;
  serveStatic(res, cache, absPath);
});

chatServer.listen(server);

server.listen(3000, function() {
  console.log('Spun up on Port 3000');
});
