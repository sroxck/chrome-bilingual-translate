import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

function crc32(buf) {
  let crc = ~0
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function cy(size) {
  return (size - 1) / 2
}

function createPng(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const cx = (size - 1) / 2
  const radius = size * 0.46

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy(size)
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4
      if (dist <= radius) {
        pixels[i] = 37
        pixels[i + 1] = 99
        pixels[i + 2] = 235
        pixels[i + 3] = 255
      }
    }
  }

  drawGlyph(pixels, size)

  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function setPixel(pixels, size, x, y) {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const i = (y * size + x) * 4
  pixels[i] = 255
  pixels[i + 1] = 255
  pixels[i + 2] = 255
  pixels[i + 3] = 255
}

function fillRect(pixels, size, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(pixels, size, xx, yy)
  }
}

function drawGlyph(pixels, size) {
  const s = size / 128
  fillRect(pixels, size, Math.round(38 * s), Math.round(32 * s), Math.round(52 * s), Math.round(8 * s))
  fillRect(pixels, size, Math.round(58 * s), Math.round(32 * s), Math.round(12 * s), Math.round(64 * s))
  fillRect(pixels, size, Math.round(44 * s), Math.round(70 * s), Math.round(40 * s), Math.round(8 * s))
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')
mkdirSync(dir, { recursive: true })
for (const size of [16, 48, 128]) {
  writeFileSync(join(dir, `icon${size}.png`), createPng(size))
}
