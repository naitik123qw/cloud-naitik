let isAdmin = false;

async function login() {

  const username =
    document.getElementById("username").value;

  const password =
    document.getElementById("password").value;

  const response =
    await fetch("/api/admin/login", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        username,
        password
      })

    });

  const data =
    await response.json();

  if (!response.ok) {

    document.getElementById(
      "loginMessage"
    ).textContent = data.message;

    return;
  }

  isAdmin = true;

  document.getElementById(
    "loginSection"
  ).style.display = "none";

  document.getElementById(
    "dashboard"
  ).style.display = "block";

  loadRequests();

  loadAdminFiles();
}


async function uploadFile() {

  const input =
    document.getElementById("fileInput");

  const file =
    input.files[0];

  if (!file) {

    alert("Select a file first");

    return;
  }

  const status =
    document.getElementById("uploadStatus");

  status.textContent =
    "Getting upload authentication...";

  try {

    const authResponse =
      await fetch("/api/imagekit-auth");

    const auth =
      await authResponse.json();


    status.textContent =
      "Uploading...";


    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "fileName",
      file.name
    );

    formData.append(
      "publicKey",
      auth.publicKey
    );

    formData.append(
      "signature",
      auth.signature
    );

    formData.append(
      "expire",
      auth.expire
    );

    formData.append(
      "token",
      auth.token
    );

    formData.append(
      "folder",
      "/filevault"
    );


    const uploadResponse =
      await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "POST",
          body: formData
        }
      );


    const uploaded =
      await uploadResponse.json();


    if (!uploadResponse.ok) {

      throw new Error(
        uploaded.message ||
        "Upload failed"
      );
    }


    await fetch("/api/files", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        fileId: uploaded.fileId,

        name: uploaded.name,

        url: uploaded.url,

        fileType: file.type,

        size: file.size

      })
    });


    status.textContent =
      "Upload successful ✅";

    input.value = "";

    loadAdminFiles();

  } catch (error) {

    console.error(error);

    status.textContent =
      "Upload failed ❌";
  }
}


async function loadRequests() {

  const response =
    await fetch("/api/admin/requests");

  const requests =
    await response.json();

  const container =
    document.getElementById("requests");

  container.innerHTML = "";

  requests.forEach(request => {

    const div =
      document.createElement("div");

    div.className = "request-card";

    div.innerHTML = `

      <strong>
        ${escapeHTML(request.userName)}
      </strong>

      requested:

      <b>
        ${escapeHTML(request.fileName)}
      </b>

      <span>
        Status: ${request.status}
      </span>

      ${
        request.status === "pending"
          ? `
            <button
              onclick="handleRequest(
                '${request.fileId}',
                '${request.userId}',
                'approve'
              )">
              Approve
            </button>

            <button
              onclick="handleRequest(
                '${request.fileId}',
                '${request.userId}',
                'reject'
              )">
              Reject
            </button>
          `
          : ""
      }

    `;

    container.appendChild(div);
  });
}


async function handleRequest(
  fileId,
  userId,
  action
) {

  await fetch(
    `/api/admin/request/${fileId}/${userId}`,
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        action
      })

    }
  );

  loadRequests();
}


async function loadAdminFiles() {

  const response =
    await fetch("/api/files");

  const files =
    await response.json();

  const container =
    document.getElementById("adminFiles");

  container.innerHTML = "";

  files.forEach(file => {

    const div =
      document.createElement("div");

    div.className = "saved-file";

    div.innerHTML = `

      <strong>
        ${escapeHTML(file.name)}
      </strong>

      <button
        onclick="deleteFile('${file.id}')">
        Delete
      </button>

    `;

    container.appendChild(div);
  });
}


async function deleteFile(id) {

  if (!confirm("Delete this file?")) {
    return;
  }

  await fetch(
    `/api/files/${id}`,
    {
      method: "DELETE"
    }
  );

  loadAdminFiles();
}


function escapeHTML(str) {

  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}