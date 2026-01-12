# Windows PC のセットアップ

## Windows 動作環境調整

誤操作を誘発する機能をオフにする。

- [x] パフォーマンス優先 + フォントの縁を滑らか

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p01.png' width='350' style='border: 1px solid #000000;' />

- [x] マルチタスクをすべてオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p02.png' width='350' style='border: 1px solid #000000;' />

- [x] タスクバーで不要な項目をオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p03.png' width='350' style='border: 1px solid #000000;' />

- [x] フォルダの表示をカスタマイズ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p04.png' width='350' style='border: 1px solid #000000;' />

- [x] 高度なジェスチャをすべてオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p05.png' width='350' style='border: 1px solid #000000;' />

- [x] 不要な通知をオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p07.png' width='350' style='border: 1px solid #000000;' />

- [x] エディタの関連付けが負ける場合に OS 側で規定値設定

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p08.png' width='350' style='border: 1px solid #000000;' />

## エディタ

httpd.conf などの編集のために最初にエディタをインストール。

- [x] 最初に [普段使いのエディタ](https://hide.maruo.co.jp/software/hidemaru.html) をインストール
- [x] エディタの UIUX を普段使いの体裁に整える
- [x] ライセンスキーを取得（企業の場合はワークフローから利用申請）

## Apache

- [x] [Apache](https://www.apachelounge.com/download/) をインストール
- [x] [Microsoft](https://learn.microsoft.com/ja-jp/cpp/windows/latest-supported-vc-redist) から VCRUNTIME140.dll ( VC_redist.x64.exe ) を取得

### 秘密鍵 + 自己署名証明書

- [x] 秘密鍵を生成

```
openssl.exe genrsa -out localhost.key 2048
```
- [x] 自己署名証明書用の OpenSSL の CSR を作成（[openssl-localhost.cnf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/openssl-localhost.cnf)）
- [x] 秘密鍵 + CSR で自己署名証明書（サーバ証明書）を生成

```
openssl.exe req -new -x509 -key localhost.key -out localhost.crt -days 3650 -config openssl-localhost.cnf
```

- [x] 証明書を Windows に自己署名証明書（サーバ証明書）をインストール
	- Firefox はプライバシーとセキュリティー設定からインストール

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p11.png' width='350' style='border: 1px solid #000000;' />

### PHP

- [x] [PHP](https://windows.php.net/download/) をインストール

### Python

- [x] [Python](https://www.python.org/downloads/windows/) をインストール
- [x] アプリ → アプリの詳細設定 → アプリ実行エイリアスの python.exe / python3.exe をオフ
- [x] サーバ起動は

### Apache 設定変更～起動

- [x] 最小限の機能のみを有効化した httpd.conf を作成（[httpd.conf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template-httpd.conf)）
	- 秘密鍵 + 自己署名証明書、PHP、Python 関連のパスを適宜設定
- [x] Apache をサービスとして起動（[httpd-autostart.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/httpd-autostart.bat)）

## Firewall

- [x] インバウンドな TCP 80/443/5000 を遮断（[firewall.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/firewall.bat)）
	- ロールバック用に [firewall.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/firewall.bat) のシュートカットを作り項目に `-Rollback` オプションを指定する

## キーの無効化

Microsoft PowerToys


<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p09.png' width='350' style='border: 1px solid #000000;' />

## コンテキストメニューの仕様復元

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p10.png' width='350' style='border: 1px solid #000000;' />

## git + tortoiseGit



