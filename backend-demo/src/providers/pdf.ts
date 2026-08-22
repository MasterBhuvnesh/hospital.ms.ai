import PDFDocument from 'pdfkit'

type Section = { heading?: string; rows?: [string, string][]; table?: { columns: string[]; rows: string[][] }; text?: string }

function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

export async function renderPdf(title: string, subtitle: string, sections: Section[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: title } })
  const promise = docToBuffer(doc)

  doc.rect(0, 0, 595, 90).fill('#134e4a')
  doc.fill('#ffffff').font('Helvetica-Bold').fontSize(20).text('ATELIER HEALTH', 50, 28)
  doc.font('Helvetica').fontSize(10).text(subtitle, 50, 56)

  let y = 120
  doc.fill('#111111')
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text(title, 50, y)
  y += 34

  for (const s of sections) {
    if (s.heading) {
      if (y > 700) { doc.addPage(); y = 60 }
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke()
      y += 12
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#134e4a').text(s.heading.toUpperCase(), 50, y)
      y += 20
    }
    if (s.text) {
      doc.font('Helvetica').fontSize(11).fillColor('#333333').text(s.text, 50, y, { width: 495 })
      y = doc.y + 14
    }
    if (s.rows) {
      for (const [k, v] of s.rows) {
        if (y > 740) { doc.addPage(); y = 60 }
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#555555').text(k, 50, y, { width: 160 })
        doc.font('Helvetica').fontSize(10.5).fillColor('#111111').text(v ?? '', 220, y, { width: 325 })
        y = Math.max(doc.y, y + 18) + 4
      }
      y += 8
    }
    if (s.table) {
      const colW = 495 / s.table.columns.length
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#555555')
      s.table.columns.forEach((c, i) => doc.text(c, 50 + i * colW, y, { width: colW - 6 }))
      y += 16
      doc.font('Helvetica').fontSize(9.5).fillColor('#111111')
      for (const row of s.table.rows) {
        if (y > 750) { doc.addPage(); y = 60 }
        row.forEach((cell, i) => doc.text(cell ?? '', 50 + i * colW, y, { width: colW - 6 }))
        y = Math.max(doc.y, y + 14) + 3
      }
      y += 10
    }
  }

  doc.fontSize(8).fillColor('#999999').text(
    `Generated ${new Date().toISOString()} - demo document, not a legal record`,
    50,
    780,
    { lineBreak: false },
  )

  return promise
}

export function simpleTable(columns: string[], rows: string[][]) {
  return { columns, rows }
}
