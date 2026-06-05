import { Router, Request, Response } from "express";
import axios, { AxiosResponse } from "axios";

const router = Router();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchDriveDownload(id: string, range?: string): Promise<AxiosResponse> {
  const base = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  let resp = await axios.get(base, {
    responseType: "stream",
    headers: {
      "User-Agent": UA,
      ...(range ? { Range: range } : {}),
    },
    validateStatus: () => true,
  });

  // If content-type indicates HTML, it might be the interstitial page.
  const ct = String(resp.headers["content-type"] || "");
  if (ct.includes("text/html") || ct.includes("text/plain")) {
    // Read HTML to find confirm token
    const html = await axios
      .get(base, {
        responseType: "text",
        headers: { "User-Agent": UA },
        validateStatus: () => true,
      })
      .then((r) => String(r.data || ""))
      .catch(() => "");
    const m = html.match(/confirm=([a-zA-Z0-9\-_]+)/);
    const confirm = m ? m[1] : null;
    const setCookies = resp.headers["set-cookie"] || [];
    const cookieHeader = Array.isArray(setCookies) ? setCookies.map((c) => c.split(";")[0]).join("; ") : "";
    if (confirm) {
      const url = `${base}&confirm=${confirm}`;
      resp = await axios.get(url, {
        responseType: "stream",
        headers: {
          "User-Agent": UA,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(range ? { Range: range } : {}),
        },
        validateStatus: () => true,
      });
    }
  }
  return resp;
}

router.get("/drive/file/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ error: "Missing Google Drive file id" });
    }

    const range = req.headers.range ? String(req.headers.range) : undefined;
    const upstream = await fetchDriveDownload(id, range);

    const status = upstream.status;
    if (status >= 400) {
      return res.status(502).json({ error: "Failed to fetch from Google Drive" });
    }

    const headers = upstream.headers || {};
    const contentType = String(headers["content-type"] || "application/octet-stream");
    const contentLength = headers["content-length"];
    const acceptRanges = headers["accept-ranges"];
    const contentRange = headers["content-range"];

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", String(contentLength));
    if (acceptRanges) res.setHeader("Accept-Ranges", String(acceptRanges));
    if (contentRange) res.setHeader("Content-Range", String(contentRange));

    if (status === 206) {
      res.status(206);
    }

    upstream.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Proxy error" });
  }
});

export default router;
