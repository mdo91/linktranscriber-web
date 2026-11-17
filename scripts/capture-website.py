"""Capture production Damas views using explicit DEBUG-only, offline website fixtures."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

DEVICE = os.environ['DAMAS_CAPTURE_DEVICE']
BUNDLE = 'com.damas.ai.recording.storecapture'
APP = Path(os.environ['DAMAS_CAPTURE_IOS_APP'])
OUTPUT = Path(os.environ.get('DAMAS_CAPTURE_OUTPUT_DIR', '.marketing/captures'))
ENV = dict(os.environ, DEVELOPER_DIR=os.environ.get('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer'))
SIM = str(Path(ENV['DEVELOPER_DIR']) / 'usr/bin/simctl')

def sim(*args, check=True, timeout=55):
    return subprocess.run([SIM, *args], env=ENV, check=check, capture_output=True, text=True, timeout=timeout)

if not APP.is_dir():
    raise RuntimeError('DAMAS_CAPTURE_IOS_APP must identify the isolated capture build')
inventory = json.loads(sim('list', 'devices', 'available', '--json').stdout)
device = next((d for group in inventory['devices'].values() for d in group if d['udid'] == DEVICE), None)
if device is None:
    raise RuntimeError('Selected simulator is unavailable')
was_shutdown = device['state'] == 'Shutdown'
OUTPUT.mkdir(parents=True, exist_ok=True)
installed = False
status_overridden = False
try:
    if was_shutdown:
        sim('boot', DEVICE)
    # A new simulator may need more than a minute for its first boot.
    sim('bootstatus', DEVICE, '-b', timeout=120)
    sim('install', DEVICE, str(APP))
    installed = True
    container = Path(sim('get_app_container', DEVICE, BUNDLE, 'data').stdout.strip())
    marker = container / 'Documents/store-capture.png'
    sim('status_bar', DEVICE, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--batteryState', 'charged', '--batteryLevel', '100')
    status_overridden = True
    for scene in os.environ.get('DAMAS_CAPTURE_SCENES', 'transcript,summary,mind-map,checklist,quiz,flashcards').split(','):
        sim('terminate', DEVICE, BUNDLE, check=False)
        marker.unlink(missing_ok=True)
        sim('launch', DEVICE, BUNDLE, '-ui-testing', '-ui-test-screen', 'recordingDetails', '-website-capture', '-website-scene', scene, '-store-capture', '-AppleLanguages', '(en)', '-AppleLocale', 'en_US')
        deadline = time.monotonic() + 25
        while not marker.exists() and time.monotonic() < deadline:
            time.sleep(.2)
        if not marker.exists():
            raise RuntimeError('Capture readiness marker missing for ' + scene)
        time.sleep(4)
        target = OUTPUT / (scene + '.png')
        sim('io', DEVICE, 'screenshot', str(target))
        print('Captured ' + str(target), flush=True)
finally:
    cleanup = []
    if installed:
        cleanup.append(('terminate', DEVICE, BUNDLE))
    if status_overridden:
        cleanup.append(('status_bar', DEVICE, 'clear'))
    if was_shutdown:
        cleanup.append(('shutdown', DEVICE))
    for command in cleanup:
        try:
            sim(*command, check=False, timeout=20)
        except (subprocess.SubprocessError, OSError) as error:
            print(f'Could not restore simulator state: {error}', file=sys.stderr)

(OUTPUT / 'provenance.json').write_text(json.dumps({
    'product': 'Damas', 'captured_on': time.strftime('%Y-%m-%d'), 'device': device['name'],
    'device_uuid': DEVICE, 'bundle_id': BUNDLE, 'configuration': os.environ.get('DAMAS_CAPTURE_CONFIGURATION', 'DEBUG-enabled capture build'),
    'data': 'Original offline sample: Make room for focused work',
    'renderer': 'Production SwiftUI RecordingDetailsView and InsightResultView',
    'network_processing': False, 'purchases': False,
    'scenes': ['transcript', 'summary', 'mind-map', 'checklist', 'quiz', 'flashcards'],
    'map_capture_zoom': 0.65,
    'interaction_state': {'checklist': 'First two actions checked', 'quiz': 'First answer selected correctly with explanation', 'flashcards': 'First answer revealed'},
}, indent=2) + '\n')
