# Windows PC のセットアップ

## 1. Windows 動作調整

最初に誤操作を誘発する機能をオフにする。

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

## 2. エディタ

設定ファイルなどの編集のためにエディタをインストールする。

- [x] [秀丸の場合](https://hide.maruo.co.jp/software/hidemaru.html)
	- ライセンスキーを取得（企業の場合はワークフローから利用申請）
- [x] エディタの UIUX を普段使いの体裁に整える

## 3. ローカルテスト環境

### 3.1. Apache

設定は後で修正するのでこのタイミングでは適当な設定で動作確認。

- [x] [Apache](https://www.apachelounge.com/download/)
- [x] [Microsoft](https://learn.microsoft.com/ja-jp/cpp/windows/latest-supported-vc-redist) から VCRUNTIME140.dll ( VC_redist.x64.exe ) を取得

### 3.2. 秘密鍵 + 自己署名サーバ証明書

ローカルテスト環境で HTTPS 接続エラーを出さないための設定。

- [x] 秘密鍵を生成

```
openssl.exe genrsa -out localhost.key 2048
```
- [x] 自己署名証明書用の OpenSSL の CSR を作成（[openssl-localhost.cnf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/openssl-localhost.cnf)）
- [x] 秘密鍵 + CSR で自己署名サーバ証明書を生成

```
openssl.exe req -new -x509 -key localhost.key -out localhost.crt -days 3650 -config openssl-localhost.cnf
```

- [x] 証明書を Windows に自己署名サーバ証明書をインストール
	- Firefox はプライバシーとセキュリティー設定からインストール

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p11.png' width='350' style='border: 1px solid #000000;' />

### 3.3. PHP

- [x] [PHP](https://windows.php.net/download/)

### 3.4. Python

Python はローカルテスト環境の場合 TCP 5000 アクセス、プロダクションでは Lambda 経由のアクセスを想定する。

- [x] [Python](https://www.python.org/downloads/windows/)
- [x] 設定 → アプリ → アプリの詳細設定 → アプリ実行エイリアスの python.exe / python3.exe をオフ
- [x] ローカルテスト環境 + Lambda 共通テンプレートを複製～編集してアプリケーションを開発（[template.py](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template.py)）
- [x] アプリケーションをランチャに Drag and Drop してサーバ起動（[restart-python.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat)）
	- Lambda の場合はアプリケーションをそのままアップロード

### 3.5. Apache 設定変更～起動

- [x] 最小限の機能のみを有効化した httpd.conf を作成（[template-httpd.conf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template-httpd.conf)）
	- 秘密鍵 + 自己署名証明書、PHP、Python 関連のパスを適宜設定
	- 必要に応じ `VirtualHost` を追加し hosts を編集（[edit-hosts.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/edit-hosts.bat)）
- [x] Apache をサービスとして起動（[httpd-autostart.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/httpd-autostart.bat)）
	- 以降は PC 起動時に Apache も起動

### 3.6. Firewall

- [x] ローカルテスト環境へのインバウンドな TCP 80/443/5000 アクセスを遮断（[firewall.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/firewall.bat)）
	- OS 設定と httpd.conf 側の `Require local` 設定を併用
	- 以降はロールバックしない限り設定を維持
- [x] ロールバック用に firewall.bat のショートカットを用意し、項目に `-Rollback` オプションを含めたパスを指定

## 4. キーの無効化

誤操作を誘発するキーを無効化する。

- [x] [Microsoft PowerToys](https://learn.microsoft.com/ja-jp/windows/powertoys/)
- [x] Insert + Caps Lock + Num Lock を Disable にする

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p09.png' width='350' style='border: 1px solid #000000;' />

- [x] Keyboard Manager 以外すべてオフにする
	- これを失念すると PowerToys による新たな誤操作が発生する

## 5. コンテキストメニューの仕様復元

- [x] レジストリエディタを用いて二階層化された新仕様を以前の一階層に復元

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p10.png' width='350' style='border: 1px solid #000000;' />

## 6. git + tortoiseGit

- [x] [Git for Windows/x64 Setup](https://git-scm.com/install/windows)

```
git config --global user.name "hoge"
git config --global user.email "fuga"
```

- [x] [TortoiseGit](https://tortoisegit.org/download/)
	- 必要に応じ Language Packs を追加
- [x] リポジトリのクローン
	- 設定からメニュー表示内容を調整（例えば追加や削除）
	- 初回 push 時に認証

## 7. その他アプリケーション

- [x] Firefox
- [x] WinMerge
- [x] GIMP
- [x] LINE PC 版
- [x] Slack

