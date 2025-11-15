import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { pool } from "./routes/pool.js";
import mbkauthe from "mbkauthe";
import { validateSessionAndRole } from "mbkauthe";
import { engine } from "express-handlebars";
import compression from "compression";
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
server.set('trust proxy', 1);

server.use(compression());

// Request timing middleware: logs method, url, status and elapsed ms
server.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const ms = diff[0] * 1000 + diff[1] / 1e6;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms.toFixed(3)} ms`);
  });
  next();
});

// Rate limiting: general limiter for typical browsing/API usage and a stricter
// limiter for dashboard (admin) routes.
const generalLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).render('error.handlebars', { message: 'Too many requests from your IP. Try again later.', code: 429 });
  }
});

server.use("/Assets", express.static(path.join(__dirname, "public/Assets"), {
  maxAge: "7d",
  setHeaders: (res, path) => {
    if (path.endsWith(".css")) {
      res.setHeader("Content-Type", "text/css");
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".svg")
    ) {
      res.setHeader("Cache-Control", "public, max-age=604800");
    } else {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  },
})
);

// Serve static sitemaps from public directory
server.use("/", express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".xml")) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  }
}));

server.use(express.json());
server.use(express.urlencoded({ extended: true }));


// Configure Handlebars (single setup)
server.engine("handlebars", engine({
  extname: ".handlebars",
  defaultLayout: "main",
  partialsDir: [
    path.join(__dirname, "views/templates"),
    path.join(__dirname, "views/templates/notice"),
    path.join(__dirname, "views"),
    path.join(__dirname, "views/partial"),
    path.join(__dirname, "node_modules/mbkauthe/views"),
  ],
  cache: process.env.NODE_ENV === "production",
  helpers: {
    formatDate: (date) => {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    },
    in: function (value, list) {
      if (!list || !Array.isArray(list)) return false;
      return list.includes(parseInt(value) || value);
    },
    trim: function (str) {
      return str ? str.trim() : '';
    },
    eq: function (a, b) {
      return a === b;
    },
    encodeURIComponent: function (str) {
      return encodeURIComponent(str);
    },
    formatTimestamp: function (timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    jsonStringify: function (context) {
      return JSON.stringify(context);
    },
    truncate: (str, len) => {
      if (!str) return '';
      if (str.length > len) {
        return str.substring(0, len) + '...';
      }
      return str;
    },
    section: function (name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    },
    getCanonicalUrl: function (req, path) {
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'blog.mbktechstudio.com';
      return `${protocol}://${host}${path}`;
    },
    index: function (array, idx) {
      return array ? array[idx] : null;
    },
    add: function (a, b) {
      return Number(a) + Number(b);
    },
    subtract: function (a, b) {
      return Number(a) - Number(b);
    },
    gt: function (a, b) {
      return Number(a) > Number(b);
    },
    gte: function (a, b) {
      return Number(a) >= Number(b);
    },
    lte: function (a, b) {
      return Number(a) <= Number(b);
    },
    and: function () {
      return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
    },
    or: function () {
      return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    },
    range: function (start, end) {
      const result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    }
  }
}));

server.set("view engine", "handlebars");
server.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "node_modules/mbkauthe/views"),
]);

server.use(mbkauthe);
server.use(generalLimiter);

server.get("/", async (req, res) => {
    return res.render("index.handlebars", {
        pagename: "Home",
        page: "/",
        userLoggedIn: !!req.session?.user
    });
});


// Favicon
server.get("/favicon.ico", (req, res) => {
    const svg = `
    <svg data-v-423bf9ae="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" class="iconAboveSlogan">
      <g data-v-423bf9ae="" id="8db2a7f9-6efc-4f7e-ae5b-8ba33875da43" transform="matrix(2.8125,0,0,2.8125,0,0)" stroke="none" fill="#88df95">
        <path d="M0 32h32V0H0v32zm19.377-19.492l6.936-6.936v20.855h-6.936V12.508zM5.688 5.572l6.936 6.936v13.919H5.688V5.572z"></path>
      </g>
    </svg>
  `;
    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);
});

// 404 handler
server.use((req, res) => {
    console.log(`Path not found: ${req.method} ${req.url}`);
    return res.status(404).render("Error/dError.handlebars", {
        layout: false,
        code: 404,
        error: "Not Found",
        message: "The requested page was not found.",
        pagename: "Home",
        page: "/",
    });
});

// Error handler
server.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).render("Error/dError.handlebars", {
        layout: false,
        code: 500,
        error: "Internal app Error",
        message: "An unexpected error occurred on the app.",
        details: err.message,
        pagename: "Home",
        page: "/",
    });
});

const port = process.env.PORT || 3004;
server.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default server;