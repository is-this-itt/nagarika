"""Minimal KML -> GeoJSON conversion (polygons only), keeping every attribute."""
import re
import xml.etree.ElementTree as ET

from shapely.geometry import MultiPolygon, Polygon, mapping


def _local(tag):
    return tag.rsplit("}", 1)[-1]


def _coords(text):
    pts = []
    for tok in text.split():
        parts = tok.split(",")
        if len(parts) >= 2:
            pts.append((round(float(parts[0]), 6), round(float(parts[1]), 6)))
    return pts


def _polygons(pm):
    polys = []
    for poly in pm.iter():
        if _local(poly.tag) != "Polygon":
            continue
        outer, inner = None, []
        for el in poly.iter():
            t = _local(el.tag)
            if t in ("outerBoundaryIs", "innerBoundaryIs"):
                ring = next((c for c in el.iter() if _local(c.tag) == "coordinates"), None)
                if ring is None or not ring.text:
                    continue
                pts = _coords(ring.text)
                if len(pts) < 4:
                    continue
                if t == "outerBoundaryIs":
                    outer = pts
                else:
                    inner.append(pts)
        if outer:
            polys.append(Polygon(outer, inner))
    return polys


def _props(pm):
    props = {}
    for el in pm.iter():
        t = _local(el.tag)
        if t == "name" and el.text:
            props.setdefault("name", el.text.strip())
        elif t == "SimpleData":
            props[el.get("name")] = (el.text or "").strip()
        elif t == "Data":
            v = next((c for c in el if _local(c.tag) == "value"), None)
            props[el.get("name")] = (v.text or "").strip() if v is not None else ""
        elif t == "description" and el.text:
            # Many KMLs carry attributes as an HTML table in the description.
            for k, v in re.findall(r"<td>([^<]+)</td>\s*<td>([^<]*)</td>", el.text):
                props.setdefault(k.strip(), v.strip())
    return props


def kml_to_features(data, simplify=0.00005):
    root = ET.fromstring(data)
    feats = []
    for pm in root.iter():
        if _local(pm.tag) != "Placemark":
            continue
        polys = [p.buffer(0) if not p.is_valid else p for p in _polygons(pm)]
        if not polys:
            continue
        geom = polys[0] if len(polys) == 1 else MultiPolygon(
            [g for p in polys for g in (p.geoms if hasattr(p, "geoms") else [p])])
        if simplify:
            geom = geom.simplify(simplify, preserve_topology=True)
        feats.append({"type": "Feature", "properties": _props(pm), "geometry": mapping(geom)})
    return feats
