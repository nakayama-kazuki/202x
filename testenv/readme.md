# Windows PC のセットアップ

## 1. Windows 動作調整

最初に誤操作を誘発する機能をオフにする。

- [x] パフォーマンスオプション（`Win + R` から `sysdm.cpl`）でフォントの「縁を滑らか」以外をオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p01.png' width='350' style='border: 1px solid #000000;' />

- [x] フォルダーオプション（`Win + R` から `control folders`）でエクスプローラーの振る舞いを調整

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p04.png' width='350' style='border: 1px solid #000000;' />

- [x] マルチタスクをすべてオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p02.png' width='350' style='border: 1px solid #000000;' />

- [x] タスクバーで不要な項目をオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p03.png' width='350' style='border: 1px solid #000000;' />

- [x] 高度なジェスチャをすべてオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p05.png' width='350' style='border: 1px solid #000000;' />

- [x] 全ての（もしくは不要な）通知をオフ

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p07.png' width='350' style='border: 1px solid #000000;' />

- [x] エディタの関連付けが負ける場合に OS 側で規定値設定
	- 例えば `txt` や `html` や `js` や `ini` など

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p08.png' width='350' style='border: 1px solid #000000;' />

## 2. 入力支援

後続作業に影響が大きいものから優先対応。

- [x] エディタをインストール（[例えば秀丸](https://hide.maruo.co.jp/software/hidemaru.html)）
	- ライセンスキーを取得（企業の場合はワークフローから利用申請）
	- UIUX を普段使いの体裁に調整
- [x] PC 移行時のエクスポート + インポート
	- デフォルトブラウザのブックマーク
	- ユーザー辞書の設定
		- ユーザー辞書ツール → ツール → テキストファイルからの登録

```
!Microsoft IME Dictionary Tool
!Version:
!Format:WORDLIST
!User Dictionary Name:imjp15cu.dic
!Output File Name:
!DateTime: 

よみ<TAB>単語<TAB>品詞
よみ<TAB>単語<TAB>品詞
よみ<TAB>単語<TAB>品詞
よみ<TAB>単語<TAB>品詞
```

## 3. ローカルサンドボックス環境

### 3.1. Apache

httpd.conf は後で修正するのでこのタイミングでは適当な設定で動作確認。

- [x] [Apache](https://www.apachelounge.com/download/)
- [x] [Microsoft](https://learn.microsoft.com/ja-jp/cpp/windows/latest-supported-vc-redist) から VCRUNTIME140.dll ( VC_redist.x64.exe ) を取得

### 3.2. 秘密鍵 + 自己署名サーバ証明書

ローカルサンドボックス環境で HTTPS 接続エラーを出さないための設定。

- [x] 秘密鍵を生成

```
openssl.exe genrsa -out localhost.key 2048
```
- [x] 自己署名証明書用の OpenSSL の CSR を作成
	- [scripts/openssl-localhost.cnf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/openssl-localhost.cnf)
- [x] 秘密鍵 + CSR で自己署名サーバ証明書を生成

```
openssl.exe req -new -x509 -key localhost.key -out localhost.crt -days 3650 -config openssl-localhost.cnf
```

- [x] 証明書を Windows に自己署名サーバ証明書をインストール
	- Firefox はプライバシーとセキュリティー設定からインストール

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p11.png' width='350' style='border: 1px solid #000000;' />

### 3.3. PHP

- [x] [PHP](https://windows.php.net/download/)
- [x] [ツール類](https://github.com/nakayama-kazuki/2021/tree/master/tool) で利用する機能を有効化した php.ini を作成
	- [scripts/php.ini](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/php.ini)

### 3.4. Python

Python はローカルサンドボックス環境の場合 TCP 5000 アクセス、プロダクションでは Lambda 経由のアクセスを想定する。

- [x] [Python](https://www.python.org/downloads/windows/)
- [x] 設定 → アプリ → アプリの詳細設定 → アプリ実行エイリアスの python.exe / python3.exe をオフ
- [x] ローカルサンドボックス環境 + Lambda 共通テンプレートを複製 ～ 編集してアプリケーションを開発
	- [scripts/template.py](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/template.py)
- [x] アプリケーションを再起動ランチャに Drag and Drop してサーバ起動
	- [scripts/restart-python.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/restart-python.bat)
	- Lambda の場合はアプリケーションをそのままアップロード

### 3.5. Apache 設定変更 ～ 起動

- [x] 最小限の機能のみを有効化し `Require local` とした httpd.conf を作成
	- [scripts/httpd.conf](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/httpd.conf)
	- 秘密鍵 + 自己署名証明書、PHP、Python 関連のパスを適宜設定
	- 必要に応じ `VirtualHost` を追加し hosts を編集
		- [scripts/edit-hosts.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/edit-hosts.bat)
- [x] Apache をサービスとして起動
	- [scripts/httpd-autostart.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/httpd-autostart.bat)
	- 以降は PC 起動時に Apache も起動

### 3.6. Firewall

- [x] ローカルサンドボックス環境へのインバウンドな TCP 80/443/5000 アクセスを遮断
	- [scripts/firewall.bat](https://github.com/nakayama-kazuki/202x/blob/main/testenv/scripts/firewall.bat)
	- OS 設定と httpd.conf 側の `Require local` 設定を併用
	- 以降はロールバックしない限り設定を維持
- [x] ロールバック用に firewall.bat のショートカットを用意し、項目に `-Rollback` オプションを含めたパスを指定

## 4. キーの無効化

誤操作を誘発するキーを無効化する。

- [x] [Microsoft PowerToys](https://learn.microsoft.com/ja-jp/windows/powertoys/)
- [x] `Insert` + `Caps Lock` + `Num Lock` を Disable にする

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/p09.png' width='350' style='border: 1px solid #000000;' />

- [x] Keyboard Manager 以外すべてオフにする
	- これを失念すると PowerToys による新たな誤操作が発生する

## 5. コンテキストメニューの仕様復元

- [x] レジストリエディタを用いて二階層化された新仕様を以前の一階層に復元

```
reg.exe add "HKEY_CURRENT_USER\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" /f /ve
```

## 6. git + tortoiseGit

- [x] [Git for Windows/x64 Setup](https://git-scm.com/install/windows)

```
git config --global user.name "hoge"
git config --global user.email "fuga"
```

- [x] [TortoiseGit](https://tortoisegit.org/download/)
	- 必要に応じ Language Packs を追加
	- 設定からコンテキストメニュー表示内容を調整（例えば追加や削除）
- [x] リポジトリのクローン
	- 初回 push 時に認証

## 7. デスクトップショートカット

- [x] コマンドは UTF8 エラーメッセージ対応
	- `"C:\_PATH_TO_\cmd.exe" /k chcp 65001`
- [x] ブラウザをイントラ or ログイン用と一般サイト閲覧用（Cookie 汚染許容）に分離。以下は Chrome の場合
	- `"C:\_PATH_TO_\chrome.exe"`
	- `"C:\_PATH_TO_\chrome.exe" --incognito`
- [x] ダウンロードや設定はよく使うのでデスクトップにあると便利
- [x] その他直接探せないアプリは `Win + R` から `shell:AppsFolder` で Applications を開きショートカット作成
- [x] [ツール類](https://github.com/nakayama-kazuki/2021/tree/master/tool) に ico を設定

## 8. オンラインミーティング

- [x] プロフィール + 背景画像
	- Zoom の場合 `C:\_PATH_TO_\Zoom\data\VirtualBkgnd_Custom\*` はビットマップ
- [x] 参加体験（カメラやマイクの on / off 等）は Zoom アプリの設定画面から

<img src='https://raw.githubusercontent.com/nakayama-kazuki/202x/main/testenv/img/future.png' width='350' style='border: 1px solid #000000;' />
