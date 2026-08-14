# MIRAI_labo-games

Scratchのゲームを題材に，不具合の観察，原因仮説，修正，テスト，説明を学ぶ「デバッグラーニング」教材の開発リポジトリです．ゲームは[goboscript](https://aspiz.uk/goboscript/docs/)で記述し，Scratchプロジェクトの`.sb3`へコンパイルします．

## 現在の収録プロジェクト

| パス | 位置付け |
| --- | --- |
| `games/sword-clicker` | 剣でスライムを倒す連打ゲーム |
| `games/robot-repair-clicker` | ロボットを修理する連打ゲーム |
| `games/00_05_click_cooking` | 料理の生地を混ぜる連打ゲーム |
| `games/00_06_click_nature` | 魚を引き寄せる連打ゲーム |
| `games/00_07_click_sports` | 選手をゴールへ進めるダッシュ連打ゲーム |
| `games/00_08_click_security` | ウイルスを除去するスキャン連打ゲーム |
| `games/00_09_click_music` | 演奏を完成させるドラム連打ゲーム |
| リポジトリ直下 | goboscriptの最小スモークテスト．教材ゲームではない |

現段階では完成版ゲームのソースが中心です．「教材として完成」の判定には，欠陥版，学習者向け資料，教師向け資料，ヒント，評価基準，テストが別途必要です．

## 開発を始める

必要なものは`git`，`rustup`，`unzip`です．リポジトリ直下で次を実行します．

```bash
./scripts/check-repository.sh
./scripts/bootstrap-goboscript.sh
./scripts/build-projects.sh
```

`bootstrap-goboscript.sh`は，`tools/goboscript-version.env`に固定したnightly Rustとgoboscriptの特定コミットを`.tools/`へ導入します．`build-projects.sh`は`tools/projects.txt`に登録された全プロジェクトをコンパイルし，`build/`へ`.sb3`を出力した後，ZIPコンテナの整合性を確認します．`.tools/`，`build/`，`.sb3`はGitの管理対象外です．

出力した`.sb3`はScratchエディタまたはTurboWarpで開き，必ず手動で開始，成功，失敗，再試行まで確認してください．CIのコンパイル成功は，ゲームプレイや教材品質の保証ではありません．

### 学習者用の欠陥版を生成する

欠陥教材では，リポジトリやゲームディレクトリをそのまま生徒へ配布しないでください．`defects/`のpatchと`catalog/defects/`のmanifestには原因，修正箇所，期待解答が含まれます．次の専用スクリプトは一時コピーへpatchを適用し，教師用情報を含まない`.sb3`だけを生成します．

```bash
GOBOSCRIPT_BIN=/path/to/goboscript ./scripts/build-student-defect.sh \
  games/00_09_click_music \
  games/00_09_click_music/defects/00_09-D01.patch \
  /tmp/student/00_09-D01.sb3
```

生徒へは生成された`.sb3`と生徒用ワークシートだけを渡し，patch，欠陥manifest，教師用指導書は分離して保管します．

## バージョンとリリース

各完成版ゲームのバージョンは，対応する`catalog/games/<game-id>.json`の`versions.complete.version`を正本とし，Semantic Versioningの`MAJOR.MINOR.PATCH`で管理します．リリース用ビルドでは，`00_09-click-music-v1.0.0.sb3`のようにゲームごとのバージョンをファイル名へ含めます．

```bash
# 互換性を壊さない機能・教材追加
python3 tools/game_versions.py bump 00_09 minor

# ローカルでリリース一式を生成
RELEASE_VERSION=1.0.0 ./scripts/build-release.sh /tmp/mirai-release
```

ゲームの実行内容へ影響するソースやアセットを変更した場合，CIは対応ゲームのバージョン増加を必須とします．`prerelease-v1.0.0`形式のタグはGitHubのプレリリース，`release-v1.0.0`形式のタグは正式リリースを生成します．正式リリースは，catalog上の全完成版が`verified`になるまで拒否されます．

## リポジトリ構成

```text
games/                 プレイ可能なgoboscriptゲーム
catalog/               ゲーム，欠陥，テスト，ログ例のmanifest
schemas/               catalogと匿名ログのJSON Schema
materials/pilot/       45分授業用の試行教材
scripts/               構造検査，ツール導入，一括ビルド
tools/                 固定バージョンとビルド対象一覧
docs/                  アーキテクチャと開発フロー
.github/workflows/     GitHub Actionsによる検証，ビルド，リリース
```

設計上の境界は[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，変更手順と品質ゲートは[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)を参照してください．

## データと権利

子どもや実験参加者の氏名，音声，映像，対応表，同意書，未匿名化の操作ログをこのリポジトリへ保存しないでください．非公開研究データは，アクセス権限を制限した別の保管先で管理します．

### 未決定：ライセンス

リポジトリ所有者による方針決定がまだないため，`LICENSE`は追加していません．コード，教材文書，画像・音声アセットに同一ライセンスを適用できるとは限りません．権利者，出典，改変可否，再配布可否を確定した後，対象範囲を明記したライセンスを追加する必要があります．現状のファイルを，明示的な許諾があるものと解釈しないでください．
