# packages/pdf

Prescription, invoice and lab report templates.

`@react-pdf/renderer`, rendering to a stream in-process. No headless browser in the image.

Noto Sans and Noto Sans Devanagari are embedded here. Patient names arrive in Indian scripts and a missing glyph on a prescription is not a cosmetic bug.

Golden-file tests require pinning `CreationDate`, `ModDate` and the document id from the record's own `createdAt`, because PDF writers embed a timestamp by default and the test would otherwise flake on the first run.

Imported as `@hms/pdf`.
