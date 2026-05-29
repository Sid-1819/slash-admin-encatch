/**
 * Side-effect module: install Encatch test fetch patch before the SDK loads.
 * Import this first from main.tsx.
 */
import { installEncatchDeviceInfoTestFetchPatch } from "./device-info";

installEncatchDeviceInfoTestFetchPatch();
