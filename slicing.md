Tolong bertindak sebagai Senior Front-End Engineer. Saya melampirkan gambar referensi desain UI. Tugasmu adalah melakukan *slicing* visual pada gambar ini dan menerjemahkan strukturnya menjadi format Markdown komprehensif. Saya akan menyimpan *output* ini sebagai file [`design.md`](http://design.md) untuk panduan *coding*.

Berikan *output* murni dalam format Markdown dengan struktur berikut:

**1. Design System &amp; Tokens**

- **Colors**: Ekstrak palet warna (Primary, Secondary, Background, Surface, Text, Accent). Berikan estimasi kode HEX yang paling mendekati.
- **Typography**: Identifikasi hierarki teks (H1, H2, Subtitle, Body, Caption) beserta estimasi ukuran (*font-size* dalam `px` atau `rem`), ketebalan (*font-weight*), dan warna spesifiknya.
- **Spacing &amp; Radii**: Analisis konsistensi *padding*, *margin*, dan *border-radius* (misal: `4px`, `8px`, `16px`, atau melengkung penuh/pil).

**2. Layout &amp; Anatomy**

- Bongkar struktur halaman dari atas ke bawah (misal: Top Navigation &gt; Hero Banner &gt; Product Grid &gt; Footer).
- Rekomendasikan strategi *layouting* CSS yang paling tepat (Flexbox, CSS Grid, atau Absolute Positioning) untuk setiap seksi pembungkus utama.

**3. Component Breakdown** Daftarkan komponen UI mandiri (*reusable components*) yang ditemukan di layar (seperti Buttons, Cards, Input Fields, Badges). Untuk setiap komponen, jelaskan:

- Komposisi elemen internal (misal: Ikon di kiri, teks di tengah).
- Gaya visual spesifik (efek *box-shadow*, ketebalan *border*).
- Asumsi *behavior* atau *state* interaktif (bagaimana tampilannya saat *hover*, *focus*, atau *disabled*).

**4. Assets Checklist**

- Buat daftar inventarisasi aset berupa ikon, ilustrasi, atau gambar bitmap yang perlu saya *export* atau siapkan secara terpisah sebelum proses *coding* dimulai.

Gunakan penataan Markdown yang profesional dengan *heading* (`##`, `###`), *bullet points*, dan tabel (*markdown tables*) untuk menyajikan palet warna dan tipografi agar rapi dan mudah dibaca.