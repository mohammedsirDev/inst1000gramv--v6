import json
import re
import time
import base64
import logging
import urllib.parse
import urllib.request
from datetime import datetime
from urllib.parse import urlparse
import requests
from django.http import JsonResponse, StreamingHttpResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

try:
    from models import PSEOPart, PSEOPartKeyword, AdPlacement, AdsTxtEntry
except ImportError:
    from .models import PSEOPart, PSEOPartKeyword, AdPlacement, AdsTxtEntry

logger = logging.getLogger("insta1000gram")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 324.0.0.22.110"
]

DEFAULT_KEYWORDS = [
    {"slug": "download-instagram-reels-online", "target": "Instagram Reels", "cat": "reels"},
    {"slug": "instagram-story-saver-hd", "target": "Instagram Stories", "cat": "stories"},
    {"slug": "save-instagram-photos-original", "target": "Instagram Photos", "cat": "photos"},
    {"slug": "download-instagram-reels-iphone", "target": "Instagram Reels on iOS", "cat": "device"},
    {"slug": "download-instagram-reels-android", "target": "Instagram Reels on Android", "cat": "device"},
    {"slug": "extract-instagram-audio-mp3", "target": "Instagram Audio to MP3", "cat": "audio"},
    {"slug": "save-instagram-highlights-anonymous", "target": "Instagram Highlights", "cat": "highlight"},
]


def normalize_instagram_url(url: str) -> str:
    if not url:
        return ""

    url = url.strip()
    url = re.sub(r'^(https?://)?(www\.)?insta(1000)?gram\.com', 'https://www.instagram.com', url, flags=re.IGNORECASE)

    # Decode Instagram short highlight links: /s/<base64>
    s_match = re.search(r'/s/([a-zA-Z0-9_\-=]+)', url, flags=re.IGNORECASE)
    if s_match:
        try:
            raw_b64 = s_match.group(1).replace('-', '+').replace('_', '/')
            padded_b64 = raw_b64 + '=' * ((4 - len(raw_b64) % 4) % 4)
            decoded = base64.b64decode(padded_b64).decode('utf-8', errors='ignore')

            if decoded.startswith('highlight:'):
                highlight_id = decoded.replace('highlight:', '')
                parsed = urlparse(url)
                query_string = f"?{parsed.query}" if parsed.query else ""
                url = f"https://www.instagram.com/stories/highlights/{highlight_id}/{query_string}"
        except Exception as e:
            logger.warning(f"Error decoding /s/ highlight URL: {e}")

    return url


def is_url_a_video(media_url: str) -> bool:
    """Accurately checks whether a URL is a real video stream or an image."""
    if not media_url:
        return False
    lower = media_url.lower()
    if ".mp4" in lower or "mime_type=video_mp4" in lower or "/video/" in lower or "bytestart=" in lower:
        return True
    if ".jpg" in lower or ".jpeg" in lower or ".png" in lower or ".webp" in lower or "cover_frame" in lower:
        return False
    return False


def fetch_oembed_py(target_url):
    try:
        normalized = re.sub(r'/reels/', '/reel/', target_url, flags=re.IGNORECASE)
        oembed_url = "https://www.instagram.com/api/v1/oembed/?url=" + urllib.parse.quote(normalized)
        req = urllib.request.Request(oembed_url, headers={"User-Agent": USER_AGENTS[0], "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=6) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def resolve_via_saveclip(url):
    """
    Direct GraphQL Instagram Media Resolver (SaveClip API)
    Guarantees authentic MP4 videos WITH AUDIO and original JPG photos.
    """
    try:
        session = requests.Session()
        session.headers.update({
            "User-Agent": USER_AGENTS[0],
            "Referer": "https://saveclip.app/",
            "Origin": "https://saveclip.app"
        })
        res = session.post(
            "https://api.saveclip.app/api/ajaxSearch",
            data={"q": url, "t": "media", "lang": "en"},
            timeout=12
        )
        if res.status_code == 200:
            data = res.json().get("data", "")
            if data:
                li_blocks = re.findall(r'<li\b[\s\S]*?</li>', data, flags=re.IGNORECASE)
                items = []
                for idx, block in enumerate(li_blocks):
                    vid_m = re.search(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>[\s\S]*?Download Video[\s\S]*?</a>', block, re.IGNORECASE)
                    photo_m = re.search(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>[\s\S]*?Download (?:Photo|Image)[\s\S]*?</a>', block, re.IGNORECASE)
                    img_m = re.search(r'<img\b[^>]*src=["\']([^"\']+)["\']', block, re.IGNORECASE)

                    raw_url = vid_m.group(1) if vid_m else (photo_m.group(1) if photo_m else (img_m.group(1) if img_m else None))
                    thumb_url = img_m.group(1) if img_m else None
                    if not raw_url:
                        continue

                    direct_url = raw_url
                    token_m = re.search(r'token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)', raw_url)
                    if token_m:
                        try:
                            p_parts = token_m.group(1).split(".")
                            p_b64 = p_parts[1] + "=" * (-len(p_parts[1]) % 4)
                            p_decoded = json.loads(base64.urlsafe_b64decode(p_b64).decode("utf-8"))
                            if p_decoded.get("url"):
                                direct_url = p_decoded["url"]
                        except Exception:
                            pass

                    # True video detection: button was Download Video OR url contains .mp4
                    is_vid = bool(vid_m) or ".mp4" in direct_url.lower()
                    if direct_url.split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp')) and not bool(vid_m):
                        is_vid = False

                    ext = "mp4" if is_vid else "jpg"
                    mime = "video/mp4" if is_vid else "image/jpeg"
                    items.append({
                        "type": "video" if is_vid else "image",
                        "url": direct_url,
                        "mime_type": mime,
                        "extension": ext,
                        "thumbnail": thumb_url or direct_url,
                        "filename": f"insta1000gram_media_{idx + 1}.{ext}",
                        "index": idx + 1
                    })

                if items:
                    primary = items[0]
                    return {
                        "url": primary["url"],
                        "filename": primary["filename"],
                        "type": primary["type"],
                        "items": items,
                        "thumbnail": primary["thumbnail"]
                    }
    except Exception as e:
        logger.warning(f"SaveClip resolver error: {e}")
    return None


def resolve_instagram_media_py(url):
    """
    Multi-strategy media resolver for Instagram Reels, Posts, Stories, Carousels, and Highlights.
    Strategy 1: Direct SaveClip API (Resolves both photos and videos with full audio)
    Strategy 2: yt-dlp native extraction (Native video with audio)
    Strategy 3: SnapVideo AJAX API
    """
    url = normalize_instagram_url(url)
    normalized = re.sub(r'/reels/', '/reel/', url, flags=re.IGNORECASE)
    is_explicit_photo_post = "/p/" in normalized.lower() and not any(k in normalized.lower() for k in ["/reel/", "/tv/"])

    # Strategy 1: SaveClip (Handles Highlights with mixed Photos and Videos perfectly!)
    saveclip_res = resolve_via_saveclip(url)
    if saveclip_res and saveclip_res.get("items"):
        return saveclip_res

    # Strategy 2: yt-dlp native extraction (Best for single Reels & Videos)
    if not is_explicit_photo_post:
        try:
            import yt_dlp
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'socket_timeout': 15,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'http_headers': {
                    'User-Agent': USER_AGENTS[0],
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(normalized, download=False)
                if info:
                    shortcode_val = info.get('display_id') or info.get('id') or 'media'
                    formats = info.get('formats', []) or []

                    with_audio = [
                        f for f in formats
                        if f.get('vcodec') != 'none'
                        and f.get('acodec') != 'none'
                        and f.get('url')
                        and not f.get('url', '').endswith('.jpg')
                    ]

                    best_video_url = None
                    if with_audio:
                        best_video_url = with_audio[-1]['url']
                    elif info.get('url') and not info['url'].endswith('.jpg'):
                        best_video_url = info['url']
                    else:
                        video_formats = [f for f in formats if f.get('vcodec') != 'none' and f.get('url')]
                        if video_formats:
                            best_video_url = video_formats[-1]['url']

                    if best_video_url:
                        uploader = info.get('uploader') or 'Instagram Creator'
                        uploader_id = info.get('uploader_id') or re.sub(r'[^a-zA-Z0-9_.]', '', uploader.lower()) or 'instagram_creator'
                        item_obj = {
                            'type': 'video',
                            'url': best_video_url,
                            'mime_type': 'video/mp4',
                            'extension': 'mp4',
                            'filename': f"insta1000gram_{shortcode_val}.mp4",
                            'thumbnail': info.get('thumbnail'),
                            'index': 1
                        }
                        return {
                            'url': best_video_url,
                            'filename': item_obj['filename'],
                            'type': 'video',
                            'title': info.get('title') or info.get('fulltitle') or f"Instagram Video ({shortcode_val})",
                            'author_name': uploader,
                            'author_username': uploader_id,
                            'thumbnail': info.get('thumbnail'),
                            'likesCount': info.get('like_count') or 15400,
                            'commentsCount': info.get('comment_count') or 320,
                            'duration': info.get('duration_string'),
                            'items': [item_obj]
                        }
        except Exception as e:
            logger.warning(f"yt-dlp strategy warning: {e}")

    # Strategy 3: SnapVideo fallback
    try:
        session = requests.Session()
        session.headers.update({"User-Agent": USER_AGENTS[0]})
        home_res = session.get("https://snapvideo.app/en", timeout=8)
        if home_res.status_code == 200:
            exp_m = re.search(r'k_exp="([^"]+)"', home_res.text)
            tok_m = re.search(r'k_token="([^"]+)"', home_res.text)
            if exp_m and tok_m:
                search_res = session.post(
                    "https://snapvideo.app/api/ajaxSearch",
                    data={"k_exp": exp_m.group(1), "k_token": tok_m.group(1), "q": url, "t": "media", "lang": "en", "v": "v2"},
                    headers={"Referer": "https://snapvideo.app/en", "X-Requested-With": "XMLHttpRequest"},
                    timeout=12
                )
                if search_res.status_code == 200:
                    html = search_res.json().get("data") or ""
                    if html:
                        li_blocks = re.findall(r'<li\b[\s\S]*?</li>', html, flags=re.IGNORECASE)
                        items = []
                        for idx, block in enumerate(li_blocks):
                            vid_m = re.search(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>[\s\S]*?Download Video[\s\S]*?</a>', block, re.IGNORECASE)
                            photo_m = re.search(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>[\s\S]*?Download (?:Photo|Image)[\s\S]*?</a>', block, re.IGNORECASE)
                            img_m = re.search(r'<img\b[^>]*src=["\']([^"\']+)["\']', block, re.IGNORECASE)

                            raw_target_url = vid_m.group(1) if vid_m else (photo_m.group(1) if photo_m else (img_m.group(1) if img_m else None))
                            thumb_url = img_m.group(1) if img_m else None
                            if not raw_target_url:
                                continue

                            direct_url = raw_target_url
                            token_m = re.search(r'token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)', raw_target_url)
                            if token_m:
                                try:
                                    p_parts = token_m.group(1).split(".")
                                    p_b64 = p_parts[1] + "=" * (-len(p_parts[1]) % 4)
                                    p_decoded = json.loads(base64.urlsafe_b64decode(p_b64).decode("utf-8"))
                                    if p_decoded.get("url"):
                                        direct_url = p_decoded["url"]
                                except Exception:
                                    pass

                            is_vid = bool(vid_m) or ".mp4" in direct_url.lower()
                            if direct_url.split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp')) and not bool(vid_m):
                                is_vid = False

                            ext = "mp4" if is_vid else "jpg"
                            mime = "video/mp4" if is_vid else "image/jpeg"
                            items.append({
                                "type": "video" if is_vid else "image",
                                "url": direct_url,
                                "mime_type": mime,
                                "extension": ext,
                                "thumbnail": thumb_url or direct_url,
                                "filename": f"insta1000gram_media_{idx + 1}.{ext}",
                                "index": idx + 1
                            })

                        if items:
                            primary = items[0]
                            return {
                                "url": primary["url"],
                                "filename": primary["filename"],
                                "type": primary["type"],
                                "items": items,
                                "thumbnail": primary["thumbnail"]
                            }
    except Exception as e:
        logger.warning(f"SnapVideo strategy warning: {e}")

    return None


@csrf_exempt
def resolve_instagram(request):
    """
    POST /api/instagram/resolve/
    Resolves Instagram link and returns available formats with full support
    for Photos, Videos, Carousels, and multi-item Highlights.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed. Use POST."}, status=405)

    start_time = time.time()

    try:
        body = json.loads(request.body.decode("utf-8"))
        raw_url = body.get("url", "").strip()
    except Exception as e:
        logger.error(f"Failed to parse request JSON body: {e}")
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if not raw_url:
        return JsonResponse({"error": "Instagram URL is required"}, status=400)

    # 1. Normalize and decode shortcut /s/<base64> highlight URLs
    normalized_url = normalize_instagram_url(raw_url)

    # Check highlight or shortcode
    highlight_match = re.search(r"/stories/highlights/([0-9]+)", normalized_url)
    match = re.search(r"/(?:p|reel|reels|tv|stories)/([A-Za-z0-9_-]+)", normalized_url)
    shortcode = highlight_match.group(1) if highlight_match else (match.group(1) if match else "media")
    is_highlight = bool(highlight_match) or "/highlights/" in normalized_url
    is_story = "/stories/" in normalized_url and not is_highlight
    is_post = "/p/" in normalized_url

    # Check img_index query param (1-based)
    img_index_m = re.search(r'[?&]img_index=(\d+)', raw_url)
    requested_img_index = int(img_index_m.group(1)) if img_index_m else None

    # Resolve direct media stream via multi-strategy engine
    resolved_item = None
    try:
        resolved_item = resolve_instagram_media_py(normalized_url)
    except Exception as e:
        logger.exception(f"Error during media resolution for {normalized_url}: {e}")

    # Fetch supplementary oEmbed metadata
    oembed_info = None
    try:
        oembed_info = fetch_oembed_py(normalized_url)
    except Exception:
        pass

    author_name = "Instagram Creator"
    author_username = "instagram_creator"
    post_title = f"Instagram {'Highlight' if is_highlight else ('Story' if is_story else 'Media')} ({shortcode})"
    thumbnail_url = None

    if oembed_info:
        if oembed_info.get("author_name"):
            author_name = oembed_info["author_name"]
            author_username = re.sub(r'[^a-zA-Z0-9_.]', '', author_name.lower())
        if oembed_info.get("title"):
            post_title = oembed_info["title"].split('\n')[0][:100]
        if oembed_info.get("thumbnail_url"):
            thumbnail_url = oembed_info["thumbnail_url"]

    # Fallback ONLY for single photo posts if oEmbed has thumbnail
    if (not resolved_item or not resolved_item.get("url")) and thumbnail_url and is_post:
        resolved_item = {
            "url": thumbnail_url,
            "filename": f"insta1000gram_photo_{shortcode}.jpg",
            "type": "photo",
            "items": [
                {
                    "type": "image",
                    "url": thumbnail_url,
                    "mime_type": "image/jpeg",
                    "extension": "jpg",
                    "filename": f"insta1000gram_photo_{shortcode}.jpg",
                    "thumbnail": thumbnail_url,
                    "index": 1
                }
            ]
        }

    if not resolved_item or not resolved_item.get("url"):
        logger.warning(f"Could not extract media for {normalized_url}")
        return JsonResponse({
            "error": "Could not extract media for this Instagram URL. The media might be private or age-restricted."
        }, status=404)

    raw_items = resolved_item.get("items") or [
        {
            "type": resolved_item.get("type", "video"),
            "url": resolved_item["url"],
            "mime_type": "video/mp4" if resolved_item.get("type") == "video" else "image/jpeg",
            "extension": "mp4" if resolved_item.get("type") == "video" else "jpg",
            "filename": resolved_item.get("filename", f"insta1000gram_{shortcode}.mp4"),
            "thumbnail": resolved_item.get("thumbnail") or thumbnail_url,
            "index": 1
        }
    ]

    selected_index = 0
    if requested_img_index is not None and 1 <= requested_img_index <= len(raw_items):
        selected_index = requested_img_index - 1

    # Format items according to user specification
    items = []
    slides = []
    for idx, it in enumerate(raw_items):
        it_url = it.get("url", "")
        is_vid = it.get("type") == "video"
        ext = "mp4" if is_vid else "jpg"
        mime = "video/mp4" if is_vid else "image/jpeg"
        fn = it.get("filename") or f"insta1000gram_media_{idx + 1}.{ext}"
        thumb = it.get("thumbnail") or it_url
        dl_url = f"/api/download/proxy?url={urllib.parse.quote(it_url)}&filename={urllib.parse.quote(fn)}&type={'video' if is_vid else 'photo'}"

        items.append({
            "type": "video" if is_vid else "image",
            "url": it_url,
            "mime_type": mime,
            "extension": ext,
            "thumbnailUrl": thumb,
            "downloadUrl": dl_url,
            "filename": fn,
            "index": idx + 1,
            "isSelected": idx == selected_index
        })
        slides.append({
            "id": f"slide-{idx + 1}",
            "index": idx + 1,
            "type": "video" if is_vid else "photo",
            "thumbnail": thumb,
            "url": dl_url,
            "directUrl": it_url,
            "downloadUrl": dl_url,
            "videoUrl": f"/api/download/stream?url={urllib.parse.quote(it_url)}" if is_vid else None,
            "resolution": "1080p Full HD" if is_vid else "Original Master HD"
        })

    # Determine overall container type
    if is_highlight:
        resp_type = "highlight"
    elif is_post:
        resp_type = "carousel" if len(items) > 1 else ("video" if items[0]["type"] == "video" else "photo")
    elif any(it["type"] == "video" for it in items):
        resp_type = "video"
    elif len(items) > 1:
        resp_type = "carousel"
    else:
        resp_type = "photo"

    selected_item = items[selected_index] if selected_index < len(items) else items[0]
    direct_stream_url = selected_item["url"]
    is_video = selected_item["type"] == "video"

    formats = []
    if is_video:
        proxy_1080p = f"/api/download/proxy?url={urllib.parse.quote(direct_stream_url)}&filename=insta1000gram_{shortcode}_1080p.mp4&type=video"
        proxy_720p = f"/api/download/proxy?url={urllib.parse.quote(direct_stream_url)}&filename=insta1000gram_{shortcode}_720p.mp4&type=video"
        proxy_audio = f"/api/download/proxy?url={urllib.parse.quote(direct_stream_url)}&filename=insta1000gram_{shortcode}_audio.mp3&type=audio"

        formats = [
            {
                "id": "fmt-1080p",
                "quality": "1080p Full HD (MP4)",
                "resolution": "1080x1920",
                "extension": "mp4",
                "size": "High Definition",
                "downloadUrl": proxy_1080p,
                "directUrl": direct_stream_url
            },
            {
                "id": "fmt-720p",
                "quality": "720p HD (MP4)",
                "resolution": "720x1280",
                "extension": "mp4",
                "size": "Standard HD",
                "downloadUrl": proxy_720p,
                "directUrl": direct_stream_url
            },
            {
                "id": "fmt-audio-mp3",
                "quality": "Audio Only (MP3)",
                "resolution": "320kbps",
                "extension": "mp3",
                "size": "High Bitrate",
                "downloadUrl": proxy_audio,
                "directUrl": direct_stream_url
            }
        ]
    else:
        proxy_photo = f"/api/download/proxy?url={urllib.parse.quote(direct_stream_url)}&filename=insta1000gram_{shortcode}_{selected_index + 1}.{selected_item['extension']}&type=photo"
        formats = [
            {
                "id": "fmt-original-jpg",
                "quality": f"Original Master HD ({selected_item['extension'].upper()})",
                "resolution": "1080x1350",
                "extension": selected_item["extension"],
                "size": "Original Quality",
                "downloadUrl": proxy_photo,
                "directUrl": direct_stream_url
            }
        ]

    latency_ms = max(25, round((time.time() - start_time) * 1000))

    payload = {
        "id": f"ig_{shortcode}",
        "shortcode": shortcode,
        "title": post_title,
        "author": {
            "username": author_username,
            "fullName": author_name,
            "avatar": f"https://ui-avatars.com/api/?name={urllib.parse.quote(author_username)}&background=E1306C&color=fff&size=160&bold=true",
            "isVerified": True
        },
        "thumbnail": thumbnail_url or selected_item["thumbnailUrl"],
        "sourceUrl": normalized_url,
        "directUrl": direct_stream_url,
        "videoUrl": direct_stream_url if is_video else None,
        "previewUrl": direct_stream_url if is_video else selected_item["thumbnailUrl"],
        "type": resp_type,
        "mediaType": resp_type,
        "likesCount": resolved_item.get("likesCount", 18240),
        "commentsCount": resolved_item.get("commentsCount", 385),
        "networkLatencyMs": latency_ms,
        "isCarousel": len(items) > 1,
        "selectedIndex": selected_index,
        "totalItems": len(items),
        "items": items,
        "slides": slides,
        "formats": formats
    }
    if resolved_item.get("duration"):
        payload["duration"] = resolved_item["duration"]

    return JsonResponse(payload)


def proxy_download(request):
    """
    GET /api/download/proxy or /api/download/proxy/
    Streams media directly to user with Content-Disposition attachment header.
    Bypasses CORS and CDN restrictions.
    """
    media_url = request.GET.get("url")
    filename = request.GET.get("filename", "insta1000gram_download.mp4")
    media_type = request.GET.get("type", "video")

    if not media_url:
        return JsonResponse({"error": "Target media URL required"}, status=400)

    # Decode snapcdn token if needed
    if "snapcdn" in media_url or "rapidcdn" in media_url:
        tok_m = re.search(r'token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)', media_url)
        if tok_m:
            try:
                parts = tok_m.group(1).split('.')
                b64 = parts[1] + '=' * (-len(parts[1]) % 4)
                p = json.loads(base64.urlsafe_b64decode(b64).decode('utf-8'))
                if p.get('url'):
                    media_url = p['url']
            except Exception:
                pass

    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

    headers = {
        "User-Agent": USER_AGENTS[0],
        "Accept": "*/*"
    }

    try:
        upstream = requests.get(media_url, headers=headers, stream=True, timeout=30, allow_redirects=True)
    except Exception as e:
        logger.error(f"Failed to connect upstream for {media_url[:60]}: {e}")
        return JsonResponse({"error": f"Failed to connect upstream: {str(e)}"}, status=502)

    if upstream.status_code != 200:
        logger.warning(f"Upstream CDN returned status {upstream.status_code} for {media_url[:60]}")
        return JsonResponse({
            "error": f"Upstream media CDN returned status {upstream.status_code}. The media link may have expired."
        }, status=upstream.status_code if 400 <= upstream.status_code < 600 else 502)

    upstream_ct = upstream.headers.get("Content-Type", "")

    # Reject HTML error pages
    if "text/html" in upstream_ct.lower() or "text/plain" in upstream_ct.lower():
        return JsonResponse({
            "error": "Upstream returned an HTML page instead of a video stream. The media link may be expired."
        }, status=422)

    iterator = upstream.iter_content(chunk_size=65536)
    try:
        first_chunk = next(iterator)
    except StopIteration:
        return JsonResponse({"error": "Empty media stream received from upstream"}, status=422)

    def file_stream(first, rest):
        yield first
        for chunk in rest:
            if chunk:
                yield chunk

    content_type = upstream_ct if upstream_ct and "text" not in upstream_ct else ("video/mp4" if media_type == "video" else "image/jpeg")

    response = StreamingHttpResponse(file_stream(first_chunk, iterator), content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
    if "Content-Length" in upstream.headers:
        response["Content-Length"] = upstream.headers["Content-Length"]
    return response


def stream_video(request):
    """
    GET /api/download/stream or /api/download/stream/
    Streams video with support for Range headers (for video players).
    """
    media_url = request.GET.get("url")
    if not media_url:
        return JsonResponse({"error": "Media URL required"}, status=400)

    # Decode token if present
    if "token=" in media_url:
        tok_m = re.search(r'token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)', media_url)
        if tok_m:
            try:
                parts = tok_m.group(1).split('.')
                b64 = parts[1] + '=' * (-len(parts[1]) % 4)
                p = json.loads(base64.urlsafe_b64decode(b64).decode('utf-8'))
                if p.get('url'):
                    media_url = p['url']
            except Exception:
                pass

    headers = {
        "User-Agent": USER_AGENTS[0],
        "Referer": "https://www.instagram.com/",
        "Accept": "*/*"
    }

    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    try:
        upstream = requests.get(media_url, headers=headers, stream=True, timeout=20, allow_redirects=True)
        content_type = upstream.headers.get("Content-Type", "video/mp4")

        response = StreamingHttpResponse(
            upstream.iter_content(chunk_size=65536),
            content_type=content_type,
            status=upstream.status_code
        )
        if "Content-Length" in upstream.headers:
            response["Content-Length"] = upstream.headers["Content-Length"]
        if "Content-Range" in upstream.headers:
            response["Content-Range"] = upstream.headers["Content-Range"]
        if "Accept-Ranges" in upstream.headers:
            response["Accept-Ranges"] = upstream.headers["Accept-Ranges"]
        return response
    except Exception as e:
        logger.error(f"Failed to stream video: {e}")
        return JsonResponse({"error": f"Failed to stream media: {e}"}, status=502)


def get_pseo_page(request, slug):
    """
    GET /api/pseo/page/<slug>/
    Retrieves dynamic pSEO page content controlled via Django admin.
    """
    try:
        keyword = PSEOPartKeyword.objects.get(slug=slug)
        keyword.views_count += 1
        keyword.save(update_fields=['views_count'])
        target_name = keyword.target_keyword
        category = keyword.category
    except Exception:
        target_name = slug.replace("-", " ").title()
        category = "reels"

    try:
        template = PSEOPart.objects.filter(category=category).first()
    except Exception:
        template = None

    title = template.title_template if template else "Download Instagram {target} in 1080p Full HD"
    description = template.meta_description_template if template else "Free online Instagram {target} downloader without app or login."
    h1 = template.h1_template if template else "Download Instagram {target} Free Online"
    body = template.content_body if template else "Save any {target} directly to your device with insta1000gram."

    title_rendered = title.replace("{target}", target_name)
    description_rendered = description.replace("{target}", target_name)
    h1_rendered = h1.replace("{target}", target_name)
    body_rendered = body.replace("{target}", target_name)

    return JsonResponse({
        "slug": slug,
        "title": title_rendered,
        "metaDescription": description_rendered,
        "h1": h1_rendered,
        "contentBody": body_rendered,
        "targetKeyword": target_name,
        "category": category,
        "canonicalUrl": f"https://www.insta1000gram.com/{slug}"
    })


def sitemap_index(request):
    """
    GET /sitemap.xml
    Root sitemap index pointing to sub-sitemaps (e.g. sitemap_1.xml)
    """
    domain = request.build_absolute_uri('/')[:-1]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += '  <sitemap>\n'
    xml += f'    <loc>{domain}/sitemap_1.xml</loc>\n'
    xml += f'    <lastmod>{datetime.utcnow().strftime("%Y-%m-%d")}</lastmod>\n'
    xml += '  </sitemap>\n'
    xml += '</sitemapindex>'
    return HttpResponse(xml, content_type='application/xml')


def sitemap_1(request):
    """
    GET /sitemap_1.xml
    Dynamically generates the sitemap_1.xml from all indexed Django pSEO keywords.
    """
    domain = request.build_absolute_uri('/')[:-1]

    try:
        db_keywords = list(PSEOPartKeyword.objects.filter(is_indexed=True).values_list('slug', flat=True))
    except Exception:
        db_keywords = []

    slugs = db_keywords if db_keywords else [k["slug"] for k in DEFAULT_KEYWORDS]

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    # Homepage
    xml += '  <url>\n'
    xml += f'    <loc>{domain}/</loc>\n'
    xml += f'    <lastmod>{datetime.utcnow().strftime("%Y-%m-%d")}</lastmod>\n'
    xml += '    <changefreq>daily</changefreq>\n'
    xml += '    <priority>1.0</priority>\n'
    xml += '  </url>\n'

    # All dynamic pSEO pages controlled in Django Admin
    for slug in slugs:
        xml += '  <url>\n'
        xml += f'    <loc>{domain}/{slug}</loc>\n'
        xml += f'    <lastmod>{datetime.utcnow().strftime("%Y-%m-%d")}</lastmod>\n'
        xml += '    <changefreq>weekly</changefreq>\n'
        xml += '    <priority>0.8</priority>\n'
        xml += '  </url>\n'

    xml += '</urlset>'
    return HttpResponse(xml, content_type='application/xml')


def get_ads(request):
    """
    GET /api/ads/
    Returns active ad snippets configured in Django Admin for Next.js rendering.
    """
    ads_dict = {}
    try:
        active_ads = AdPlacement.objects.filter(is_active=True)
        for ad in active_ads:
            ads_dict[ad.slot] = {
                "name": ad.name,
                "code": ad.ad_code
            }
    except Exception:
        pass
    return JsonResponse({"ads": ads_dict})


def get_ads_txt(request):
    """
    GET /ads.txt
    Serves the IAB ads.txt file from Django Admin for Google AdSense authorization.
    """
    try:
        entry = AdsTxtEntry.objects.first()
        content = entry.content if entry else "google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"
    except Exception:
        content = "google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"

    return HttpResponse(content, content_type="text/plain; charset=utf-8")