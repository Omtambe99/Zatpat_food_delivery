import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { haversineMeters, extractCoords, isWithinRadius } from "../utils/geo.js";
import {
  BATCH_RADIUS_M,
  BATCH_MAX_MEMBERS,
  FREE_DELIVERY_ABOVE,
  DISCOUNT_TIERS
} from "../config/batch.config.js";

describe("Geospatial & Configuration Test Suite", () => {
  describe("haversineMeters", () => {
    it("should return 0 meters for identical coordinates", () => {
      const lat = 18.9220;
      const lon = 72.8347;
      const dist = haversineMeters(lat, lon, lat, lon);
      assert.strictEqual(dist, 0);
    });

    it("should compute accurate distance between known landmarks (Gateway of India to CST Station)", () => {
      // Gateway of India: 18.9220, 72.8347
      // CSMT Station: 18.9401, 72.8354
      // Great-circle distance is approx 2015 meters (~2.0 km)
      const dist = haversineMeters(18.9220, 72.8347, 18.9401, 72.8354);
      assert.ok(dist >= 2000 && dist <= 2030, `Expected ~2015m, got ${dist}m`);
    });

    it("should measure small distances accurately (~111 meters per 0.001 deg lat)", () => {
      const lat1 = 19.0000;
      const lon1 = 72.8500;
      const lat2 = 19.0010; // +0.001 deg lat is ~111 meters
      const lon2 = 72.8500;
      const dist = haversineMeters(lat1, lon1, lat2, lon2);
      assert.ok(dist >= 110 && dist <= 112, `Expected ~111m, got ${dist}m`);
    });
  });

  describe("extractCoords", () => {
    it("should extract coordinates from GeoJSON Point object", () => {
      const point = { type: "Point", coordinates: [72.85, 19.05] };
      const coords = extractCoords(point);
      assert.deepStrictEqual(coords, { lat: 19.05, lon: 72.85 });
    });

    it("should extract coordinates from [lon, lat] array", () => {
      const array = [72.85, 19.05];
      const coords = extractCoords(array);
      assert.deepStrictEqual(coords, { lat: 19.05, lon: 72.85 });
    });

    it("should extract coordinates from { latitude, longitude } object", () => {
      const obj = { latitude: 19.05, longitude: 72.85 };
      const coords = extractCoords(obj);
      assert.deepStrictEqual(coords, { lat: 19.05, lon: 72.85 });
    });

    it("should extract coordinates from { lat, lng } object", () => {
      const obj = { lat: 19.05, lng: 72.85 };
      const coords = extractCoords(obj);
      assert.deepStrictEqual(coords, { lat: 19.05, lon: 72.85 });
    });

    it("should return null for invalid inputs", () => {
      assert.strictEqual(extractCoords(null), null);
      assert.strictEqual(extractCoords(undefined), null);
      assert.strictEqual(extractCoords({}), null);
    });
  });

  describe("isWithinRadius (300m Neighbor Batch threshold)", () => {
    const anchor = { coordinates: [72.850000, 19.000000] };

    it("should return true for a neighbor 100 meters away", () => {
      // 0.0009 deg lat ~ 100m
      const neighbor = { coordinates: [72.850000, 19.000900] };
      assert.strictEqual(isWithinRadius(anchor, neighbor, BATCH_RADIUS_M), true);
    });

    it("should return true for a neighbor right at 250 meters", () => {
      // 0.0022 deg lat ~ 245m
      const neighbor = { coordinates: [72.850000, 19.002200] };
      assert.strictEqual(isWithinRadius(anchor, neighbor, BATCH_RADIUS_M), true);
    });

    it("should return false for a neighbor outside the 300m radius (~400m)", () => {
      // 0.0036 deg lat ~ 400m
      const neighbor = { coordinates: [72.850000, 19.003600] };
      assert.strictEqual(isWithinRadius(anchor, neighbor, BATCH_RADIUS_M), false);
    });
  });

  describe("Configuration & Tier Lookup", () => {
    it("should match required discount tiers: { 1: 0, 2: 0.3, 3: 0.5, 4: 0.65, 5: 0.8 }", () => {
      assert.deepStrictEqual(DISCOUNT_TIERS, {
        1: 0,
        2: 0.3,
        3: 0.5,
        4: 0.65,
        5: 0.8
      });
    });

    it("should have correct batch constants", () => {
      assert.strictEqual(BATCH_RADIUS_M, 300);
      assert.strictEqual(BATCH_MAX_MEMBERS, 5);
      assert.strictEqual(FREE_DELIVERY_ABOVE, 500);
    });
  });
});
