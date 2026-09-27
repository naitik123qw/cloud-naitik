const API = "";

let userId = localStorage.getItem("filevault_user_id");

if (!userId) {
  userId = crypto.randomUUID();

  localStorage.setItem(
    "filevault_user_id",
    userId
  );
}

async function loadFiles() {

  const response =
    await fetch(`${API}/api/files`);

  const files = await response.json();

  const container =
    document.getElementById("fileList");

  container.innerHTML = "";

  files.forEach(file => {

    const card =
      document.createElement("div");

    card.className = "file-card";

    card.innerHTML = `
      <div class="file-icon">
        ${getIcon(file.fileType)}
      </div>

      <h3>${escapeHTML(file.name)}</h3>

      <p>${formatBytes(file.size)}</p>

      <button
        onclick="requestAccess('${file.id}')">
        Request Access
      </button>
    `;

    container.appendChild(card);
  });
}

function getIcon(type) {

  if (type?.startsWith("image/")) {
    return "🖼️";
  }

  if (type?.startsWith("video/")) {
    return "🎬";
  }

  if (type?.startsWith("audio/")) {
    return "🎵";
  }

  if (type?.includes("pdf")) {
    return "📕";
  }

  return "📄";
}

async function requestAccess(fileId) {

  const response = await fetch(
    `/api/files/${fileId}/request`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        userId,
        userName: "Guest User"
      })
    }
  );

  const data = await response.json();

  alert(data.message || "Request sent");
}

async function loadAccessibleFiles() {

  const response =
    await fetch(`/api/access/${userId}`);

  const files = await response.json();

  const container =
    document.getElementById("savedFiles");

  if (!files.length) {
    container.innerHTML =
      "<p>No approved files yet.</p>";

    return;
  }

  container.innerHTML = "";

  files.forEach(file => {

    const div =
      document.createElement("div");

    div.className = "saved-file";

    div.innerHTML = `
      <strong>${escapeHTML(file.name)}</strong>

      <button onclick='saveFile(${JSON.stringify(file)})'>
        💾 Save to Device
      </button>
    `;

    container.appendChild(div);
  });
}
function openDatabase() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open("FileVaultDB", 1);

    request.onupgradeneeded = event => {

      const db = event.target.result;

      if (!db.objectStoreNames.contains("files")) {

        db.createObjectStore(
          "files",
          { keyPath: "id" }
        );

      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


async function saveFile(fileInfo) {
  try {
    const response = await fetch(fileInfo.url);

    if (!response.ok) {
      throw new Error("Could not download file");
    }

    const blob = await response.blob();

    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = blobUrl;
    link.download = fileInfo.name;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(blobUrl);

    // Store only file information in localStorage
    localStorage.setItem(
      `saved_${fileInfo.id}`,
      JSON.stringify({
        id: fileInfo.id,
        name: fileInfo.name,
        savedAt: new Date().toISOString()
      })
    );

    alert("File downloaded successfully ✅");

  } catch (error) {
    console.error(error);

    alert("Unable to download file ❌");
  }
}


async function getSavedFile(id) {

  const db =
    await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        ["files"],
        "readonly"
      );

    const request =
      transaction
        .objectStore("files")
        .get(id);

    request.onsuccess =
      () => resolve(request.result);

    request.onerror =
      () => reject(request.error);
  });
}


async function downloadSavedFile(id) {

  const file =
    await getSavedFile(id);

  if (!file) {

    alert("File not found");

    return;
  }

  const url =
    URL.createObjectURL(file.blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download = file.name;

  a.click();

  URL.revokeObjectURL(url);
}


function formatBytes(bytes) {

  if (!bytes) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    parseFloat(
      (bytes /
        Math.pow(1024, index))
        .toFixed(2)
    ) +
    " " +
    units[index]
  );
}


function escapeHTML(str) {

  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


loadFiles();
loadAccessibleFiles();