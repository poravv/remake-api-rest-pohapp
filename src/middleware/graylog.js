
const graylog2 = require('graylog2');

const graylogLogger = new graylog2.graylog({
  servers: [{ host: '172.20.0.4', port: 12201 }] // Replace the "host" per your Graylog domain
});

module.exports=graylogLogger;