import { getSettings } from "../repositories/settings.js";

export async function verifyParentPin(db, pin) {
  const credential = (await getSettings(db))?.pinCredential;
  if (!credential || !/^\d{4}$/.test(String(pin))) return false;
  const salt = fromHex(credential.salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: credential.iterations,
    hash: "SHA-256",
  }, key, 256);
  return toHex(new Uint8Array(hash)) === credential.hash;
}

function fromHex(value) {
  return new Uint8Array(value.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

function toHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
