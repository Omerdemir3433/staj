# Test Kullanicilari

Uygulama ilk calistirildiginda `prisma/seed.ts` scripti ile olusturulan
ornek veriler asagidaki gibidir. Tum sifreler asagida belirtilmistir.

---

## Personel Giris Hesaplari

### Yonetici
| Ad Soyad | E-posta | Sifre | Rol | Birim |
|----------|---------|-------|-----|-------|
| Sistem Yoneticisi | admin@mersin.edu.tr | `admin1234` | ADMIN | Bilgi Islem |

### Birim Mudurleri
| Ad Soyad | E-posta | Sifre | Rol | Birim |
|----------|---------|-------|-----|-------|
| Ogrenci Isleri Muduru | ogrenci.isleri.mudur@mersin.edu.tr | `ogrenci123` | UNIT_MANAGER | Ogrenci Isleri |
| Bilgi Islem Muduru | bilgi.islem.mudur@mersin.edu.tr | `bilgi123` | UNIT_MANAGER | Bilgi Islem |

### Birim Personelleri
| Ad Soyad | E-posta | Sifre | Rol | Birim |
|----------|---------|-------|-----|-------|
| Elif Kaya | elif.kaya@mersin.edu.tr | `birim123` | UNIT_STAFF | Ogrenci Isleri |
| Murat Yilmaz | murat.yilmaz@mersin.edu.tr | `birim123` | UNIT_STAFF | Bilgi Islem |

---

## Ogrenci Giris Hesaplari

| Ad Soyad | E-posta | Sifre | Rol | Ogrenci No | Bolum |
|----------|---------|-------|-----|------------|-------|
| Ahmet Cetin | ahmet.cetin@std.mersin.edu.tr | `student123` | STUDENT | 2023001234 | Bilgisayar Muhendisligi |
| Zeynep Arslan | zeynep.arslan@std.mersin.edu.tr | `student123` | STUDENT | 2023001235 | Elektrik Muhendisligi |
| Ali Demir | ali.demir@std.mersin.edu.tr | `student123` | STUDENT | 2024001001 | Makine Muhendisligi |

---

## Akademisyen Giris Hesaplari

| Ad Soyad | E-posta | Sifre | Rol | Unvan | Bolum |
|----------|---------|-------|-----|-------|-------|
| Fatih Yilmaz | fatih.yilmaz@mersin.edu.tr | `academic123` | ACADEMIC | Prof. Dr. | Bilgisayar Muhendisligi |
| Leyla Kaplan | leyla.kaplan@mersin.edu.tr | `academic123` | ACADEMIC | Doc. Dr. | Elektronik ve Hablesme Muhendisligi |
| Ismail Korkmaz | ismail.korkmaz@mersin.edu.tr | `academic123` | ACADEMIC | Dr. Ogr. Uyesi | Bilgisayar Muhendisligi |

---

## Ornek Dilekceler

| Takip Kodu | Basvuru Sahibi | Konu | Durum | Oncelik |
|------------|----------------|------|-------|---------|
| MER20260001 | Ayse Demir | Transkript islemi icin bilgi talebi | RECEIVED | HIGH |
| MER20260002 | Mehmet Yildiz | Ogrenci portali erisim sorunu | IN_REVIEW | URGENT |
| MER20260003 | Fatma Ozturk | Akademik takvim ve sinav tarihleri hakkinda bilgi talebi | ANSWERED | NORMAL |

---

## Birimler

| Kod | Ad |
|-----|----|
| REKTORLUK | Rektorluk |
| OGRENCI_ISLERI | Ogrenci Isleri Daire Baskanligi |
| FEN_BILIMLERI | Fen Fakultesi Dekanligi |
| EDEBIYAT | Insan ve Toplum Bilimleri Fakultesi Dekanligi |
| MUHENDISLIK | Muhendislik Fakultesi Dekanligi |
| IKTISAT | Iktisadi ve Idari Bilimler Fakultesi Dekanligi |
| TIP | Tip Fakultesi Dekanligi |
| HUKUK | Hukuk Fakultesi Dekanligi |
| EGITIM | Egitim Fakultesi Dekanligi |
| BILGI_ISLEM | Bilgi Islem Daire Baskanligi |
| YAPI_ISLERI | Yapi Isleri ve Teknik Daire Baskanligi |
| KUTUPHANE | Kutuphane ve Dokumantasyon Daire Baskanligi |
| SAGLIK_KULTUR | Saglik, Kultur ve Spor Daire Baskanligi |

---

## Kategoriler

| Kod | Ad | Aciklama |
|-----|----|----------|
| TALEP | Talep | Hizmet, islem veya destek talep edilen basvurular |
| SIKAYET | Sikayet | Universite hizmetleriyle ilgili sikayet basvurulari |
| BILGI_EDINME | Bilgi Edinme | Bilgi edinmek amaciyla olusturulan basvurular |
| TESEKKUR | Tesekkur | Universite personeliyle ilgili tesekkur basvurulari |
| ONERI | Oneri | Hizmetlerin ve sureclerin gelistirilmesine yonelik oneriler |
