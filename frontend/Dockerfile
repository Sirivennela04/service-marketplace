# ── Frontend Dockerfile ──────────────────────────────────────────────────────
# Uses Node.js Express to serve the static HTML/CSS/JS frontend (No NGINX)
FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install express
COPY index.html styles.css app.js ./
RUN echo 'const express = require("express"); const app = express(); app.use(express.static(".")); app.listen(8080, () => console.log("Frontend on :8080"));' > server.js
EXPOSE 8080
CMD ["node", "server.js"]
