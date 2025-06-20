
const app = require('./app');
const http = require('http');


const PORT = process.env.PORT || 8080;
const server = http.createServer(app)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
