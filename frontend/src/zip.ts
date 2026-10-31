/*
 * Minimales ZIP ohne Abhängigkeiten: Schreiben mit Deflate über `CompressionStream`,
 * Lesen von unkomprimierten und Deflate-Einträgen (`DecompressionStream`).
 * Keine ZIP64-, Verschlüsselungs- oder Mehrteil-Unterstützung – reicht für Datensicherungen.
 */

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const blob = new Blob([data as BlobPart])
  return new Uint8Array(await new Response(blob.stream().pipeThrough(stream)).arrayBuffer())
}

/** DOS-Zeitstempel (lokale Zeit) */
function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const encoder = new TextEncoder()
  const { time, day } = dosDateTime(new Date())
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const compressed = await pipe(entry.data, new CompressionStream('deflate-raw'))
    const crc = crc32(entry.data)

    const header = (size: number) => {
      const buf = new Uint8Array(size)
      const view = new DataView(buf.buffer)
      return { buf, view }
    }
    // Gemeinsame Felder von lokalem und zentralem Header ab „version needed“
    const common = (view: DataView, at: number) => {
      view.setUint16(at, 20, true) // Version 2.0
      view.setUint16(at + 2, 0x0800, true) // UTF-8-Dateinamen
      view.setUint16(at + 4, 8, true) // Deflate
      view.setUint16(at + 6, time, true)
      view.setUint16(at + 8, day, true)
      view.setUint32(at + 10, crc, true)
      view.setUint32(at + 14, compressed.length, true)
      view.setUint32(at + 18, entry.data.length, true)
      view.setUint16(at + 22, name.length, true)
    }

    const local = header(30 + name.length)
    local.view.setUint32(0, 0x04034b50, true)
    common(local.view, 4)
    local.buf.set(name, 30)
    parts.push(local.buf, compressed)

    const dir = header(46 + name.length)
    dir.view.setUint32(0, 0x02014b50, true)
    dir.view.setUint16(4, 20, true) // erstellt mit Version 2.0
    common(dir.view, 6)
    dir.view.setUint32(42, offset, true)
    dir.buf.set(name, 46)
    central.push(dir.buf)

    offset += local.buf.length + compressed.length
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0)
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, entries.length, true)
  view.setUint16(10, entries.length, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end] as BlobPart[], { type: 'application/zip' })
}

export const isZip = (data: Uint8Array) => data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04

export async function readZip(data: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  // Ende des zentralen Verzeichnisses von hinten suchen (max. 64 KiB Kommentar)
  let end = -1
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('Ungültige ZIP-Datei.')

  const count = view.getUint16(end + 10, true)
  let pos = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Ungültige ZIP-Datei.')
    const method = view.getUint16(pos + 10, true)
    const compressedSize = view.getUint32(pos + 20, true)
    const nameLength = view.getUint16(pos + 28, true)
    const extraLength = view.getUint16(pos + 30, true)
    const commentLength = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const name = decoder.decode(data.subarray(pos + 46, pos + 46 + nameLength))
    pos += 46 + nameLength + extraLength + commentLength

    if (name.endsWith('/')) continue // Verzeichnis
    const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
    const raw = data.subarray(start, start + compressedSize)
    if (method === 0) entries.push({ name, data: raw })
    else if (method === 8) entries.push({ name, data: await pipe(raw, new DecompressionStream('deflate-raw')) })
    else throw new Error(`${name}: nicht unterstützte Kompression.`)
  }
  return entries
}
