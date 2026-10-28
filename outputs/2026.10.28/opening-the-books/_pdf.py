def pdf_from_jpegs(files):
    """Stable PDF 1.4 image deck: fixed object order, no timestamps or random IDs."""
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'']
    pages = []
    for jpeg in files:
        page_id = len(objects) + 1
        pages.append(page_id)
        content = b'q 960 0 0 540 0 0 cm /Slide Do Q\n'
        objects.extend([
            f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /XObject << /Slide {page_id+2} 0 R >> >> /Contents {page_id+1} 0 R >>'.encode(),
            f'<< /Length {len(content)} >>\nstream\n'.encode() + content + b'endstream',
            f'<< /Type /XObject /Subtype /Image /Width 1920 /Height 1080 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg)} >>\nstream\n'.encode() + jpeg + b'\nendstream',
        ])
    objects[1] = f'<< /Type /Pages /Count {len(pages)} /Kids [ {" ".join(f"{n} 0 R" for n in pages)} ] >>'.encode()
    result = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result.extend(f'{number} 0 obj\n'.encode() + obj + b'\nendobj\n')
    xref = len(result)
    result.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:
        result.extend(f'{offset:010d} 00000 n \n'.encode())
    result.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return bytes(result)
