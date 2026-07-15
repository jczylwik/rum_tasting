import json
import os
import mimetypes
import queue
import threading
import base64
import hashlib
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / 'web'
DATA_FILE = ROOT / 'data.json'
SUBSCRIBERS = set()
SUBSCRIBERS_LOCK = threading.Lock()
DEFAULT_STATE = {
    'participants': [],
    'ratings': {},
    'activeParticipantId': None,
    'activeCategory': 'rum',
    'activeItemId': None,
    'ratingEvents': [],
    'comments': [],
    'customRums': [],
}

backup_url_b64 = os.environ.get('BACKUP_CONTAINER_SAS_URL_B64', '').strip()
if backup_url_b64:
    try:
        BACKUP_CONTAINER_SAS_URL = base64.b64decode(backup_url_b64).decode('utf-8').strip()
    except Exception:
        BACKUP_CONTAINER_SAS_URL = ''
else:
    BACKUP_CONTAINER_SAS_URL = os.environ.get('BACKUP_CONTAINER_SAS_URL', '').strip()
BACKUP_PREFIX = os.environ.get('BACKUP_PREFIX', 'state').strip() or 'state'
BACKUP_MIN_INTERVAL_SECONDS = max(1, int(os.environ.get('BACKUP_MIN_INTERVAL_SECONDS', '300')))

BACKUP_LOCK = threading.Lock()
BACKUP_LAST_UPLOAD_TS = 0.0
BACKUP_LAST_SIGNATURE = ''
BACKUP_PENDING_STATE = None
BACKUP_PENDING_SIGNATURE = ''
BACKUP_TIMER = None


def _state_signature(state):
    payload = json.dumps(state, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()


def upload_backup_to_azure_blob(state):
    if not BACKUP_CONTAINER_SAS_URL:
        return False

    try:
        ts = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        blob_name = f'{BACKUP_PREFIX}-{ts}.json'
        container_url, _, sas_query = BACKUP_CONTAINER_SAS_URL.partition('?')
        if not container_url:
            return

        upload_url = f"{container_url.rstrip('/')}/{blob_name}"
        if sas_query:
            upload_url = f'{upload_url}?{sas_query}'

        payload = json.dumps(state, ensure_ascii=False, indent=2).encode('utf-8')
        req = Request(upload_url, data=payload, method='PUT')
        req.add_header('x-ms-blob-type', 'BlockBlob')
        req.add_header('Content-Type', 'application/json; charset=utf-8')
        req.add_header('Content-Length', str(len(payload)))
        # Explicit API version keeps request behavior stable across environments.
        req.add_header('x-ms-version', '2021-12-02')
        with urlopen(req, timeout=15):
            pass
        return True
    except Exception as exc:
        print(f'Backup upload failed: {exc}')
        return False


def _schedule_pending_backup(delay_seconds):
    global BACKUP_TIMER
    BACKUP_TIMER = threading.Timer(delay_seconds, flush_pending_backup)
    BACKUP_TIMER.daemon = True
    BACKUP_TIMER.start()


def schedule_backup(state):
    global BACKUP_PENDING_STATE, BACKUP_PENDING_SIGNATURE
    if not BACKUP_CONTAINER_SAS_URL:
        return

    signature = _state_signature(state)
    state_copy = json.loads(json.dumps(state, ensure_ascii=False))

    with BACKUP_LOCK:
        if signature == BACKUP_LAST_SIGNATURE:
            return

        BACKUP_PENDING_STATE = state_copy
        BACKUP_PENDING_SIGNATURE = signature

        if BACKUP_TIMER is not None:
            return

        now = time.time()
        elapsed = now - BACKUP_LAST_UPLOAD_TS
        delay_seconds = 0 if elapsed >= BACKUP_MIN_INTERVAL_SECONDS else BACKUP_MIN_INTERVAL_SECONDS - elapsed
        _schedule_pending_backup(delay_seconds)


def flush_pending_backup():
    global BACKUP_LAST_UPLOAD_TS, BACKUP_LAST_SIGNATURE, BACKUP_PENDING_STATE, BACKUP_PENDING_SIGNATURE, BACKUP_TIMER

    with BACKUP_LOCK:
        BACKUP_TIMER = None
        pending_state = BACKUP_PENDING_STATE
        pending_signature = BACKUP_PENDING_SIGNATURE
        BACKUP_PENDING_STATE = None
        BACKUP_PENDING_SIGNATURE = ''

    if not pending_state:
        return

    try:
        upload_ok = upload_backup_to_azure_blob(pending_state)
        if not upload_ok:
            raise RuntimeError('backup upload returned false')
        with BACKUP_LOCK:
            BACKUP_LAST_UPLOAD_TS = time.time()
            BACKUP_LAST_SIGNATURE = pending_signature
            has_more_pending = BACKUP_PENDING_STATE is not None
            if has_more_pending and BACKUP_TIMER is None:
                _schedule_pending_backup(BACKUP_MIN_INTERVAL_SECONDS)
    except Exception:
        with BACKUP_LOCK:
            # Requeue the pending state and retry later.
            if BACKUP_PENDING_STATE is None:
                BACKUP_PENDING_STATE = pending_state
                BACKUP_PENDING_SIGNATURE = pending_signature
            if BACKUP_TIMER is None:
                _schedule_pending_backup(BACKUP_MIN_INTERVAL_SECONDS)


def load_state():
    if not DATA_FILE.exists():
        return dict(DEFAULT_STATE)
    try:
        # utf-8-sig accepts both UTF-8 with and without BOM.
        with DATA_FILE.open('r', encoding='utf-8-sig') as fh:
            loaded = json.load(fh)
    except (json.JSONDecodeError, UnicodeDecodeError):
        loaded = {}

    return {
        **DEFAULT_STATE,
        **loaded,
        'participants': loaded.get('participants') or [],
        'ratings': loaded.get('ratings') or {},
        'ratingEvents': loaded.get('ratingEvents') or [],
        'comments': loaded.get('comments') or [],
        'customRums': loaded.get('customRums') or [],
    }


def save_state(state):
    with DATA_FILE.open('w', encoding='utf-8') as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)


def broadcast_state_event():
    # Small JSON payload; clients fetch the full state via /api/state.
    payload = json.dumps({'type': 'state-updated'})
    with SUBSCRIBERS_LOCK:
        subscribers = list(SUBSCRIBERS)

    for subscriber in subscribers:
        try:
            subscriber.put_nowait(payload)
        except queue.Full:
            # Drop events for slow clients; they will receive the next one.
            pass


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json({}, 204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/healthz':
            self._send_json({'status': 'ok'}, 200)
            return

        if parsed.path == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('X-Accel-Buffering', 'no')
            self.end_headers()

            subscriber = queue.Queue(maxsize=16)
            with SUBSCRIBERS_LOCK:
                SUBSCRIBERS.add(subscriber)

            try:
                self.wfile.write(b': connected\n\n')
                self.wfile.flush()
                while True:
                    try:
                        payload = subscriber.get(timeout=20)
                        frame = f'data: {payload}\n\n'.encode('utf-8')
                    except queue.Empty:
                        frame = b': keep-alive\n\n'

                    self.wfile.write(frame)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with SUBSCRIBERS_LOCK:
                    SUBSCRIBERS.discard(subscriber)
            return

        if parsed.path == '/api/state':
            self._send_json(load_state())
            return

        relative = parsed.path.lstrip('/')
        if not relative:
            target = (WEB_ROOT / 'index.html').resolve()
            allowed_root = WEB_ROOT
        elif relative.startswith('legacy/'):
            target = (ROOT / relative).resolve()
            allowed_root = ROOT
        else:
            target = (WEB_ROOT / relative).resolve()
            allowed_root = WEB_ROOT

        if allowed_root not in target.parents and target != allowed_root:
            self._send_json({'error': 'forbidden'}, 403)
            return

        if not target.exists() or not target.is_file():
            self._send_json({'error': 'not found'}, 404)
            return

        mime_type, _ = mimetypes.guess_type(str(target))
        if mime_type is None:
            mime_type = 'application/octet-stream'

        data = target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Length', str(len(data)))
        if target.name in {'index.html', 'app.js', 'sw.js'}:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/state':
            self._send_json({'error': 'not found'}, 404)
            return

        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length).decode('utf-8')
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json({'error': 'invalid json'}, 400)
            return

        state = load_state()
        if 'participants' in payload:
            state['participants'] = payload['participants']
        if 'ratings' in payload:
            state['ratings'] = payload['ratings']
        if 'activeParticipantId' in payload:
            state['activeParticipantId'] = payload['activeParticipantId']
        if 'activeCategory' in payload:
            state['activeCategory'] = payload['activeCategory']
        if 'activeItemId' in payload:
            state['activeItemId'] = payload['activeItemId']
        if 'ratingEvents' in payload:
            state['ratingEvents'] = payload['ratingEvents']
        if 'comments' in payload:
            state['comments'] = payload['comments']
        if 'customRums' in payload:
            state['customRums'] = payload['customRums']
        save_state(state)
        broadcast_state_event()
        schedule_backup(state)
        self._send_json(state)

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'Serving on port {port}')
    server.serve_forever()
