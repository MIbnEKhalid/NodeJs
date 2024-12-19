import express from "express";
import path from "path";
import { fileURLToPath } from "url"; 

const app = express();
app.use(express.json()); // To parse JSON request bodies

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files 
app.use(
    "/Assets",
    express.static(path.join(__dirname, "public/Assets"), {
        setHeaders: (res, path) => {
            if (path.endsWith(".css")) {
                res.setHeader("Content-Type", "text/css");
            }
        },
    })
);  

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.use((req, res) => {
    console.log(`Path not found: ${req.url}`);
    res.sendFile(path.join(__dirname, "public/404.html"));
});

const port = 3000;

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});