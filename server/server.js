const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const ImageKit = require("@imagekit/nodejs");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 5000;

const DATA_DIR = path.join(__dirname, "data");
const FILE_DB = path.join(DATA_DIR, "files.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(FILE_DB)) {
  fs.writeFileSync(FILE_DB, "[]");
}

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

function readFiles() {
  return JSON.parse(fs.readFileSync(FILE_DB, "utf8"));
}

function saveFiles(files) {
  fs.writeFileSync(FILE_DB, JSON.stringify(files, null, 2));
}

// --------------------
// ADMIN LOGIN
// --------------------

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({
      success: true,
      message: "Login successful"
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
});

// --------------------
// IMAGEKIT AUTH
// --------------------

app.get("/api/imagekit-auth", (req, res) => {
  try {
    const authParams =
      imagekit.helper.getAuthenticationParameters();

    res.json({
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Could not generate ImageKit authentication"
    });
  }
});

// --------------------
// ADD FILE TO DATABASE
// --------------------

app.post("/api/files", (req, res) => {
  const {
    fileId,
    name,
    url,
    fileType,
    size
  } = req.body;

  if (!fileId || !name || !url) {
    return res.status(400).json({
      message: "Missing file information"
    });
  }

  const files = readFiles();

  const newFile = {
    id: fileId,
    name,
    url,
    fileType,
    size,
    createdAt: new Date().toISOString(),

    requests: []
  };

  files.push(newFile);

  saveFiles(files);

  res.json({
    success: true,
    file: newFile
  });
});

// --------------------
// GET ALL FILES
// --------------------

app.get("/api/files", (req, res) => {
  const files = readFiles();

  res.json(files);
});

// --------------------
// REQUEST ACCESS
// --------------------

app.post("/api/files/:id/request", (req, res) => {
  const { id } = req.params;

  const { userId, userName } = req.body;

  const files = readFiles();

  const file = files.find(f => f.id === id);

  if (!file) {
    return res.status(404).json({
      message: "File not found"
    });
  }

  const alreadyRequested = file.requests.find(
    r => r.userId === userId
  );

  if (alreadyRequested) {
    return res.json({
      message: "Request already exists"
    });
  }

  file.requests.push({
    userId,
    userName,
    status: "pending",
    requestedAt: new Date().toISOString()
  });

  saveFiles(files);

  res.json({
    success: true,
    message: "Access request sent"
  });
});

// --------------------
// GET USER ACCESS
// --------------------

app.get("/api/access/:userId", (req, res) => {
  const { userId } = req.params;

  const files = readFiles();

  const accessibleFiles = files.filter(file =>
    file.requests.some(
      request =>
        request.userId === userId &&
        request.status === "approved"
    )
  );

  res.json(accessibleFiles);
});

// --------------------
// ADMIN REQUESTS
// --------------------

app.get("/api/admin/requests", (req, res) => {
  const files = readFiles();

  const requests = [];

  files.forEach(file => {
    file.requests.forEach(request => {
      requests.push({
        fileId: file.id,
        fileName: file.name,
        ...request
      });
    });
  });

  res.json(requests);
});

// --------------------
// APPROVE / REJECT
// --------------------

app.post("/api/admin/request/:fileId/:userId", (req, res) => {
  const { fileId, userId } = req.params;
  const { action } = req.body;

  const files = readFiles();

  const file = files.find(f => f.id === fileId);

  if (!file) {
    return res.status(404).json({
      message: "File not found"
    });
  }

  const request = file.requests.find(
    r => r.userId === userId
  );

  if (!request) {
    return res.status(404).json({
      message: "Request not found"
    });
  }

  if (action === "approve") {
    request.status = "approved";
  }

  if (action === "reject") {
    request.status = "rejected";
  }

  saveFiles(files);

  res.json({
    success: true,
    status: request.status
  });
});

// --------------------
// DELETE FILE
// --------------------

app.delete("/api/files/:id", (req, res) => {
  const { id } = req.params;

  let files = readFiles();

  files = files.filter(file => file.id !== id);

  saveFiles(files);

  res.json({
    success: true
  });
});

// --------------------

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/admin.html")
  );
});

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/index.html")
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});