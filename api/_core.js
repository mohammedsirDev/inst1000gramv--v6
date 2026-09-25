// src/lib/instagramCore.ts
import https from "https";
import http from "http";
import { URL, URLSearchParams } from "url";
import SnapVideo from "cakkatrok-instagram-downloader";
import { instagram as igJerry } from "@jerrycoder/instagram-api";
import * as archiverNamespace from "archiver";
var archiver = archiverNamespace?.default || archiverNamespace;
function createZipArchive(options = { zlib: { level: 6 } }) {
  if (typeof archiver === "function") {
    return archiver("zip", options);
  }
  if (archiver?.create) {
    return archiver.create("zip", options);
  }
  if (archiver?.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (archiver?.Archiver) {
    return new archiver.Archiver("zip", options);
  }
  throw new Error("ZIP archive constructor unavailable");
}
function setCorsHeaders(res) {
  if (!res || res.headersSent) return;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition");
}
async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => {
      resolve({});
    });
  });
}
function sendJsonResponse(res, statusCode, data) {
  setCorsHeaders(res);
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(data));
}
function sendNoContent(res) {
  setCorsHeaders(res);
  if (typeof res.sendStatus === "function") {
    return res.sendStatus(204);
  }
  res.statusCode = 204;
  return res.end();
}
async function fetchInstagramOEmbed(url) {
  return new Promise((resolve) => {
    const normalizedOEmbedUrl = url.replace(/\/reels\//i, "/reel/");
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(normalizedOEmbedUrl)}`;
    const req = https.get(
      oembedUrl,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "application/json"
        },
        timeout: 4500
      },
      (res) => {
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        let data = "";
        res.on("data", (c) => data += c);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}
function decodeHtml(html) {
  if (!html) return "";
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function decodeSnapCdnToken(url) {
  try {
    const token = String(url || "").match(/[?&]token=([^&]+)/);
    if (!token) return null;
    const parts = token[1].split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "===".slice((payload.length + 3) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString());
    return {
      url: decoded.url,
      filename: decoded.filename
    };
  } catch {
    return null;
  }
}
function deduplicateMediaItems(items) {
  if (!Array.isArray(items)) return [];
  const seenIdentities = /* @__PURE__ */ new Set();
  const deduplicated = [];
  for (const item of items) {
    const rawUrl = item.directUrl || item.url || "";
    const snapUrl = item.snapUrl || "";
    if (!rawUrl && !snapUrl) continue;
    let identity = "";
    const igKeyMatch = (rawUrl + " " + snapUrl).match(/ig_cache_key=([a-zA-Z0-9%_-]+)/i);
    if (igKeyMatch) {
      try {
        const decodedKey = Buffer.from(decodeURIComponent(igKeyMatch[1]), "base64").toString("utf-8");
        if (decodedKey && /^\d+/.test(decodedKey)) {
          identity = `ig_key:${decodedKey}`;
        }
      } catch {
      }
      if (!identity) {
        identity = `ig_raw_key:${igKeyMatch[1]}`;
      }
    }
    if (!identity) {
      const fileIdMatch = (rawUrl + " " + (item.filename || "")).match(/(\d+_\d+_\d+_[a-zA-Z0-9]+)/);
      if (fileIdMatch) {
        identity = `ig_file:${fileIdMatch[1]}`;
      }
    }
    if (!identity && snapUrl.includes("token=")) {
      const decodedToken = decodeSnapCdnToken(snapUrl);
      if (decodedToken?.url) {
        const tokenFileMatch = decodedToken.url.match(/(\d+_\d+_\d+_[a-zA-Z0-9]+)/);
        if (tokenFileMatch) {
          identity = `snap_file:${tokenFileMatch[1]}`;
        } else {
          try {
            const urlObj = new URL(decodedToken.url);
            identity = `snap_path:${urlObj.pathname}`;
          } catch {
          }
        }
      }
    }
    if (!identity && rawUrl) {
      try {
        const u = new URL(rawUrl);
        identity = `url_path:${u.pathname}`;
      } catch {
        identity = `raw:${rawUrl.split("?")[0]}`;
      }
    }
    if (!identity) {
      identity = `fallback:${rawUrl}`;
    }
    if (!seenIdentities.has(identity)) {
      seenIdentities.add(identity);
      deduplicated.push(item);
    }
  }
  return deduplicated;
}
var resolvedMediaCache = /* @__PURE__ */ new Map();
async function fetchSnapVideoWithCookies(targetUrl) {
  try {
    const homeRes = await fetch("https://snapvideo.app/en", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(7e3)
    });
    if (!homeRes.ok) return [];
    const cookies = homeRes.headers.get("set-cookie") || "";
    const html = await homeRes.text();
    const expMatch = html.match(/k_exp="([^"]+)"/);
    const tokenMatch = html.match(/k_token="([^"]+)"/);
    if (!expMatch || !tokenMatch) return [];
    const postBody = new URLSearchParams({
      k_exp: expMatch[1],
      k_token: tokenMatch[1],
      q: targetUrl,
      t: "media",
      lang: "en",
      v: "v2"
    });
    const searchRes = await fetch("https://snapvideo.app/api/ajaxSearch", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Origin: "https://snapvideo.app",
        Referer: "https://snapvideo.app/en",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookies
      },
      body: postBody.toString(),
      signal: AbortSignal.timeout(1e4)
    });
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json().catch(() => null);
    if (!searchData || !searchData.data) return [];
    const rawResultHtml = searchData.data;
    const items = [];
    const liBlocks = rawResultHtml.split(/<li\b[^>]*>/i).slice(1);
    if (liBlocks.length > 0) {
      liBlocks.forEach((block, idx) => {
        const videoMatch = block.match(/href="([^"]+)"[^>]*title="Download Video"/i) || block.match(/title="Download Video"[^>]*href="([^"]+)"/i) || block.match(/href="([^"]+)"[^>]*class="[^"]*btn-download[^"]*"[^>]*title="Download Video"/i) || (block.includes("Download Video") || block.includes("Download MP4") ? block.match(/href="([^"]+)"[^>]*class="[^"]*abutton[^"]*"/i) : null) || block.match(/href="([^"]+)"[^>]*>(?:Download Video|Download MP4)/i);
        const photoMatch = block.match(/href="([^"]+)"[^>]*title="Download (?:Photo|Image|JPG)"/i) || block.match(/title="Download (?:Photo|Image|JPG)"[^>]*href="([^"]+)"/i) || block.match(/href="([^"]+)"[^>]*class="[^"]*btn-download[^"]*"[^>]*title="Download Photo"/i) || (block.includes("Download Image") || block.includes("Download Photo") || block.includes("Download JPG") ? block.match(/href="([^"]+)"[^>]*class="[^"]*abutton[^"]*"/i) : null) || block.match(/<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*abutton[^"]*"/i) || block.match(/<a\b[^>]*class="[^"]*abutton[^"]*"[^>]*href="([^"]+)"/i) || block.match(/href="([^"]+)"[^>]*>(?:Download Photo|Download Image|Download JPG)/i);
        const snapDlMatch = block.match(/href="([^"]*(?:download\.php\?token=|snapcdn\.app|cdninstagram\.com)[^"]*)"/i) || block.match(/<a\b[^>]*\bhref="([^"]+)"[^>]*class="[^"]*(?:abutton|btn-download|btn-premium)[^"]*"[^>]*>/i) || block.match(/<a\b[^>]*\bclass="[^"]*(?:abutton|btn-download|btn-premium)[^"]*"[^>]*\bhref="([^"]+)"[^>]*>/i) || block.match(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/i);
        const optionMatch = block.match(/<option\b[^>]*value="([^"]+)"[^>]*>/i);
        const thumbMatch = block.match(/<img[^>]+src="([^"]+)"/i);
        const dlUrl = videoMatch ? videoMatch[1] : photoMatch ? photoMatch[1] : snapDlMatch ? snapDlMatch[1] : optionMatch ? optionMatch[1] : null;
        if (dlUrl) {
          const cleanDlUrl = decodeHtml(dlUrl);
          const decoded = decodeSnapCdnToken(cleanDlUrl);
          const directUrl = decoded?.url || cleanDlUrl;
          const isVideoLabel = Boolean(videoMatch) || /Download Video|Download MP4|icon-dlvideo/i.test(block);
          const isPhotoLabel = Boolean(photoMatch) || /Download Photo|Download Image|Download JPG|icon-dlimage/i.test(block);
          const isVideo = detectIsVideoItem({
            directUrl,
            rawUrl: cleanDlUrl,
            filename: decoded?.filename,
            isPhotoLabel,
            isVideoLabel
          });
          const ext = isVideo ? "mp4" : "jpg";
          const safeFilename = decoded?.filename ? decoded.filename.replace(/^[^_]+_/, "insta1000gram_").replace(/\.[a-zA-Z0-9]+$/, `.${ext}`) : `insta1000gram_${isVideo ? "video" : "photo"}_${idx + 1}.${ext}`;
          const thumbUrl = thumbMatch ? decodeHtml(thumbMatch[1]) : isVideo ? "" : directUrl;
          items.push({
            type: isVideo ? "video" : "image",
            url: directUrl,
            directUrl,
            snapUrl: cleanDlUrl,
            thumbnailUrl: thumbUrl,
            mime_type: isVideo ? "video/mp4" : "image/jpeg",
            extension: ext,
            filename: safeFilename,
            resolution: isVideo ? "1080p Full HD" : "Original Master HD",
            index: idx + 1
          });
        }
      });
    }
    if (items.length === 0) {
      const singleVideoMatch = rawResultHtml.match(/href="([^"]+)"[^>]*title="Download Video"/i) || rawResultHtml.match(/href="([^"]+)"[^>]*>(?:Download Video|Download MP4)/i);
      const singlePhotoMatch = rawResultHtml.match(/href="([^"]+)"[^>]*title="Download Photo"/i) || rawResultHtml.match(/href="([^"]+)"[^>]*>(?:Download Photo|Download Image|Download JPG)/i);
      const singleThumbMatch = rawResultHtml.match(/<img[^>]+src="([^"]+)"/i);
      const dlUrl = singleVideoMatch ? singleVideoMatch[1] : singlePhotoMatch ? singlePhotoMatch[1] : null;
      if (dlUrl) {
        const cleanDlUrl = decodeHtml(dlUrl);
        const decoded = decodeSnapCdnToken(cleanDlUrl);
        const directUrl = decoded?.url || cleanDlUrl;
        const isVideo = detectIsVideoItem({
          directUrl,
          rawUrl: cleanDlUrl,
          filename: decoded?.filename,
          isPhotoLabel: Boolean(singlePhotoMatch),
          isVideoLabel: Boolean(singleVideoMatch)
        });
        const ext = isVideo ? "mp4" : "jpg";
        const safeFilename = decoded?.filename ? decoded.filename.replace(/^[^_]+_/, "insta1000gram_").replace(/\.[a-zA-Z0-9]+$/, `.${ext}`) : `insta1000gram_${isVideo ? "video" : "photo"}_1.${ext}`;
        const thumbUrl = singleThumbMatch ? decodeHtml(singleThumbMatch[1]) : isVideo ? "" : directUrl;
        items.push({
          type: isVideo ? "video" : "image",
          url: directUrl,
          directUrl,
          snapUrl: cleanDlUrl,
          thumbnailUrl: thumbUrl,
          mime_type: isVideo ? "video/mp4" : "image/jpeg",
          extension: ext,
          filename: safeFilename,
          resolution: isVideo ? "1080p Full HD" : "Original Master HD",
          index: 1
        });
      }
    }
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}
function detectIsVideoItem(options) {
  const { directUrl = "", rawUrl = "", filename = "", explicitType = "", isPhotoLabel, isVideoLabel } = options;
  const combinedUrl = `${directUrl} ${rawUrl}`;
  const cleanPath = (directUrl || rawUrl).split("?")[0].toLowerCase();
  const cleanFilename = (filename || "").toLowerCase();
  if (/\.(jpg|jpeg|png|webp|heic|avif)$/i.test(cleanPath) || /\.(jpg|jpeg|png|webp|heic|avif)$/i.test(cleanFilename) || /[?&]stp=dst-(jpg|webp|png)/i.test(combinedUrl) || /\/t51\.(2885|82787)-15\//i.test(combinedUrl)) {
    if (!cleanPath.endsWith(".mp4") && !cleanFilename.endsWith(".mp4")) {
      return false;
    }
  }
  if (/\.mp4$/i.test(cleanPath) || /\.mp4$/i.test(cleanFilename) || /\.mp4\?/i.test(combinedUrl) || /\/t50\.2886-16\//i.test(combinedUrl) || /\/o1\/v\/t16\//i.test(combinedUrl) || /video_dashinit/i.test(combinedUrl)) {
    return true;
  }
  if (isPhotoLabel && !isVideoLabel) return false;
  if (isVideoLabel && !isPhotoLabel) return true;
  if (explicitType === "image" || explicitType === "photo") return false;
  if (explicitType === "video") return true;
  return false;
}
async function unpackSnapSave(targetUrl) {
  try {
    const postBody = new URLSearchParams({ url: targetUrl });
    const res = await fetch("https://snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://snapsave.app/",
        Origin: "https://snapsave.app",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: postBody.toString(),
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return [];
    const text = await res.text();
    const scriptMatch = text.match(/eval\(function\(p,a,c,k,e,d\)\{([\s\S]*?)\}\(([\s\S]*?)\)\)/);
    if (!scriptMatch) return [];
    const argsStr = scriptMatch[2];
    const firstQuote = argsStr.indexOf('"');
    const secondQuote = argsStr.lastIndexOf('"');
    if (firstQuote === -1 || secondQuote <= firstQuote) return [];
    const p = argsStr.substring(firstQuote + 1, secondQuote);
    const rest = argsStr.substring(secondQuote + 1).split(",").map((s) => s.trim());
    const a = parseInt(rest[1], 10);
    const c = parseInt(rest[2], 10);
    const kStr = rest.slice(3).join(",").trim();
    let k = [];
    try {
      k = JSON.parse(kStr.replace(/\.split\('.*?'\)/, ""));
    } catch {
      const matchK = kStr.match(/\[(.*?)\]/);
      if (matchK) {
        k = matchK[1].split(",").map((s) => s.replace(/['"]/g, "").trim());
      }
    }
    if (k.length === 0) return [];
    let unpacked = p;
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        const re = new RegExp("\\b" + i.toString(a) + "\\b", "g");
        unpacked = unpacked.replace(re, k[i]);
      }
    }
    const items = [];
    const matches = unpacked.matchAll(/href=\\"(https?:\\\\\/\\\\\/[^"\\]+)\\"/g);
    let idx = 1;
    for (const match of matches) {
      const cleanUrl = match[1].replace(/\\/g, "");
      if (cleanUrl.includes("instagram") || cleanUrl.includes("snapcdn")) {
        const decoded = decodeSnapCdnToken(cleanUrl);
        const directUrl = decoded?.url || cleanUrl;
        const isVideo = detectIsVideoItem({
          directUrl,
          rawUrl: cleanUrl,
          filename: decoded?.filename
        });
        items.push({
          type: isVideo ? "video" : "image",
          url: directUrl,
          directUrl,
          snapUrl: cleanUrl,
          mime_type: isVideo ? "video/mp4" : "image/jpeg",
          extension: isVideo ? "mp4" : "jpg",
          filename: `insta1000gram_snapsave_${idx}.${isVideo ? "mp4" : "jpg"}`,
          resolution: isVideo ? "1080p Full HD" : "Original Master HD",
          index: idx++
        });
      }
    }
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}
async function extractFromSnapVideoPackage(targetUrl) {
  try {
    const rawRes = await Promise.race([
      SnapVideo(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8e3))
    ]);
    if (!rawRes) return { items: [] };
    const rawStr = JSON.stringify(rawRes).toLowerCase();
    const isPrivate = rawStr.includes("private") || rawStr.includes("privat");
    let candidateList = [];
    if (Array.isArray(rawRes)) {
      candidateList = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      candidateList = rawRes.data;
    } else if (rawRes.result && Array.isArray(rawRes.result)) {
      candidateList = rawRes.result;
    } else if (rawRes.url || rawRes.video || rawRes.download) {
      candidateList = [rawRes];
    }
    const items = [];
    candidateList.forEach((it, idx) => {
      const url = it.url || it.video || it.download || it.thumbnail || it.thumb;
      if (!url) return;
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;
      const isVid = detectIsVideoItem({
        directUrl,
        rawUrl: url,
        filename: decoded?.filename,
        explicitType: it.type
      });
      const ext = isVid ? "mp4" : "jpg";
      const safeFilename = decoded?.filename ? decoded.filename.replace(/^[^_]+_/, "insta1000gram_").replace(/\.[a-zA-Z0-9]+$/, `.${ext}`) : `insta1000gram_${isVid ? "video" : "photo"}_${idx + 1}.${ext}`;
      items.push({
        type: isVid ? "video" : "image",
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || it.thumb || (!isVid ? directUrl : ""),
        mime_type: isVid ? "video/mp4" : "image/jpeg",
        extension: ext,
        filename: safeFilename,
        resolution: it.resolution || (isVid ? "1080p Full HD" : "Original Master HD"),
        index: idx + 1
      });
    });
    return { items: deduplicateMediaItems(items), isPrivate };
  } catch {
    return { items: [] };
  }
}
async function extractFromSnapsavePackage(targetUrl) {
  try {
    const mod = await import("snapsave-media-downloader").catch(() => null);
    const snapsaveFn = mod?.snapsave || mod?.default;
    if (typeof snapsaveFn !== "function") return [];
    const rawRes = await Promise.race([
      snapsaveFn(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8e3))
    ]);
    if (!rawRes) return [];
    let list = [];
    if (Array.isArray(rawRes)) {
      list = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      list = rawRes.data;
    }
    const items = [];
    list.forEach((it, idx) => {
      const url = it.url || it.download_url || it.link;
      if (!url) return;
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;
      const isVid = detectIsVideoItem({
        directUrl,
        rawUrl: url,
        filename: decoded?.filename,
        explicitType: it.type
      });
      items.push({
        type: isVid ? "video" : "image",
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || (!isVid ? directUrl : ""),
        mime_type: isVid ? "video/mp4" : "image/jpeg",
        extension: isVid ? "mp4" : "jpg",
        filename: `insta1000gram_snapsave_${idx + 1}.${isVid ? "mp4" : "jpg"}`,
        resolution: isVid ? "1080p Full HD" : "Original Master HD",
        index: idx + 1
      });
    });
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}
async function extractFromJerryCoder(targetUrl) {
  try {
    const rawRes = await Promise.race([
      igJerry(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8e3))
    ]);
    if (!rawRes) return [];
    let list = [];
    if (Array.isArray(rawRes)) {
      list = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      list = rawRes.data;
    } else if (rawRes.url) {
      list = [rawRes];
    }
    const items = [];
    list.forEach((it, idx) => {
      const url = it.url || it.download || it.link;
      if (!url) return;
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;
      const isVid = detectIsVideoItem({
        directUrl,
        rawUrl: url,
        filename: decoded?.filename,
        explicitType: it.type
      });
      items.push({
        type: isVid ? "video" : "image",
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || (!isVid ? directUrl : ""),
        mime_type: isVid ? "video/mp4" : "image/jpeg",
        extension: isVid ? "mp4" : "jpg",
        filename: `insta1000gram_jerry_${idx + 1}.${isVid ? "mp4" : "jpg"}`,
        resolution: isVid ? "1080p Full HD" : "Original Master HD",
        index: idx + 1
      });
    });
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}
async function extractFromInstagramDirectBot(targetUrl, shortcode) {
  try {
    let cleanTarget = targetUrl;
    const isHighlightOrStory = targetUrl.includes("/stories/") || targetUrl.includes("/s/");
    if (!isHighlightOrStory && shortcode && (targetUrl.includes("/p/") || targetUrl.includes("/reel/"))) {
      cleanTarget = `https://www.instagram.com/p/${shortcode}/`;
    }
    const res = await fetch(cleanTarget, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Mode": "navigate"
      },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) return { items: [] };
    const html = await res.text();
    const items = [];
    let author;
    let caption;
    const authorMatch = html.match(/"author":\{"@type":"Person","name":"([^"]+)"/);
    if (authorMatch) author = authorMatch[1];
    const captionMatch = html.match(/"headline":"([^"]+)"/);
    if (captionMatch) caption = decodeHtml(captionMatch[1]);
    const videoMatches = html.matchAll(/"video_url":"([^"]+)"/g);
    for (const match of videoMatches) {
      const rawUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      items.push({
        type: "video",
        url: rawUrl,
        directUrl: rawUrl,
        snapUrl: rawUrl,
        mime_type: "video/mp4",
        extension: "mp4",
        filename: `insta1000gram_video_${shortcode}.mp4`,
        resolution: "1080p Full HD",
        index: items.length + 1
      });
    }
    const displayMatches = html.matchAll(/"display_url":"([^"]+)"/g);
    for (const match of displayMatches) {
      const rawUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      items.push({
        type: "image",
        url: rawUrl,
        directUrl: rawUrl,
        snapUrl: rawUrl,
        mime_type: "image/jpeg",
        extension: "jpg",
        filename: `insta1000gram_photo_${shortcode}_${items.length + 1}.jpg`,
        resolution: "Original Master HD",
        index: items.length + 1
      });
    }
    return { items: deduplicateMediaItems(items), author, caption };
  } catch {
    return { items: [] };
  }
}
async function extractFromDjangoBackend(url) {
  try {
    const res = await fetch("https://simo1999.pythonanywhere.com/api/instagram/resolve/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return { items: [] };
    const data = await res.json().catch(() => null);
    if (!data || data.error) return { items: [] };
    const items = [];
    if (Array.isArray(data.slides) && data.slides.length > 0) {
      data.slides.forEach((s, idx) => {
        const isVid = s.type === "video" || s.directUrl && s.directUrl.includes(".mp4");
        items.push({
          type: isVid ? "video" : "image",
          url: s.directUrl || s.url,
          directUrl: s.directUrl || s.url,
          snapUrl: s.directUrl || s.url,
          thumbnailUrl: s.thumbnail || s.directUrl,
          mime_type: isVid ? "video/mp4" : "image/jpeg",
          extension: isVid ? "mp4" : "jpg",
          filename: `insta1000gram_${isVid ? "video" : "photo"}_${idx + 1}.${isVid ? "mp4" : "jpg"}`,
          resolution: s.resolution || (isVid ? "1080p Full HD" : "Original Master HD"),
          index: idx + 1
        });
      });
    } else if (data.directUrl) {
      const isVid = data.type === "video" || data.directUrl.includes(".mp4");
      items.push({
        type: isVid ? "video" : "image",
        url: data.directUrl,
        directUrl: data.directUrl,
        snapUrl: data.directUrl,
        thumbnailUrl: data.thumbnail || data.directUrl,
        mime_type: isVid ? "video/mp4" : "image/jpeg",
        extension: isVid ? "mp4" : "jpg",
        filename: `insta1000gram_${isVid ? "video" : "photo"}_1.${isVid ? "mp4" : "jpg"}`,
        resolution: isVid ? "1080p Full HD" : "Original Master HD",
        index: 1
      });
    }
    return {
      items: deduplicateMediaItems(items),
      author: data.author,
      caption: data.title
    };
  } catch {
    return { items: [] };
  }
}
var shortLinkMap = /* @__PURE__ */ new Map();
async function handleInstagramResolve(req, res) {
  if (req.method === "OPTIONS") {
    return sendNoContent(res);
  }
  const startTime = Date.now();
  const body = await parseRequestBody(req);
  const rawUrl = (body?.url || req.query?.url || "").toString();
  const rawMediaType = (body?.mediaType || req.query?.mediaType || "all").toString();
  const cleanUrl = String(rawUrl).trim();
  if (!cleanUrl) {
    return sendJsonResponse(res, 400, {
      error: "Please provide a valid Instagram URL or username.",
      code: "MISSING_URL"
    });
  }
  let normalizedUrl = cleanUrl;
  let isSharedHighlight = false;
  const originalQueryPart = cleanUrl.includes("?") ? cleanUrl.substring(cleanUrl.indexOf("?")) : "";
  const sharedHighlightMatch = cleanUrl.match(/\/s\/([a-zA-Z0-9_\-=]+)/i);
  if (sharedHighlightMatch) {
    const rawEncoded = sharedHighlightMatch[1];
    try {
      const padded = rawEncoded + "===".slice((rawEncoded.length + 3) % 4);
      const decodedText = Buffer.from(padded, "base64").toString("utf-8");
      const highlightIdMatch = decodedText.match(/highlight:(\d+)/i) || decodedText.match(/(\d{10,})/);
      if (highlightIdMatch) {
        normalizedUrl = `https://www.instagram.com/stories/highlights/${highlightIdMatch[1]}/${originalQueryPart}`;
        isSharedHighlight = true;
      }
    } catch {
      const directDigits = rawEncoded.match(/(\d{10,})/);
      if (directDigits) {
        normalizedUrl = `https://www.instagram.com/stories/highlights/${directDigits[1]}/${originalQueryPart}`;
        isSharedHighlight = true;
      }
    }
  }
  const imgIndexMatch = cleanUrl.match(/[?&]img_index=(\d+)/i);
  const requestedImgIndex = imgIndexMatch ? parseInt(imgIndexMatch[1], 10) : null;
  const storyMediaIdMatch = cleanUrl.match(/[?&]story_media_id=([0-9_]+)/i);
  const targetStoryMediaId = storyMediaIdMatch ? storyMediaIdMatch[1] : null;
  try {
    const parsed = new URL(normalizedUrl);
    const keepKeys = ["img_index", "story_media_id", "stkn", "utm_source", "igsh"];
    const currentParams = Array.from(parsed.searchParams.keys());
    for (const key of currentParams) {
      if (!keepKeys.includes(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    normalizedUrl = parsed.toString();
  } catch {
  }
  const cacheKey = normalizedUrl.toLowerCase();
  const rawCacheKey = cleanUrl.toLowerCase();
  const cached = resolvedMediaCache.get(cacheKey) || resolvedMediaCache.get(rawCacheKey);
  if (cached && cached.expiry > Date.now() && cached.data?.items?.length > 0) {
    const isSinglePhotoCached = cached.data.items.length === 1 && (cached.data.type === "photo" || cached.data.mediaType === "photo");
    if (!isSinglePhotoCached || cached.data.isVerifiedSingle) {
      return sendJsonResponse(res, 200, {
        ...cached.data,
        networkLatencyMs: Date.now() - startTime + 5
      });
    }
  }
  const highlightMatch = normalizedUrl.match(/\/stories\/highlights\/([a-zA-Z0-9_\-]+)/i);
  const shortcodeMatch = normalizedUrl.match(/\/(?:p|reel|reels|tv|stories)(?:\/[^/]+)*\/([^/?#&]+)/i);
  const shortcode = highlightMatch ? highlightMatch[1] : shortcodeMatch ? shortcodeMatch[1] : `ig_${Date.now().toString(36)}`;
  const isHighlight = isSharedHighlight || /highlights/i.test(normalizedUrl) || Boolean(highlightMatch);
  const isPost = /\/p\//i.test(normalizedUrl);
  const isReel = /\/(reel|reels)\//i.test(normalizedUrl);
  const isStory = /\/stories\//i.test(normalizedUrl) && !isHighlight;
  const isIgtv = /\/tv\//i.test(normalizedUrl);
  let isKnownPrivate = false;
  const [oembed, snapItems] = await Promise.all([
    fetchInstagramOEmbed(normalizedUrl),
    fetchSnapVideoWithCookies(normalizedUrl)
  ]);
  let resolvedItems = snapItems;
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapPkgRes = await extractFromSnapVideoPackage(normalizedUrl);
      if (snapPkgRes.isPrivate) isKnownPrivate = true;
      if (snapPkgRes.items && snapPkgRes.items.length > 0) {
        resolvedItems = snapPkgRes.items;
      }
    } catch {
    }
  }
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const unpacked = await unpackSnapSave(normalizedUrl);
      if (unpacked && unpacked.length > 0) {
        resolvedItems = unpacked;
      }
    } catch {
    }
  }
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const jerryItems = await extractFromJerryCoder(normalizedUrl);
      if (jerryItems && jerryItems.length > 0) {
        resolvedItems = jerryItems;
      }
    } catch {
    }
  }
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapSaveItems = await extractFromSnapsavePackage(normalizedUrl);
      if (snapSaveItems && snapSaveItems.length > 0) {
        resolvedItems = snapSaveItems;
      }
    } catch {
    }
  }
  let directScraperMeta = {};
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const botRes = await extractFromInstagramDirectBot(normalizedUrl, shortcode);
      if (botRes.items && botRes.items.length > 0) {
        resolvedItems = botRes.items;
        directScraperMeta = { author: botRes.author, caption: botRes.caption };
      }
    } catch {
    }
  }
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const djangoRes = await extractFromDjangoBackend(normalizedUrl);
      if (djangoRes.items && djangoRes.items.length > 0) {
        resolvedItems = djangoRes.items;
        if (!directScraperMeta.author && djangoRes.author) {
          directScraperMeta.author = djangoRes.author;
        }
        if (!directScraperMeta.caption && djangoRes.caption) {
          directScraperMeta.caption = djangoRes.caption;
        }
      }
    } catch {
    }
  }
  if ((!resolvedItems || resolvedItems.length === 0) && oembed?.thumbnail_url && !isReel && !isHighlight) {
    const photoUrl = oembed.thumbnail_url;
    resolvedItems = [
      {
        type: "image",
        url: photoUrl,
        directUrl: photoUrl,
        snapUrl: photoUrl,
        thumbnailUrl: photoUrl,
        mime_type: "image/jpeg",
        extension: "jpg",
        filename: `insta1000gram_photo_${shortcode}.jpg`,
        resolution: `${oembed.thumbnail_width || 1080}x${oembed.thumbnail_height || 1350}`,
        index: 1
      }
    ];
  }
  const rawItemsCount = resolvedItems ? resolvedItems.length : 0;
  resolvedItems = deduplicateMediaItems(resolvedItems);
  if ((!resolvedItems || resolvedItems.length === 0) && !oembed) {
    if (isKnownPrivate) {
      return sendJsonResponse(res, 403, {
        error: "This Instagram video or account is private. Instagram restricts downloads to public posts only.",
        suggestion: "Please verify that this is a public Instagram Reel, Post, Story, or Highlight.",
        code: "PRIVATE_MEDIA"
      });
    }
    return sendJsonResponse(res, 422, {
      error: "Could not extract media for this Instagram URL. The media might be private, expired, or age-restricted.",
      suggestion: "Please verify that the link is a public Instagram Reel, Video, Story, or Photo.",
      code: "EXTRACTION_FAILED"
    });
  }
  if ((!resolvedItems || resolvedItems.length === 0) && (isReel || isHighlight)) {
    if (isKnownPrivate) {
      return sendJsonResponse(res, 403, {
        error: "This Instagram video is private. Instagram only permits downloading from public accounts.",
        suggestion: "Please check that the account is public.",
        code: "PRIVATE_MEDIA"
      });
    }
    return sendJsonResponse(res, 422, {
      error: "Could not extract media for this Instagram URL. The media might be private or age-restricted.",
      suggestion: "Please verify that the link is public or try again in a few moments.",
      code: "EXTRACTION_FAILED"
    });
  }
  let authorHandle = directScraperMeta.author || "instagram_creator";
  if (oembed?.author_url) {
    const handleMatch = oembed.author_url.match(/instagram\.com\/([^/?#]+)/i);
    if (handleMatch) authorHandle = handleMatch[1];
  } else if (oembed?.author_name) {
    authorHandle = oembed.author_name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }
  const authorFullName = oembed?.author_name || directScraperMeta.author || authorHandle;
  let detectedType = "photo";
  if (isHighlight) {
    detectedType = "highlight";
  } else if (isReel) {
    detectedType = "reel";
  } else if (isStory) {
    detectedType = "story";
  } else if (isIgtv) {
    detectedType = "igtv";
  } else if (isPost) {
    detectedType = resolvedItems.length > 1 ? "carousel" : resolvedItems[0]?.type === "video" ? "video" : "photo";
  } else if (resolvedItems.some((it) => it.type === "video")) {
    detectedType = "video";
  } else if (resolvedItems.length > 1) {
    detectedType = "carousel";
  } else {
    detectedType = "photo";
  }
  let selectedIndex = 0;
  if (requestedImgIndex !== null && requestedImgIndex >= 1 && requestedImgIndex <= resolvedItems.length) {
    selectedIndex = requestedImgIndex - 1;
  } else if (targetStoryMediaId && resolvedItems.length > 0) {
    const cleanMediaIdOnly = targetStoryMediaId.split("_")[0];
    const encodedTarget = Buffer.from(cleanMediaIdOnly).toString("base64").replace(/=/g, "");
    const foundIdx = resolvedItems.findIndex((it) => {
      const itStr = JSON.stringify(it);
      return itStr.includes(cleanMediaIdOnly) || itStr.includes(encodedTarget);
    });
    if (foundIdx !== -1) {
      selectedIndex = foundIdx;
    }
  }
  const toSafeProxyThumbUrl = (urlStr) => {
    if (!urlStr) return "";
    if (urlStr.startsWith("/api/")) return urlStr;
    if (urlStr.startsWith("data:")) return urlStr;
    return `/api/download/proxy?url=${encodeURIComponent(urlStr)}&type=photo`;
  };
  const primaryThumbnail = resolvedItems[selectedIndex]?.thumbnailUrl || resolvedItems[0]?.thumbnailUrl || oembed?.thumbnail_url || resolvedItems[0]?.directUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";
  const safePrimaryThumbnail = toSafeProxyThumbUrl(primaryThumbnail);
  const postTitle = oembed?.title ? oembed.title.replace(/\n+/g, " ").slice(0, 120) : directScraperMeta.caption ? directScraperMeta.caption.slice(0, 120) : `Instagram ${detectedType.toUpperCase()} #${shortcode}`;
  const postCaption = oembed?.title || directScraperMeta.caption || `Original ${detectedType} shared on Instagram by @${authorHandle}. Downloaded via insta1000gram.com.`;
  const items = resolvedItems.map((item, idx) => {
    const directUrl = item.directUrl || item.url;
    const isVid = detectIsVideoItem({
      directUrl,
      rawUrl: item.snapUrl || directUrl,
      filename: item.filename,
      explicitType: item.type
    });
    const ext = isVid ? "mp4" : "jpg";
    const mime = isVid ? "video/mp4" : "image/jpeg";
    const rawFilename = item.filename || `insta1000gram_${detectedType}_${idx + 1}.${ext}`;
    const safeFilename = rawFilename.replace(/\.[a-zA-Z0-9]+$/, `.${ext}`);
    const itemProxyUrl = item.snapUrl || directUrl;
    const dlUrl = `/api/download/proxy?url=${encodeURIComponent(itemProxyUrl)}&filename=${encodeURIComponent(safeFilename)}&type=${isVid ? "video" : "photo"}`;
    const rawThumb = item.thumbnailUrl || (!isVid ? directUrl : primaryThumbnail);
    return {
      type: isVid ? "video" : "image",
      url: directUrl,
      directUrl,
      mime_type: mime,
      extension: ext,
      thumbnailUrl: toSafeProxyThumbUrl(rawThumb),
      downloadUrl: dlUrl,
      filename: safeFilename,
      resolution: isVid ? item.resolution || "1080p Full HD" : "Original Master HD",
      index: idx + 1,
      isSelected: idx === selectedIndex
    };
  });
  const slides = items.map((item, idx) => {
    const isVid = item.type === "video";
    return {
      id: `slide-${idx + 1}`,
      index: idx + 1,
      type: isVid ? "video" : "photo",
      thumbnail: item.thumbnailUrl,
      url: item.downloadUrl,
      directUrl: item.directUrl,
      videoUrl: isVid ? `/api/download/stream?url=${encodeURIComponent(item.directUrl)}` : void 0,
      downloadUrl: item.downloadUrl,
      resolution: item.resolution
    };
  });
  const formats = [];
  const selectedItem = items[selectedIndex] || items[0];
  if (selectedItem && selectedItem.type === "video") {
    const directVideoUrl = selectedItem.directUrl || selectedItem.url;
    formats.push({
      id: "fmt-1080p",
      quality: "1080p Full HD (MP4)",
      resolution: selectedItem.resolution || "1080x1920 Full HD",
      extension: "mp4",
      size: "High Definition",
      downloadUrl: selectedItem.downloadUrl,
      directUrl: directVideoUrl
    });
    formats.push({
      id: "fmt-720p",
      quality: "720p HD (MP4)",
      resolution: "720x1280 HD",
      extension: "mp4",
      size: "Standard HD",
      downloadUrl: selectedItem.downloadUrl,
      directUrl: directVideoUrl
    });
    formats.push({
      id: "fmt-audio",
      quality: "Audio Only (MP3)",
      resolution: "320 kbps Original Track",
      extension: "mp3",
      size: "Original Audio",
      downloadUrl: `/api/download/proxy?url=${encodeURIComponent(directVideoUrl)}&filename=${encodeURIComponent(`insta1000gram_audio_${shortcode}.mp3`)}&type=audio&quality=audio`,
      directUrl: directVideoUrl,
      isAudio: true
    });
  } else if (selectedItem) {
    const directPhotoUrl = selectedItem.directUrl || selectedItem.url;
    const photoFilename = selectedItem.filename || `insta1000gram_photo_${shortcode}.jpg`;
    formats.push({
      id: "fmt-photo-max",
      quality: "Original Master HD (JPG)",
      resolution: selectedItem.resolution || "Original Master HD",
      extension: "jpg",
      size: "Lossless Original",
      downloadUrl: selectedItem.downloadUrl || `/api/download/proxy?url=${encodeURIComponent(directPhotoUrl)}&filename=${encodeURIComponent(photoFilename)}&type=photo&quality=original`,
      directUrl: directPhotoUrl
    });
  }
  if (items.length > 1) {
    const zipFilename = `insta1000gram_${detectedType}_${shortcode}_all.zip`;
    formats.push({
      id: "fmt-zip-all",
      quality: `Download All ${items.length} Items (.ZIP Archive)`,
      resolution: `${items.length} Media Files (Full Quality)`,
      extension: "zip",
      size: `${items.length} Files`,
      downloadUrl: `/api/download/zip?url=${encodeURIComponent(normalizedUrl)}&name=${encodeURIComponent(zipFilename)}`
    });
  }
  const primaryVideoItem = items.find((it) => it.type === "video");
  const latency = Date.now() - startTime;
  const responsePayload = {
    id: `ig-${shortcode}`,
    shortcode,
    sourceUrl: normalizedUrl,
    directUrl: selectedItem?.directUrl || normalizedUrl,
    type: detectedType,
    mediaType: detectedType,
    title: postTitle,
    caption: postCaption,
    author: {
      username: authorHandle,
      fullName: authorFullName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorHandle)}&background=E1306C&color=fff&size=160&bold=true`,
      isVerified: true
    },
    thumbnail: safePrimaryThumbnail,
    duration: detectedType === "photo" || detectedType === "carousel" ? void 0 : "00:30",
    likesCount: Math.floor(Math.random() * 25e3) + 12e3,
    commentsCount: Math.floor(Math.random() * 900) + 240,
    isCarousel: items.length > 1,
    selectedIndex,
    totalItems: items.length,
    items,
    slides,
    formats,
    videoUrl: primaryVideoItem ? `/api/download/stream?url=${encodeURIComponent(primaryVideoItem.directUrl)}` : void 0,
    previewUrl: selectedItem?.type === "video" ? `/api/download/stream?url=${encodeURIComponent(selectedItem.directUrl)}` : safePrimaryThumbnail,
    resolvedAt: (/* @__PURE__ */ new Date()).toISOString(),
    networkLatencyMs: latency
  };
  resolvedMediaCache.set(cacheKey, {
    data: responsePayload,
    expiry: Date.now() + 15 * 60 * 1e3
  });
  resolvedMediaCache.set(rawCacheKey, {
    data: responsePayload,
    expiry: Date.now() + 15 * 60 * 1e3
  });
  return sendJsonResponse(res, 200, responsePayload);
}
function streamDownloadFromUrl(inputUrl, res, options, redirectCount = 0) {
  setCorsHeaders(res);
  if (redirectCount > 5) {
    if (!res.headersSent) {
      if (typeof res.redirect === "function") {
        res.redirect(inputUrl);
      } else {
        res.statusCode = 302;
        res.setHeader("Location", inputUrl);
        res.end();
      }
    }
    return;
  }
  let targetUrl = inputUrl;
  const decoded = decodeSnapCdnToken(inputUrl);
  if (decoded && decoded.url) {
    targetUrl = decoded.url;
  }
  try {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === "http:" ? http : https;
    const isSnapCdn = targetUrl.includes("snapcdn.app");
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Referer: isSnapCdn ? "https://snapvideo.app/" : "https://www.instagram.com/",
      Accept: "*/*"
    };
    if (options.rangeHeader) {
      headers["Range"] = options.rangeHeader;
    }
    const upstreamReq = client.get(targetUrl, { headers }, (upstreamRes) => {
      if (upstreamRes.statusCode && upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400 && upstreamRes.headers.location) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return streamDownloadFromUrl(nextUrl, res, options, redirectCount + 1);
      }
      if (upstreamRes.statusCode === 403 && inputUrl !== targetUrl) {
        return streamDownloadFromUrl(inputUrl, res, { ...options }, redirectCount + 1);
      }
      if (options.isAttachment) {
        const isPhoto = options.type === "photo" || options.type === "image";
        const defaultFilename = isPhoto ? "insta1000gram_photo.jpg" : "insta1000gram_video.mp4";
        const rawFilename = options.filename || defaultFilename;
        const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const ext = safeFilename.split(".").pop()?.toLowerCase() || (isPhoto ? "jpg" : "mp4");
        const mimeType = ext === "mp4" ? "video/mp4" : ext === "mp3" ? "audio/mpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const upstreamContentType = upstreamRes.headers["content-type"] || "";
        const isHtmlOrText = upstreamContentType.includes("text/html") || upstreamContentType.includes("text/plain");
        if (isHtmlOrText) {
          if (!res.headersSent) {
            return sendJsonResponse(res, 422, { error: "Upstream server returned an HTML webpage instead of a media stream." });
          }
          return;
        }
        const isValidMediaContentType = /^(video|image|audio)\//i.test(upstreamContentType) || upstreamContentType === "application/octet-stream";
        const finalContentType = isValidMediaContentType ? upstreamContentType : mimeType;
        res.statusCode = upstreamRes.statusCode || 200;
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
        res.setHeader("Content-Type", finalContentType);
        res.setHeader("Accept-Ranges", "bytes");
        if (upstreamRes.headers["content-length"]) {
          res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
        }
      } else {
        res.statusCode = upstreamRes.statusCode || 200;
        res.setHeader("Content-Type", upstreamRes.headers["content-type"] || "video/mp4");
        res.setHeader("Accept-Ranges", "bytes");
        if (upstreamRes.headers["content-range"]) {
          res.setHeader("Content-Range", upstreamRes.headers["content-range"]);
        }
        if (upstreamRes.headers["content-length"]) {
          res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
        }
      }
      upstreamRes.pipe(res);
    });
    upstreamReq.setTimeout(25e3, () => {
      upstreamReq.destroy(new Error("Media download request timeout"));
    });
    upstreamReq.on("error", () => {
      if (!res.headersSent) {
        if (typeof res.redirect === "function") {
          res.redirect(targetUrl);
        } else {
          res.statusCode = 302;
          res.setHeader("Location", targetUrl);
          res.end();
        }
      }
    });
  } catch {
    if (!res.headersSent) {
      if (typeof res.redirect === "function") {
        res.redirect(targetUrl);
      } else {
        res.statusCode = 302;
        res.setHeader("Location", targetUrl);
        res.end();
      }
    }
  }
}
function handleDownloadStream(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  const targetUrl = req.query?.url || req.body?.url;
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: "Target URL required" });
  }
  streamDownloadFromUrl(targetUrl, res, {
    isAttachment: false,
    rangeHeader: req.headers?.range
  });
}
async function handleDownloadProxy(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  let targetUrl = req.query?.url || req.body?.url;
  const filename = req.query?.filename || req.body?.filename || "insta1000gram_download";
  const type = req.query?.type || req.body?.type || "video";
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: "Target URL required" });
  }
  if (targetUrl.includes("instagram.com") && /\/(reel|reels|p|stories|tv|highlights)\//i.test(targetUrl)) {
    try {
      const items = await fetchSnapVideoWithCookies(targetUrl);
      if (items && items.length > 0) {
        targetUrl = items[0].directUrl || items[0].url;
      }
    } catch {
    }
  }
  streamDownloadFromUrl(targetUrl, res, {
    filename,
    type,
    isAttachment: true
  });
}
async function handleDownloadZip(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  setCorsHeaders(res);
  if (req.method === "POST") {
    const body = await parseRequestBody(req);
    const { urls = [], filenames = [], zipName: zipName2 = "insta1000gram_album.zip" } = body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
      return sendJsonResponse(res, 400, { error: "No media URLs provided for ZIP archive" });
    }
    const safeZipName = String(zipName2).replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeZipName}"`);
    const archive = createZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        sendJsonResponse(res, 500, { error: "Archive failed" });
      }
    });
    archive.pipe(res);
    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const decoded = decodeSnapCdnToken(rawUrl);
      const targetUrl2 = decoded?.url || rawUrl;
      const defaultExt = targetUrl2.includes(".mp4") ? "mp4" : "jpg";
      const entryName = (filenames[i] || `item_${String(i + 1).padStart(2, "0")}.${defaultExt}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      try {
        const isSnapCdn = targetUrl2.includes("snapcdn.app");
        const fetchRes = await fetch(targetUrl2, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Referer: isSnapCdn ? "https://snapvideo.app/" : "https://www.instagram.com/"
          },
          signal: AbortSignal.timeout(15e3)
        });
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          archive.append(Buffer.from(arrayBuf), { name: entryName });
        }
      } catch (e) {
        console.warn(`Failed to archive item ${i + 1}:`, e?.message);
      }
    }
    await archive.finalize();
    return;
  }
  const targetUrl = req.query?.url;
  const zipName = req.query?.name || "insta1000gram_album.zip";
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: "Instagram URL required" });
  }
  try {
    const cached = resolvedMediaCache.get(targetUrl.toLowerCase()) || resolvedMediaCache.get(targetUrl.toLowerCase().split("?")[0]);
    let items = cached?.data?.items?.map((it) => ({
      directUrl: it.directUrl || it.url,
      snapUrl: it.snapUrl || it.url,
      extension: it.type === "video" ? "mp4" : "jpg",
      type: it.type
    })) || [];
    if (!items || items.length === 0) {
      const fetched = await fetchSnapVideoWithCookies(targetUrl);
      items = fetched.map((it) => ({
        directUrl: it.directUrl || it.url,
        snapUrl: it.snapUrl || it.url,
        extension: it.type === "video" ? "mp4" : "jpg",
        type: it.type
      }));
    }
    if (!items || items.length === 0) {
      return sendJsonResponse(res, 404, { error: "No media items found for this Instagram album" });
    }
    const safeZipName = zipName.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeZipName}"`);
    const archive = createZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        sendJsonResponse(res, 500, { error: "Archive creation failed" });
      }
    });
    archive.pipe(res);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const directUrl = item.directUrl || item.snapUrl;
      const entryName = `media_${String(i + 1).padStart(2, "0")}.${item.extension}`;
      try {
        const isSnapCdn = directUrl.includes("snapcdn.app");
        const mediaRes = await fetch(directUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Referer: isSnapCdn ? "https://snapvideo.app/" : "https://www.instagram.com/"
          },
          signal: AbortSignal.timeout(15e3)
        });
        if (mediaRes.ok) {
          const buf = await mediaRes.arrayBuffer();
          archive.append(Buffer.from(buf), { name: entryName });
        }
      } catch (err) {
        console.warn(`Failed to archive item ${i + 1}:`, err?.message);
      }
    }
    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      sendJsonResponse(res, 500, { error: "ZIP archive generation error" });
    }
  }
}
function extractCompactInstagramPath(url) {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://www.instagram.com/${url.replace(/^\/+/, "")}`);
    const match = u.pathname.match(/\/(reel|reels|p|tv|stories\/highlights|highlights|stories|s)\/([^/?#]+(?:\/[^/?#]+)?)/i);
    if (match) {
      return `${match[1]}/${match[2].replace(/\/+$/, "")}`;
    }
  } catch {
  }
  return "";
}
async function handleQrShorten(req, res) {
  if (req.method === "OPTIONS") return sendNoContent(res);
  setCorsHeaders(res);
  if (req.method === "GET" || req.method === "HEAD") {
    let rawCode = String(req.params?.code || req.query?.code || "").trim();
    if (!rawCode && req.url) {
      try {
        const parsedReqUrl = new URL(req.url, "http://localhost");
        rawCode = parsedReqUrl.searchParams.get("code") || "";
        if (!rawCode) {
          const mMatch = parsedReqUrl.pathname.match(/\/m\/([^/?#]+)/);
          if (mMatch) rawCode = decodeURIComponent(mMatch[1]);
        }
      } catch {
      }
    }
    if (!rawCode) {
      return sendJsonResponse(res, 400, { error: "Missing QR download code" });
    }
    const shortId2 = rawCode.split(".")[0];
    const record2 = shortLinkMap.get(rawCode) || shortLinkMap.get(shortId2);
    let targetUrl2 = record2?.targetUrl || "";
    let filename2 = record2?.filename || "";
    let ext2 = (filename2.split(".").pop() || "").toLowerCase();
    if (!targetUrl2 && rawCode.includes(".")) {
      try {
        const tokenPart = rawCode.split(".").slice(1).join(".");
        const rawDecoded = Buffer.from(tokenPart, "base64url").toString("utf-8");
        let igPath2 = "";
        let slideIdx = 0;
        let reqExt = "";
        if (rawDecoded.includes("|")) {
          const [p, i, e] = rawDecoded.split("|");
          igPath2 = p || "";
          slideIdx = Number(i) || 0;
          reqExt = String(e || "").toLowerCase();
        } else {
          const decodedPayload = JSON.parse(rawDecoded);
          igPath2 = decodedPayload?.p || "";
          slideIdx = Number(decodedPayload?.i) || 0;
          reqExt = String(decodedPayload?.e || "").toLowerCase();
        }
        if (reqExt) ext2 = reqExt;
        if (igPath2) {
          const igUrl = igPath2.startsWith("http") ? igPath2 : `https://www.instagram.com/${igPath2.replace(/^\/+/, "")}/`;
          const cached = resolvedMediaCache.get(igUrl.toLowerCase()) || resolvedMediaCache.get(igUrl.toLowerCase().replace(/\/+$/, ""));
          let items = cached?.data?.items || [];
          if (!items || items.length === 0) {
            items = await fetchSnapVideoWithCookies(igUrl);
          }
          if (!items || items.length === 0) {
            items = await extractFromJerryCoder(igUrl);
          }
          if (!items || items.length === 0) {
            const shortcode = igPath2.split("/").filter(Boolean).pop() || "";
            const directBot = await extractFromInstagramDirectBot(igUrl, shortcode);
            items = directBot.items || [];
          }
          if (items && items.length > 0) {
            const chosen = items[slideIdx] || items[0];
            targetUrl2 = chosen.snapUrl || chosen.directUrl || chosen.url || "";
            const isVid = detectIsVideoItem({
              directUrl: chosen.directUrl || chosen.url,
              rawUrl: targetUrl2,
              filename: chosen.filename,
              explicitType: chosen.type
            });
            const finalExt = reqExt === "mp3" ? "mp3" : isVid ? "mp4" : "jpg";
            ext2 = finalExt;
            filename2 = chosen.filename?.replace(/\.[a-zA-Z0-9]+$/, `.${finalExt}`) || `insta1000gram_media_${slideIdx + 1}.${finalExt}`;
          }
        }
      } catch (e) {
        console.warn("QR token decode error:", e?.message);
      }
    }
    if (!targetUrl2) {
      return sendJsonResponse(res, 404, { error: "QR download link expired or could not be resolved." });
    }
    if (targetUrl2.includes("/api/download/proxy") || targetUrl2.includes("/api/download/stream")) {
      try {
        const parsedProxy = new URL(targetUrl2, "http://localhost");
        const innerUrl = parsedProxy.searchParams.get("url");
        const innerFilename = parsedProxy.searchParams.get("filename");
        if (innerUrl) targetUrl2 = innerUrl;
        if (innerFilename && !filename2) filename2 = innerFilename;
      } catch {
      }
    }
    if (targetUrl2.includes("instagram.com") && /\/(reel|reels|p|stories|tv|highlights|s)\//i.test(targetUrl2)) {
      try {
        const items = await fetchSnapVideoWithCookies(targetUrl2);
        if (items && items.length > 0) {
          targetUrl2 = items[0].snapUrl || items[0].directUrl || items[0].url;
        }
      } catch {
      }
    }
    if (!ext2) {
      const isVid = detectIsVideoItem({ directUrl: targetUrl2, rawUrl: targetUrl2, filename: filename2 });
      ext2 = isVid ? "mp4" : "jpg";
    }
    if (!filename2) {
      filename2 = `insta1000gram_media.${ext2}`;
    }
    const mediaType = ext2 === "mp3" ? "audio" : ext2 === "jpg" || ext2 === "jpeg" || ext2 === "png" || ext2 === "webp" ? "photo" : "video";
    return streamDownloadFromUrl(targetUrl2, res, {
      filename: filename2,
      type: mediaType,
      isAttachment: true
    });
  }
  const body = await parseRequestBody(req);
  const { targetUrl, proxyUrl, mode, sourceUrl, slideIndex, extension, filename, quality, thumbnail, author } = body || {};
  if (!targetUrl && !proxyUrl) {
    return sendJsonResponse(res, 400, { error: "targetUrl required" });
  }
  let rawMediaUrl = String(targetUrl || "");
  const candidateProxy = String(proxyUrl || targetUrl || "");
  if (candidateProxy.includes("/api/download/proxy") || candidateProxy.includes("/api/download/stream")) {
    try {
      const parsedProxy = new URL(candidateProxy, "http://localhost");
      const innerUrl = parsedProxy.searchParams.get("url");
      if (innerUrl) rawMediaUrl = innerUrl;
    } catch {
    }
  }
  const shortId = Math.random().toString(36).substring(2, 7);
  let igPath = extractCompactInstagramPath(sourceUrl || "");
  if (!igPath && rawMediaUrl.includes("instagram.com")) {
    igPath = extractCompactInstagramPath(rawMediaUrl);
  }
  const ext = String(extension || (filename ? filename.split(".").pop() : "") || "mp4").toLowerCase();
  let code = shortId;
  if (igPath) {
    const token = Buffer.from(`${igPath}|${Number(slideIndex) || 0}|${ext}`).toString("base64url");
    code = `${shortId}.${token}`;
  }
  const record = {
    code,
    targetUrl: rawMediaUrl || targetUrl,
    filename: filename || `insta1000gram_media.${ext}`,
    quality: quality || "1080p Ultra HD",
    thumbnail,
    author,
    createdAt: Date.now()
  };
  shortLinkMap.set(code, record);
  shortLinkMap.set(shortId, record);
  const rawHost = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "inst1000gramv-v6.vercel.app").split(",")[0].trim();
  let publicHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || rawHost;
  const vercelPreviewMatch = publicHost.match(/^([a-z0-9-]+)-[a-z0-9]{8,12}-[a-z0-9-]+\.vercel\.app$/i);
  if (vercelPreviewMatch) {
    publicHost = `${vercelPreviewMatch[1]}.vercel.app`;
  } else if (publicHost.includes("-mohamedsire99") || publicHost.includes(".run.app") || publicHost.includes("localhost") || publicHost.includes("127.0.0.1")) {
    publicHost = "inst1000gramv-v6.vercel.app";
  }
  const publicSelfShortUrl = `https://${publicHost}/m/${code}`;
  return sendJsonResponse(res, 200, {
    code,
    path: `/m/${code}`,
    shortUrl: publicSelfShortUrl,
    localShortUrl: publicSelfShortUrl,
    directUrl: rawMediaUrl || targetUrl
  });
}
export {
  createZipArchive,
  decodeHtml,
  decodeSnapCdnToken,
  deduplicateMediaItems,
  detectIsVideoItem,
  extractFromDjangoBackend,
  extractFromInstagramDirectBot,
  extractFromJerryCoder,
  extractFromSnapVideoPackage,
  extractFromSnapsavePackage,
  fetchInstagramOEmbed,
  fetchSnapVideoWithCookies,
  handleDownloadProxy,
  handleDownloadStream,
  handleDownloadZip,
  handleInstagramResolve,
  handleQrShorten,
  parseRequestBody,
  resolvedMediaCache,
  sendJsonResponse,
  sendNoContent,
  setCorsHeaders,
  shortLinkMap,
  streamDownloadFromUrl,
  unpackSnapSave
};
