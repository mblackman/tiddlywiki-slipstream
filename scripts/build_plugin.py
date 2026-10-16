#!/usr/bin/env python3
"""
Compiles the unpacked TiddlyWiki plugin folder (`plugins/mblackman/slipstream`)
into the drag-and-drop JSON bundle (`dist/slipstream-plugin.json`).

Usage:
    python3 scripts/build_plugin.py
"""

import json
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN_SRC = os.path.join(ROOT_DIR, "plugins", "mblackman", "slipstream")
DIST_JSON = os.path.join(ROOT_DIR, "dist", "slipstream-plugin.json")


def parse_tid_file(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    parts = raw.split("\n\n", 1)
    headers = {}
    for line in parts[0].splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip()] = v.strip()
    headers["text"] = parts[1] if len(parts) > 1 else ""
    return headers


def parse_meta_file(css_path, meta_path):
    with open(css_path, "r", encoding="utf-8") as f:
        css_text = f.read()
    with open(meta_path, "r", encoding="utf-8") as f:
        meta_raw = f.read()
    headers = {}
    for line in meta_raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip()] = v.strip()
    headers["text"] = css_text
    return headers


def parse_js_file(js_path):
    with open(js_path, "r", encoding="utf-8") as f:
        js_text = f.read()
    headers = {}
    if js_text.startswith("/*\\"):
        end_idx = js_text.find("\\*/")
        if end_idx != -1:
            header_block = js_text[3:end_idx].strip()
            for line in header_block.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    headers[k.strip()] = v.strip()
    headers["text"] = js_text
    return headers


def main():
    with open(os.path.join(PLUGIN_SRC, "plugin.info"), "r", encoding="utf-8") as f:
        plugin_info = json.load(f)

    tiddlers = {}
    for root, _, files in os.walk(PLUGIN_SRC):
        for file in sorted(files):
            if file == "plugin.info" or file.endswith(".meta"):
                continue
            full_path = os.path.join(root, file)
            if file.endswith(".tid"):
                t_obj = parse_tid_file(full_path)
                tiddlers[t_obj["title"]] = t_obj
            elif file.endswith(".css") and os.path.exists(full_path + ".meta"):
                t_obj = parse_meta_file(full_path, full_path + ".meta")
                tiddlers[t_obj["title"]] = t_obj
            elif file.endswith(".js"):
                t_obj = parse_js_file(full_path)
                if "title" in t_obj:
                    tiddlers[t_obj["title"]] = t_obj

    packaged = [
        {
            **plugin_info,
            "type": "application/json",
            "text": json.dumps({"tiddlers": tiddlers}, indent=2),
        }
    ]
    os.makedirs(os.path.dirname(DIST_JSON), exist_ok=True)
    with open(DIST_JSON, "w", encoding="utf-8") as f:
        json.dump(packaged, f, indent=2)
    print(f"Built {DIST_JSON} with {len(tiddlers)} shadow tiddlers.")


if __name__ == "__main__":
    main()
