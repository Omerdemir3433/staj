# Mersin Üniversitesi Dilek & Öneri Sistemi

Kurumsal dilek / şikâyet / öneri yönetim sistemi. Kutu dışında (out-of-the-box) sadece Docker ile çalışır; ek kurulum veya yapılandırma gerekmez.

---

## Gereksinim

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Compose dahil)

Başka hiçbir yazılım (Node.js, PostgreSQL vb.) kurmanıza gerek yok.

## Çalıştırma

Proje klasöründe tek komut:

```bash
docker compose up -d --build
```

İlk derleme birkaç dakika sürebilir. Veritabanı ve örnek (demo) veriler otomatik olarak oluşturulur.

Uygulama `http://localhost:3000` adresinde açılır.

Durdurmak için:

```bash
docker compose down
```

Verilerle birlikte tamamen sıfırlamak için:

```bash
docker compose down -v
```

---

## Demo Kullanıcılar

### Personel Giriş

| Ad Soyad | E-posta | Şifre | Rol |
|---|---|---|---|
| Sistem Yöneticisi | admin@mersin.edu.tr | admin1234 | Yönetici (ADMIN) |
| Öğrenci İşleri Müdürü | ogrenci.isleri.mudur@mersin.edu.tr | ogrenci123 | Birim Müdürü |
| Bilgi İşlem Müdürü | bilgi.islem.mudur@mersin.edu.tr | bilgi123 | Birim Müdürü |
| Elif Kaya | elif.kaya@mersin.edu.tr | birim123 | Birim Personeli (Öğrenci İşleri) |
| Murat Yılmaz | murat.yilmaz@mersin.edu.tr | birim123 | Birim Personeli (Bilgi İşlem) |

### Öğrenci Giriş

| Ad Soyad | E-posta | Şifre | Bölüm |
|---|---|---|---|
| Ahmet Çetin | ahmet.cetin@std.mersin.edu.tr | student123 | Bilgisayar Mühendisliği |
| Zeynep Arslan | zeynep.arslan@std.mersin.edu.tr | student123 | Elektrik Mühendisliği |
| Ali Demir | ali.demir@std.mersin.edu.tr | student123 | Makine Mühendisliği |

### Akademisyen Giriş

| Ad Soyad | E-posta | Şifre | Unvan |
|---|---|---|---|
| Fatih Yılmaz | fatih.yilmaz@mersin.edu.tr | academic123 | Prof. Dr. |
| Leyla Kaplan | leyla.kaplan@mersin.edu.tr | academic123 | Doç. Dr. |
| Ismail Korkmaz | ismail.korkmaz@mersin.edu.tr | academic123 | Dr. Öğr. Üyesi |

### Örnek Başvurular (Misafir Takip)

| Takip Kodu | Durum |
|---|---|
| MER20260001 | Alındı (RECEIVED) |
| MER20260002 | İncelemede (IN_REVIEW) |
| MER20260003 | Cevaplandı (ANSWERED) |

---

## Notlar

- Demo ortamında e-postalar gerçekten gönderilmez, konteyner loglarına yazılır (`docker compose logs app` ile görülebilir).
- Misafir başvuru oluşturulduğunda e-posta doğrulama kodu ve bağlantısı doğrudan ekranda gösterilir; kutuya e-posta beklenmez.
- CAPTCHA ve kimlik doğrulama demo için "mock" modundadır; gerçek Turnstile / kimlik servisi için `CAPTCHA_PROVIDER` ve `IDENTITY_VERIFICATION_PROVIDER` ortam değişkenlerini güncelleyin.