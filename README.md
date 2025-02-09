# BossBot Telegram Botu - Yöneticiler İçin  

Açık kaynaklı bu bot, Telegram gruplarınızı yönetmenize yardımcı olur.  

## Kurulum  

Eğer bu botun kendi kopyasını/fork’unu alacaksanız aşağıdaki adımları takip edin:  

1. Bağımlılıkları yükleyin (**[Node.js](https://nodejs.org/) ve [NPM](https://www.npmjs.com/) yüklü olmalıdır.**)  

    ```sh
    $ cd telegram_bot_for_admins
    $ npm install
    ```  

2. `config.json` dosyasını oluşturun. (`config-example.json` dosyasını kopyalayıp düzenleyebilirsiniz.)  
   Bot API token’ınızı ve MongoDB bağlantı adresinizi buraya girin.  
   **Telegram bot token’ını almak için [BotFather](http://t.me/BotFather) kullanabilirsiniz.**  
   Ücretsiz bir MongoDB veritabanını [mlab.com](http://mlab.com) gibi platformlardan alabilirsiniz.  

    ```json
    {
        "bot_token": "<BotFather'dan alınan token>",
        "mongo_connection": "<MongoDB bağlantı adresi>",
        "test_connection": "<MongoDB bağlantı adresi>"
    }
    ```  

3. Botu çalıştırın  

    ```sh
    $ npm start
    ```  

## Kullanım  

1. Botu **telegram grubuna** ekleyin.  
2. Botu **yönetici** olarak atayın.  
3. Botu etkinleştirmek için **herhangi bir mesaj gönderin**.  
4. Grubunuzu yapılandırmak için **`/setting`** komutunu girin.  
5. Bot, özel mesajla **menü** gönderir. Bu menüyü kullanarak mesaj filtrelerini ve diğer ayarları değiştirebilirsiniz.  

## Özellikler  

Botun özelliklerini **`/setting`** komutuyla açabilir ve yapılandırabilirsiniz. **Süper grubun yöneticisi olmanız gerekir.**  

### Desteklenen Özellikler  

- **"`%user%` gruba katıldı" mesajlarını silme**  
- **"`%user%`, «`%message%`» mesajını sabitledi" mesajlarını silme**  
- **Arapça mesajları silme**  
- **URL içeren mesajları silme**  
- **Kara listeye alınmış kelimeleri içeren mesajları silme** (`/blacklist`)  
- **Kara listeyi sıfırlama**  
- **Komut içeren mesajları silme**  
- **Spam kısıtlaması**  
- **Yeni üyelere hoş geldin mesajı gönderme** (`/set_hello`)  
- **Yöneticilere botu yapılandırma yetkisi verme** (`/access`)  

## Sohbet Komutları  

- **`/setting`** - Grubu yapılandırmaya başlar.  
- **`/blacklist`** - Kara listeye alınmış kelimeleri gösterir. Yönetici olarak bir mesaja yanıt vererek kara listeye kelime ekleyebilirsiniz.  
- **`/kick`** - Kullanıcıyı gruptan çıkarır. (Yanıt olarak yazılmalıdır.)  
- **`/ban`** - Kullanıcıyı gruptan çıkarır ve engeller. (Yanıt olarak yazılmalıdır.)  
- **`/warn`** - Kullanıcıyı uyarır. Üç uyarıdan sonra kullanıcı yasaklanır.  
- **`/unwarn`** - Kullanıcının uyarılarını sıfırlar.  

## Bot Komutları  

- **`/set_hello %%%`** - Yeni kullanıcılar için hoş geldin mesajını belirler.  
  - Varsayılan mesajı geri getirmek için **`/set_hello`** yazabilirsiniz.  
  - Hoş geldin mesajını kapatmak için **ayarlar menüsünü** kullanabilirsiniz.  
- **`/blacklist %word%`** - Kelimeyi kara listeye ekler.  
- **`/help`** - Yardım mesajını gösterir.  
- **`/access`** - Belirli yöneticilere botun ayarlarını yapılandırma yetkisi verme menüsünü açar.  

## Katkıda Bulunma  

Yeni özellikler eklemek için bize ulaşın 
